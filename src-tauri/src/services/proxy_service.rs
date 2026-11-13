use std::time::Instant;
use crate::models::{Proxy, ProxyCheckResult, ProxyProtocol, ProxyStatus};

pub async fn test_proxy_connection(proxy: &Proxy) -> ProxyCheckResult {
    let scheme = match proxy.protocol {
        ProxyProtocol::Http => "http",
        ProxyProtocol::Https => "https",
        ProxyProtocol::Socks5 => "socks5",
    };

    let proxy_url_str = if let (Some(u), Some(p)) = (&proxy.username, &proxy.password) {
        format!("{}://{}:{}@{}:{}", scheme, u, p, proxy.host, proxy.port)
    } else {
        format!("{}://{}:{}", scheme, proxy.host, proxy.port)
    };

    let reqwest_proxy = match reqwest::Proxy::all(&proxy_url_str) {
        Ok(p) => p,
        Err(e) => {
            return ProxyCheckResult {
                proxy_id: proxy.id.clone(),
                status: ProxyStatus::Failed,
                latency_ms: None,
                exit_ip: None,
                country_code: None,
                country_name: None,
                error_message: Some(format!("Invalid proxy URL format: {}", e)),
            };
        }
    };

    let client = match reqwest::Client::builder()
        .proxy(reqwest_proxy)
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return ProxyCheckResult {
                proxy_id: proxy.id.clone(),
                status: ProxyStatus::Failed,
                latency_ms: None,
                exit_ip: None,
                country_code: None,
                country_name: None,
                error_message: Some(format!("Failed to build proxy client: {}", e)),
            };
        }
    };

    let start = Instant::now();
    // Test connectivity by checking exit IP
    match client.get("https://api.ipify.org?format=json").send().await {
        Ok(resp) => {
            let latency_ms = start.elapsed().as_millis() as u64;
            if resp.status().is_success() {
                #[derive(serde::Deserialize)]
                struct IpResponse {
                    ip: String,
                }
                let ip_data = resp.json::<IpResponse>().await.ok();
                let exit_ip = ip_data.map(|d| d.ip);

                ProxyCheckResult {
                    proxy_id: proxy.id.clone(),
                    status: ProxyStatus::Active,
                    latency_ms: Some(latency_ms),
                    exit_ip,
                    country_code: Some("LOC".to_string()),
                    country_name: None,
                    error_message: None,
                }
            } else {
                ProxyCheckResult {
                    proxy_id: proxy.id.clone(),
                    status: ProxyStatus::Failed,
                    latency_ms: Some(latency_ms),
                    exit_ip: None,
                    country_code: None,
                    country_name: None,
                    error_message: Some(format!("Proxy responded with HTTP status {}", resp.status())),
                }
            }
        }
        Err(e) => ProxyCheckResult {
            proxy_id: proxy.id.clone(),
            status: ProxyStatus::Failed,
            latency_ms: None,
            exit_ip: None,
            country_code: None,
            country_name: None,
            error_message: Some(format!("Connection timed out or refused: {}", e)),
        },
    }
}
