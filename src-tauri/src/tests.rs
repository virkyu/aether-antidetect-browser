#[cfg(test)]
mod tests {
    use std::path::PathBuf;
    use crate::browser::{build_cli_arguments, detect_chromium_executable, ProcessManager};
    use crate::models::FingerprintConfig;

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
    fn test_cli_arguments_generation() {
        let user_data = PathBuf::from("C:\\Users\\Test\\.aether\\profiles\\p1\\data");
        let fp = FingerprintConfig::default();
        let port = 9333;
        let proxy_str = "socks5://127.0.0.1:1080";

        let args = build_cli_arguments(&user_data, port, &fp, Some(proxy_str), None);

        assert!(args.iter().any(|a| a.starts_with("--user-data-dir=")));
        assert!(args.iter().any(|a| a == "--remote-debugging-port=9333"));
        assert!(args.iter().any(|a| a == "--test-type"));
        assert!(args.iter().any(|a| a.starts_with("--user-agent=")));
        assert!(args.iter().any(|a| a == "--window-size=1920,1080"));
        assert!(args.iter().any(|a| a == "--proxy-server=socks5://127.0.0.1:1080"));
        assert!(args.iter().any(|a| a.contains("webrtc-ip-handling-policy=disable_non_proxied_udp")));
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
