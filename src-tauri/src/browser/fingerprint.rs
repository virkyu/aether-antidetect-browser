use std::path::{Path, PathBuf};
use crate::browser::shield::primary_locale;
use crate::models::{BrowserType, FingerprintConfig, WebRtcPolicy};

pub fn detect_chromium_executable(preferred_browser: Option<&BrowserType>) -> Option<PathBuf> {
    let brave_paths = [
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
        r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
    ];
    let chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ];
    let edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ];

    let local_appdata = std::env::var("LOCALAPPDATA").ok();
    let program_files = std::env::var("ProgramFiles").ok();
    let program_files_x86 = std::env::var("ProgramFiles(x86)").ok();
    let program_w6432 = std::env::var("ProgramW6432").ok();

    let check_paths = |paths: &[&str]| -> Option<PathBuf> {
        for path in paths {
            let p = Path::new(path);
            if p.exists() {
                return Some(p.to_path_buf());
            }
        }
        None
    };

    let check_appdata = |subpath: &str| -> Option<PathBuf> {
        if let Some(ref lad) = local_appdata {
            let p = Path::new(lad).join(subpath);
            if p.exists() {
                return Some(p);
            }
        }
        None
    };

    let check_env_pf = |subpath: &str| -> Option<PathBuf> {
        for env_dir in [&program_files, &program_files_x86, &program_w6432] {
            if let Some(dir) = env_dir {
                let p = Path::new(dir).join(subpath);
                if p.exists() {
                    return Some(p);
                }
            }
        }
        None
    };

    let check_where = |cmd_name: &str| -> Option<PathBuf> {
        #[cfg(windows)]
        {
            if let Ok(output) = std::process::Command::new("where").arg(cmd_name).output() {
                if output.status.success() {
                    if let Ok(text) = String::from_utf8(output.stdout) {
                        for line in text.lines() {
                            let p = PathBuf::from(line.trim());
                            if p.exists() {
                                return Some(p);
                            }
                        }
                    }
                }
            }
        }
        None
    };

    let find_brave = || -> Option<PathBuf> {
        check_paths(&brave_paths)
            .or_else(|| check_appdata(r"BraveSoftware\Brave-Browser\Application\brave.exe"))
            .or_else(|| check_env_pf(r"BraveSoftware\Brave-Browser\Application\brave.exe"))
            .or_else(|| check_where("brave.exe"))
            .or_else(|| check_where("brave"))
    };

    let find_chrome = || -> Option<PathBuf> {
        check_paths(&chrome_paths)
            .or_else(|| check_appdata(r"Google\Chrome\Application\chrome.exe"))
            .or_else(|| check_env_pf(r"Google\Chrome\Application\chrome.exe"))
            .or_else(|| check_where("chrome.exe"))
            .or_else(|| check_where("chrome"))
    };

    let find_edge = || -> Option<PathBuf> {
        check_paths(&edge_paths)
            .or_else(|| check_appdata(r"Microsoft\Edge\Application\msedge.exe"))
            .or_else(|| check_env_pf(r"Microsoft\Edge\Application\msedge.exe"))
            .or_else(|| check_where("msedge.exe"))
            .or_else(|| check_where("msedge"))
    };

    // If a specific browser was selected by the user, prioritize it, then fallback gracefully!
    if let Some(pref) = preferred_browser {
        match pref {
            BrowserType::Brave => {
                if let Some(p) = find_brave() {
                    return Some(p);
                }
            }
            BrowserType::Chrome => {
                if let Some(p) = find_chrome() {
                    return Some(p);
                }
            }
            BrowserType::Edge => {
                if let Some(p) = find_edge() {
                    return Some(p);
                }
            }
        }
    }

    // Universal Fallback: test all available engines in order
    find_brave()
        .or_else(find_chrome)
        .or_else(find_edge)
}

pub fn extract_proxy_host(proxy_str: &str) -> Option<&str> {
    let clean = proxy_str
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_start_matches("socks5://")
        .trim_start_matches("socks5h://")
        .trim_start_matches("socks4://");

    let host_port = if let Some(at_pos) = clean.rfind('@') {
        &clean[at_pos + 1..]
    } else {
        clean
    };

    let host = if let Some(colon_pos) = host_port.find(':') {
        &host_port[..colon_pos]
    } else {
        host_port
    };

    let trimmed = host.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}

pub async fn create_proxy_auth_extension(
    profile_dir: &Path,
    username: &str,
    password: &str,
) -> Result<PathBuf, String> {
    let ext_dir = profile_dir.join("proxy_auth_ext");
    tokio::fs::create_dir_all(&ext_dir)
        .await
        .map_err(|e| format!("Failed to create proxy auth extension directory: {}", e))?;

    let manifest_json = r#"{
  "version": "1.0.0",
  "manifest_version": 2,
  "name": "Aether Proxy Auto-Auth",
  "permissions": [
    "proxy",
    "<all_urls>",
    "webRequest",
    "webRequestBlocking"
  ],
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  },
  "minimum_chrome_version": "22.0.0"
}"#;

    let user_escaped = serde_json::to_string(username).unwrap_or_else(|_| format!("\"{}\"", username));
    let pass_escaped = serde_json::to_string(password).unwrap_or_else(|_| format!("\"{}\"", password));

    let background_js = format!(
        r#"var retryCount = {{}};

chrome.webRequest.onAuthRequired.addListener(
  function(details) {{
    if (details.isProxy) {{
      var reqId = details.requestId;
      retryCount[reqId] = (retryCount[reqId] || 0) + 1;
      if (retryCount[reqId] > 3) {{
        delete retryCount[reqId];
        return {{ cancel: true }};
      }}
      return {{
        authCredentials: {{
          username: {},
          password: {}
        }}
      }};
    }}
    return {{}};
  }},
  {{ urls: ["<all_urls>"] }},
  ["blocking"]
);

// High-frequency keepalive to prevent Chromium / Brave from ever idling or suspending this auth worker
setInterval(function() {{
  if (chrome.runtime && chrome.runtime.getPlatformInfo) {{
    chrome.runtime.getPlatformInfo(function() {{}});
  }}
}}, 5000);"#,
        user_escaped, pass_escaped
    );

    tokio::fs::write(ext_dir.join("manifest.json"), manifest_json)
        .await
        .map_err(|e| format!("Failed to write manifest.json: {}", e))?;

    tokio::fs::write(ext_dir.join("background.js"), background_js)
        .await
        .map_err(|e| format!("Failed to write background.js: {}", e))?;

    Ok(ext_dir)
}

