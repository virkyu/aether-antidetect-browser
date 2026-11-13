use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProxyProtocol {
    Http,
    Https,
    Socks5,
}

impl Default for ProxyProtocol {
    fn default() -> Self {
        ProxyProtocol::Http
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProxyStatus {
    Untested,
    Testing,
    Active,
    Failed,
}

impl Default for ProxyStatus {
    fn default() -> Self {
        ProxyStatus::Untested
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Proxy {
    pub id: String,
    pub title: String,
    pub protocol: ProxyProtocol,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub status: ProxyStatus,
    pub latency_ms: Option<u64>,
    pub exit_ip: Option<String>,
    pub country_code: Option<String>,
    pub country_name: Option<String>,
    pub last_checked_at: Option<String>,
    pub error_message: Option<String>,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProxyInput {
    pub title: Option<String>,
    pub protocol: ProxyProtocol,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyCheckResult {
    pub proxy_id: String,
    pub status: ProxyStatus,
    pub latency_ms: Option<u64>,
    pub exit_ip: Option<String>,
    pub country_code: Option<String>,
    pub country_name: Option<String>,
    pub error_message: Option<String>,
}
