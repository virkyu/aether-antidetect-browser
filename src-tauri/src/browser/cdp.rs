use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::sync::oneshot;
use tokio_tungstenite::{connect_async, tungstenite::Message};

use crate::browser::shield::{extract_chrome_major, generate_spoof_js, primary_locale};
use crate::models::{BrowserType, FingerprintConfig, OsType};

pub struct CdpSupervisorHandle {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl CdpSupervisorHandle {
    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for CdpSupervisorHandle {
    fn drop(&mut self) {
        self.stop();
    }
}

fn build_user_agent_metadata(fp: &FingerprintConfig) -> Value {
    let major = extract_chrome_major(&fp.user_agent, &fp.browser_version);
    let full_version = format!("{}.0.0.0", major);
    let brand_name = match fp.browser_type {
        BrowserType::Edge => "Microsoft Edge",
        BrowserType::Brave => "Brave",
        BrowserType::Chrome => "Google Chrome",
    };

    let (platform, platform_ver, arch) = match fp.os_type {
        OsType::Windows => ("Windows", "15.0.0", "x86"),
        OsType::Macos => ("macOS", "14.7.2", "arm"),
        OsType::Linux => ("Linux", "6.8.0", "x86"),
    };

    json!({
        "brands": [
            { "brand": "Not(A:Brand", "version": major },
            { "brand": "Chromium", "version": major },
            { "brand": brand_name, "version": major }
        ],
        "fullVersionList": [
            { "brand": "Not(A:Brand", "version": full_version },
            { "brand": "Chromium", "version": full_version },
            { "brand": brand_name, "version": full_version }
        ],
        "platform": platform,
        "platformVersion": platform_ver,
        "architecture": arch,
        "model": "",
        "mobile": false,
        "bitness": "64",
        "wow64": false
    })
}

fn nav_platform_str(os_type: &OsType) -> &'static str {
    match os_type {
        OsType::Windows => "Win32",
        OsType::Macos => "MacIntel",
        OsType::Linux => "Linux x86_64",
    }
}

pub fn spawn_cdp_supervisor(
    port: u16,
    profile_id: String,
    fp: FingerprintConfig,
    proxy_active: bool,
) -> CdpSupervisorHandle {
    let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();

    tokio::spawn(async move {
        let client = match reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(2))
            .build()
        {
            Ok(c) => c,
            Err(_) => return,
        };

        let version_url = format!("http://127.0.0.1:{}/json/version", port);
        let mut ws_url: Option<String> = None;

        for _ in 0..50 {
            if shutdown_rx.try_recv().is_ok() {
                return;
            }
            if let Ok(resp) = client.get(&version_url).send().await {
                if let Ok(val) = resp.json::<Value>().await {
                    if let Some(u) = val.get("webSocketDebuggerUrl").and_then(|v| v.as_str()) {
                        ws_url = Some(u.to_string());
                        break;
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(120)).await;
        }

        let Some(ws_url) = ws_url else {
            tracing::warn!("CDP endpoint did not respond on port {} for profile {}", port, profile_id);
            return;
        };

        let Ok((mut ws_stream, _)) = connect_async(&ws_url).await else {
            tracing::warn!("Failed to connect CDP WebSocket at {}", ws_url);
            return;
        };

        let spoof_js = generate_spoof_js(&profile_id, &fp, proxy_active);
        let ua_meta = build_user_agent_metadata(&fp);
        let nav_platform = nav_platform_str(&fp.os_type);
        let locale = primary_locale(&fp.language);

        let mut next_id: i64 = 1;

        // Discover existing targets & auto-attach to every new page/tab without Runtime.enable
        let init_msgs = [
            make_cdp_cmd(&mut next_id, "Target.setDiscoverTargets", json!({ "discover": true }), None),
            make_cdp_cmd(
                &mut next_id,
                "Target.setAutoAttach",
                json!({
                    "autoAttach": true,
                    "waitForDebuggerOnStart": false,
                    "flatten": true
                }),
                None,
            ),
            make_cdp_cmd(&mut next_id, "Target.getTargets", json!({}), None),
        ];

        for txt in init_msgs {
            if ws_stream.send(Message::Text(txt.into())).await.is_err() {
                return;
            }
        }

        let get_targets_id = 3;

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    tracing::debug!("Shutting down CDP supervisor for profile {}", profile_id);
                    break;
                }
                frame = ws_stream.next() => {
                    let Some(Ok(msg)) = frame else {
                        break;
                    };
                    let Message::Text(text) = msg else {
                        continue;
                    };
                    let Ok(val) = serde_json::from_str::<Value>(&text) else {
                        continue;
                    };

                    // Handle Target.getTargets response to attach to initial page tab(s)
                    if val.get("id").and_then(|v| v.as_i64()) == Some(get_targets_id) {
                        if let Some(infos) = val.pointer("/result/targetInfos").and_then(|v| v.as_array()) {
                            for info in infos {
                                if info.get("type").and_then(|t| t.as_str()) == Some("page") {
                                    if let Some(tid) = info.get("targetId").and_then(|t| t.as_str()) {
                                        let attach = make_cdp_cmd(
                                            &mut next_id,
                                            "Target.attachToTarget",
                                            json!({ "targetId": tid, "flatten": true }),
                                            None,
                                        );
                                        let _ = ws_stream.send(Message::Text(attach.into())).await;
                                    }
                                }
                            }
                        }
                        continue;
                    }

                    // Whenever any page target attaches, apply native C++ Emulation overrides + document_start shield
                    if val.get("method").and_then(|m| m.as_str()) == Some("Target.attachedToTarget") {
                        let target_type = val.pointer("/params/targetInfo/type").and_then(|t| t.as_str());
                        if target_type == Some("page") {
                            if let Some(sid) = val.pointer("/params/sessionId").and_then(|s| s.as_str()) {
                                let cmds = build_target_spoof_commands(
                                    &mut next_id,
                                    sid,
                                    &fp,
                                    &ua_meta,
                                    nav_platform,
                                    &locale,
                                    &spoof_js,
                                );
                                for c in cmds {
                                    if ws_stream.send(Message::Text(c.into())).await.is_err() {
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    CdpSupervisorHandle {
        shutdown_tx: Some(shutdown_tx),
    }
}

fn make_cdp_cmd(next_id: &mut i64, method: &str, params: Value, session_id: Option<&str>) -> String {
    let id = *next_id;
    *next_id += 1;
    let mut msg = json!({
        "id": id,
        "method": method,
        "params": params
    });
    if let Some(sid) = session_id {
        msg["sessionId"] = json!(sid);
    }
    msg.to_string()
}

fn build_target_spoof_commands(
    next_id: &mut i64,
    session_id: &str,
    fp: &FingerprintConfig,
    ua_meta: &Value,
    nav_platform: &str,
    locale: &str,
    spoof_js: &str,
) -> Vec<String> {
    let mut make = |method: &str, params: Value| -> String {
        let id = *next_id;
        *next_id += 1;
        json!({
            "id": id,
            "sessionId": session_id,
            "method": method,
            "params": params
        })
        .to_string()
    };

    let mut out = vec![
        make("Page.enable", json!({})),
        make(
            "Emulation.setUserAgentOverride",
            json!({
                "userAgent": fp.user_agent,
                "acceptLanguage": fp.language,
                "platform": nav_platform,
                "userAgentMetadata": ua_meta
            }),
        ),
        make("Emulation.setTimezoneOverride", json!({ "timezoneId": fp.timezone })),
        make("Emulation.setLocaleOverride", json!({ "locale": locale })),
        make(
            "Emulation.setHardwareConcurrencyOverride",
            json!({ "hardwareConcurrency": fp.hardware_concurrency }),
        ),
        make(
            "Page.addScriptToEvaluateOnNewDocument",
            json!({
                "source": spoof_js,
                "runImmediately": true
            }),
        ),
    ];

    if fp.geolocation.mode == "manual" {
        if let (Some(lat), Some(lon)) = (fp.geolocation.latitude, fp.geolocation.longitude) {
            out.push(make(
                "Emulation.setGeolocationOverride",
                json!({
                    "latitude": lat,
                    "longitude": lon,
                    "accuracy": fp.geolocation.accuracy.unwrap_or(45.0)
                }),
            ));
        }
    } else if fp.geolocation.mode == "block" {
        out.push(make("Emulation.setGeolocationOverride", json!({})));
    }

    out
}
