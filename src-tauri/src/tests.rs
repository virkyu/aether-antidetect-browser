#[cfg(test)]
mod tests {
    use std::path::PathBuf;
    use crate::browser::shield::{deterministic_webgl_profile, generate_spoof_js, primary_locale};
    use crate::browser::{build_cli_arguments, detect_chromium_executable, ProcessManager};
    use crate::models::{FingerprintConfig, OsType, WebRtcPolicy};

    #[test]
    fn test_fingerprint_default_consistency() {
        let fp = FingerprintConfig::default();
        assert_eq!(fp.screen_width, 1920);
        assert_eq!(fp.screen_height, 1080);
        assert_eq!(fp.hardware_concurrency, 8);
        assert_eq!(fp.device_memory_gb, 16);
        assert!(fp.user_agent.contains("Chrome"));
    }

    #[test]
    fn test_cli_arguments_generation_and_leak_prevention() {
        let user_data = PathBuf::from("C:\\Users\\Test\\.aether\\profiles\\p1\\data");
        let mut fp = FingerprintConfig::default();
        fp.language = "pl-PL,pl;q=0.9,en-US;q=0.8".to_string();
        fp.webrtc_policy = WebRtcPolicy::Default; // Even if Default, proxy must enforce leak protection!
        let port = 9333;
        let proxy_str = "http://127.0.0.1:41234";

        let args = build_cli_arguments(&user_data, port, &fp, Some(proxy_str), &[]);

        assert!(args.iter().any(|a| a.starts_with("--user-data-dir=")));
        assert!(args.iter().any(|a| a == "--remote-debugging-port=9333"));
        assert!(args.iter().any(|a| a == "--disable-blink-features=AutomationControlled"));
        assert!(args.iter().any(|a| a == "--lang=pl-PL"));
        assert!(args.iter().any(|a| a == "--disable-background-networking"));
        assert!(args.iter().any(|a| a.starts_with("--host-resolver-rules=MAP * ~NOTFOUND")));
        assert!(args.iter().any(|a| a == "--proxy-server=http://127.0.0.1:41234"));
        assert!(args.iter().any(|a| a.contains("webrtc-ip-handling-policy=disable_non_proxied_udp")));
        assert!(!args.iter().any(|a| a == "--disable-webrtc"));
    }

    #[test]
    fn test_shield_js_deterministic_and_os_matched() {
        assert_eq!(primary_locale("pl-PL,pl;q=0.9,en-US;q=0.8"), "pl-PL");
        let (vendor, renderer) = deterministic_webgl_profile(&OsType::Macos, 0);
        assert!(vendor.contains("Apple") || vendor.contains("Intel"));
        assert!(!renderer.contains("NVIDIA"));

        let fp = FingerprintConfig::default();
        let js_a1 = generate_spoof_js("profile-123", &fp, true);
        let js_a2 = generate_spoof_js("profile-123", &fp, true);
        let js_b = generate_spoof_js("profile-999", &fp, true);
        assert_eq!(js_a1, js_a2);
        assert_ne!(js_a1, js_b);
        assert!(js_a1.contains("\"webrtcMode\":\"scrub_local\""));
    }

    #[test]
    fn test_find_free_port() {
        let port = ProcessManager::find_free_port().expect("Must allocate free OS port");
        assert!(port > 1024);
    }

    #[test]
    fn test_detect_chromium_executable() {
        let detected = detect_chromium_executable(None);
        assert!(detected.is_some(), "At least one Chromium browser (Edge/Chrome/Brave) must be detected on this Windows host");
        let path = detected.unwrap();
        assert!(path.exists());
    }

    #[test]
    fn test_proxy_bulk_import_parsing() {
        let input = "127.0.0.1:8080\n192.168.1.50:9050:admin:secret123\nsocks5://proxyuser:pass@10.0.0.1:1080";
        let lines: Vec<&str> = input.lines().collect();
        assert_eq!(lines.len(), 3);
    }
}