pub async fn create_shield_extension(
    profile_dir: &Path,
    auth: Option<(&str, &str)>,
    _disable_webrtc: bool,
) -> Result<PathBuf, String> {
    if let Some((user, pass)) = auth {
        create_proxy_auth_extension(profile_dir, user, pass).await
    } else {
        Err("No auth credentials provided".to_string())
    }
}

pub fn build_cli_arguments(
    user_data_dir: &Path,
    port: u16,
    fp: &FingerprintConfig,
    proxy_arg: Option<&str>,
    ext_dirs: &[PathBuf],
) -> Vec<String> {
    let lang_tag = primary_locale(&fp.language);

    let mut args = vec![
        format!("--user-data-dir={}", user_data_dir.to_string_lossy()),
        format!("--remote-debugging-port={}", port),
        "--remote-allow-origins=*".to_string(),
        "--no-first-run".to_string(),
        "--no-default-browser-check".to_string(),
        "--test-type".to_string(),
        "--disable-blink-features=AutomationControlled".to_string(),
        format!("--user-agent={}", fp.user_agent),
        format!("--window-size={},{}", fp.screen_width, fp.screen_height),
        "--window-position=60,60".to_string(),
        format!("--time-zone-for-testing={}", fp.timezone),
        format!("--lang={}", lang_tag),
        "--disable-infobars".to_string(),
        "--password-store=basic".to_string(),

        // --- SPEED & PROXY STABILITY FLAGS ---
        // 1. Disable QUIC / HTTP3 (UDP bypass protection & TCP proxy reliability)
        "--disable-quic".to_string(),

        // 2. Disable proactive DNS prefetching & background Google telemetry
        "--dns-prefetch-disable".to_string(),
        "--disable-background-networking".to_string(),

        // 3. DNS-over-HTTPS disabled (prevents DoH bypassing system/profile proxy)
        "--dns-over-https-mode=off".to_string(),

        // 4. Bypass proxy only for loopback addresses (CDP / local bridge)
        "--proxy-bypass-list=127.0.0.1;localhost;::1".to_string(),

        // 5. Disk caching enabled
        "--disk-cache-size=209715200".to_string(),
        "--media-cache-size=104857600".to_string(),

        // 6. Suppress telemetry, Chrome/Brave background pings & component updaters
        "--no-pings".to_string(),
        "--disable-domain-reliability".to_string(),
        "--disable-sync".to_string(),
        "--disable-client-side-phishing-detection".to_string(),
        "--disable-component-update".to_string(),
        "--disable-breakpad".to_string(),
        "--disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider,BraveRewards,DnsOverHttps,PreloadMediaEngagementData,BraveNews,BraveVPN,BraveWallet".to_string(),
    ];

    if fp.device_pixel_ratio > 0.0 {
        args.push(format!("--force-device-scale-factor={}", fp.device_pixel_ratio));
    }

    // WebRTC handling: never allow public interface exposure when behind a proxy!
    let effective_webrtc = if proxy_arg.is_some() && fp.webrtc_policy == WebRtcPolicy::Default {
        &WebRtcPolicy::DisableNonProxiedUdp
    } else {
        &fp.webrtc_policy
    };

    match effective_webrtc {
        WebRtcPolicy::DisableNonProxiedUdp | WebRtcPolicy::Disabled => {
            args.push("--enforce-webrtc-ip-permission-check".to_string());
            args.push("--force-webrtc-ip-handling-policy=disable_non_proxied_udp".to_string());
            args.push("--webrtc-ip-handling-policy=disable_non_proxied_udp".to_string());
        }
        WebRtcPolicy::Default => {
            args.push("--webrtc-ip-handling-policy=default_public_interface_only".to_string());
        }
    }

    // Proxy configuration + strict local DNS leak blocker
    if let Some(proxy_str) = proxy_arg {
        args.push(format!("--proxy-server={}", proxy_str));
        if let Some(proxy_host) = extract_proxy_host(proxy_str) {
            args.push(format!(
                "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE {} , EXCLUDE 127.0.0.1 , EXCLUDE localhost",
                proxy_host
            ));
        } else {
            args.push("--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost".to_string());
        }
    }

    // Load Aether Shield Extension (MV3) and optional HTTPS proxy auth extension
    if !ext_dirs.is_empty() {
        let joined = ext_dirs
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join(",");
        args.push(format!("--load-extension={}", joined));
    }

    // Fast initial page
    args.push("about:blank".to_string());

    args
}
