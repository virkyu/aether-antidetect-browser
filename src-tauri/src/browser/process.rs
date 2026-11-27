use std::collections::HashMap;
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;
use tokio::process::Child;
use tokio::sync::Mutex;

use crate::browser::cdp::{spawn_cdp_supervisor, CdpSupervisorHandle};
use crate::browser::fingerprint::{
    build_cli_arguments, create_proxy_auth_extension, detect_chromium_executable,
};
use crate::browser::proxy_bridge::{start_proxy_bridge, ProxyBridgeHandle, UpstreamProxyConfig};
use crate::browser::shield::create_shield_extension;
use crate::models::{FingerprintConfig, WebRtcPolicy};

pub enum LaunchProxyMode<'a> {
    None,
    Bridge(UpstreamProxyConfig),
    HttpsDirect {
        proxy_url: &'a str,
        auth: Option<(&'a str, &'a str)>,
    },
}

pub struct ActiveSession {
    pub pid: u32,
    pub port: u16,
    pub started_at: Instant,
    pub child: Child,
    pub profile_dir: PathBuf,
    pub proxy_bridge: Option<ProxyBridgeHandle>,
    pub cdp_supervisor: CdpSupervisorHandle,
}

#[derive(Clone)]
pub struct ProcessManager {
    sessions: Arc<Mutex<HashMap<String, ActiveSession>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn find_free_port() -> Result<u16, String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .map_err(|e| format!("Failed to bind TCP listener for port allocation: {}", e))?;
        let port = listener
            .local_addr()
            .map_err(|e| format!("Failed to read local address: {}", e))?
            .port();
        drop(listener);
        Ok(port)
    }

    pub async fn launch_profile(
        &self,
        profile_id: &str,
        fp: &FingerprintConfig,
        proxy_mode: LaunchProxyMode<'_>,
    ) -> Result<(u32, u16), String> {
        let mut sessions = self.sessions.lock().await;

        // Clean up exited dead session if user closed browser window manually
        if let Some(existing) = sessions.get_mut(profile_id) {
            if let Ok(Some(_status)) = existing.child.try_wait() {
                if let Some(mut dead) = sessions.remove(profile_id) {
                    if let Some(ref mut bridge) = dead.proxy_bridge {
                        bridge.stop();
                    }
                    dead.cdp_supervisor.stop();
                }
            } else {
                return Err("Profile is already running".to_string());
            }
        }

        let exe_path = detect_chromium_executable(Some(&fp.browser_type))
            .ok_or_else(|| format!("Browser engine {:?} not found on this system (Chrome, Edge, or Brave).", fp.browser_type))?;

        // Base directory: ~/.aether/profiles/{id}
        let mut profile_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        profile_dir.push(".aether");
        profile_dir.push("profiles");
        profile_dir.push(profile_id);

        let data_dir = profile_dir.join("data");
        tokio::fs::create_dir_all(&data_dir)
            .await
            .map_err(|e| format!("Failed to create user data directory: {}", e))?;

        // Clean stale lockfiles
        let lock_file = profile_dir.join(".lock");
        if lock_file.exists() {
            let _ = tokio::fs::remove_file(&lock_file).await;
        }
        let singleton_lock = data_dir.join("SingletonLock");
        if singleton_lock.exists() {
            let _ = tokio::fs::remove_file(&singleton_lock).await;
        }
        let chromium_lock = data_dir.join("lockfile");
        if chromium_lock.exists() {
            let _ = tokio::fs::remove_file(&chromium_lock).await;
        }

        let has_proxy = !matches!(proxy_mode, LaunchProxyMode::None);

        // Pre-configure Chromium / Brave Default Preferences safely
        let default_dir = data_dir.join("Default");
        let _ = tokio::fs::create_dir_all(&default_dir).await;
        let prefs_file = default_dir.join("Preferences");
        let mut prefs_data: serde_json::Value = if prefs_file.exists() {
            if let Ok(content) = tokio::fs::read_to_string(&prefs_file).await {
                serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
            } else {
                serde_json::json!({})
            }
        } else {
            serde_json::json!({})
        };

        if !prefs_data.is_object() {
            prefs_data = serde_json::json!({});
        }

        let enforce_strict_webrtc = has_proxy || fp.webrtc_policy != WebRtcPolicy::Default;
        if enforce_strict_webrtc {
            prefs_data["webrtc"] = serde_json::json!({
                "ip_handling_policy": "disable_non_proxied_udp",
                "multiple_routes_enabled": false,
                "nonproxied_udp_enabled": false
            });
        } else {
            prefs_data["webrtc"] = serde_json::json!({
                "ip_handling_policy": "default_public_interface_only"
            });
        }

        prefs_data["dns_over_https"] = serde_json::json!({
            "mode": "off"
        });
        prefs_data["net"] = serde_json::json!({
            "network_prediction_options": 2
        });
        prefs_data["enable_do_not_track"] = serde_json::json!(fp.do_not_track);

        if let Some(intl) = prefs_data.get_mut("intl").and_then(|v| v.as_object_mut()) {
            intl.insert("accept_languages".to_string(), serde_json::json!(fp.language));
        } else {
            prefs_data["intl"] = serde_json::json!({
                "accept_languages": fp.language
            });
        }

        if let Some(prof) = prefs_data.get_mut("profile").and_then(|v| v.as_object_mut()) {
            prof.insert("exit_type".to_string(), serde_json::json!("Normal"));
            prof.insert("exited_cleanly".to_string(), serde_json::json!(true));
        } else {
            prefs_data["profile"] = serde_json::json!({
                "exit_type": "Normal",
                "exited_cleanly": true
            });
        }

        if fp.geolocation.mode == "block" {
            if let Some(prof) = prefs_data.get_mut("profile").and_then(|v| v.as_object_mut()) {
                prof.insert(
                    "default_content_setting_values".to_string(),
                    serde_json::json!({ "geolocation": 2 }),
                );
            }
        }

        prefs_data["brave"] = serde_json::json!({
            "shields": { "stats": false },
            "brave_news": { "enabled": false },
            "brave_ads": { "enabled": false },
            "today": { "enabled": false },
            "p3a": { "enabled": false },
            "wallet": { "enabled": false }
        });
        prefs_data["safebrowsing"] = serde_json::json!({
            "enabled": false
        });

        if let Ok(serialized) = serde_json::to_string_pretty(&prefs_data) {
            let _ = tokio::fs::write(&prefs_file, serialized).await;
        }

        // Setup proxy bridge (for HTTP & SOCKS5 with zero auth/DNS leaks) or HTTPS direct fallback
        let mut bridge_handle: Option<ProxyBridgeHandle> = None;
        let mut ext_dirs: Vec<PathBuf> = Vec::new();
        let proxy_arg_str: Option<String>;

        match proxy_mode {
            LaunchProxyMode::None => {
                proxy_arg_str = None;
            }
            LaunchProxyMode::Bridge(cfg) => {
                let handle = start_proxy_bridge(cfg).await?;
                proxy_arg_str = Some(format!("http://127.0.0.1:{}", handle.local_port));
                tracing::info!(
                    "Started leak-proof local proxy bridge on 127.0.0.1:{} for profile {}",
                    handle.local_port,
                    profile_id
                );
                bridge_handle = Some(handle);
            }
            LaunchProxyMode::HttpsDirect { proxy_url, auth } => {
                proxy_arg_str = Some(proxy_url.to_string());
                if let Some((u, p)) = auth {
                    if let Ok(ext) = create_proxy_auth_extension(&profile_dir, u, p).await {
                        ext_dirs.push(ext);
                    }
                }
            }
        }

        // Always generate MV3 Aether Fingerprint Shield extension
        match create_shield_extension(&profile_dir, profile_id, fp, has_proxy).await {
            Ok(shield_ext) => ext_dirs.push(shield_ext),
            Err(e) => tracing::warn!("Could not write MV3 shield extension (CDP fallback still active): {}", e),
        }

        let port = Self::find_free_port()?;
        let args = build_cli_arguments(&data_dir, port, fp, proxy_arg_str.as_deref(), &ext_dirs);

        tracing::info!(
            "Spawning browser executable {:?} with data dir {:?} on port {}",
            exe_path,
            data_dir,
            port
        );

        let mut cmd = tokio::process::Command::new(&exe_path);
        cmd.args(&args)
            .env("TZ", &fp.timezone)
            .env("LANG", &fp.language);

        let child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn browser process: {}", e))?;

        let pid = child
            .id()
            .ok_or_else(|| "Failed to retrieve process ID from spawned child".to_string())?;

        let _ = tokio::fs::write(&lock_file, pid.to_string()).await;

        let cdp_supervisor = spawn_cdp_supervisor(
            port,
            profile_id.to_string(),
            fp.clone(),
            has_proxy,
        );

        let session = ActiveSession {
            pid,
            port,
            started_at: Instant::now(),
            child,
            profile_dir,
            proxy_bridge: bridge_handle,
            cdp_supervisor,
        };

        sessions.insert(profile_id.to_string(), session);

        Ok((pid, port))
    }

    pub async fn stop_profile(&self, profile_id: &str) -> Result<u64, String> {
        let mut sessions = self.sessions.lock().await;

        if let Some(mut session) = sessions.remove(profile_id) {
            let duration = session.started_at.elapsed().as_secs();

            session.cdp_supervisor.stop();
            if let Some(ref mut bridge) = session.proxy_bridge {
                bridge.stop();
            }

            let _ = session.child.kill().await;

            let lock_file = session.profile_dir.join(".lock");
            let _ = tokio::fs::remove_file(&lock_file).await;

            Ok(duration)
        } else {
            Err("Profile is not actively running".to_string())
        }
    }

    pub async fn is_running(&self, profile_id: &str) -> bool {
        let mut sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get_mut(profile_id) {
            if let Ok(Some(_)) = session.child.try_wait() {
                if let Some(mut dead) = sessions.remove(profile_id) {
                    dead.cdp_supervisor.stop();
                    if let Some(ref mut bridge) = dead.proxy_bridge {
                        bridge.stop();
                    }
                    let _ = std::fs::remove_file(dead.profile_dir.join(".lock"));
                }
                return false;
            }
            return true;
        }
        false
    }

    pub async fn get_session_info(&self, profile_id: &str) -> Option<(u32, u16, u64)> {
        let sessions = self.sessions.lock().await;
        sessions.get(profile_id).map(|s| {
            (
                s.pid,
                s.port,
                s.started_at.elapsed().as_secs(),
            )
        })
    }
}
