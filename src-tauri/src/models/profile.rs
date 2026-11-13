use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OsType {
    Windows,
    Macos,
    Linux,
}

impl Default for OsType {
    fn default() -> Self {
        OsType::Windows
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BrowserType {
    Chrome,
    Edge,
    Brave,
}

impl Default for BrowserType {
    fn default() -> Self {
        BrowserType::Chrome
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WebRtcPolicy {
    Default,
    DisableNonProxiedUdp,
    Disabled,
}

impl Default for WebRtcPolicy {
    fn default() -> Self {
        WebRtcPolicy::DisableNonProxiedUdp
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CanvasNoiseMode {
    Noise,
    Off,
    Block,
}

impl Default for CanvasNoiseMode {
    fn default() -> Self {
        CanvasNoiseMode::Noise
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProfileStatus {
    Idle,
    Running,
    Stopping,
    Error,
}

impl Default for ProfileStatus {
    fn default() -> Self {
        ProfileStatus::Idle
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GeolocationConfig {
    pub mode: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub accuracy: Option<f64>,
}

impl Default for GeolocationConfig {
    fn default() -> Self {
        Self {
            mode: "auto".to_string(),
            latitude: None,
            longitude: None,
            accuracy: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct FingerprintConfig {
    pub user_agent: String,
    pub os_type: OsType,
    pub browser_type: BrowserType,
    pub browser_version: String,
    pub screen_width: u32,
    pub screen_height: u32,
    pub device_pixel_ratio: f32,
    pub language: String,
    pub timezone: String,
    pub geolocation: GeolocationConfig,
    pub webrtc_policy: WebRtcPolicy,
    pub canvas_noise: CanvasNoiseMode,
    pub webgl_noise: bool,
    pub audio_noise: bool,
    pub hardware_concurrency: u32,
    pub device_memory_gb: u32,
    pub do_not_track: bool,
}

impl Default for FingerprintConfig {
    fn default() -> Self {
        Self {
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36".to_string(),
            os_type: OsType::Windows,
            browser_type: BrowserType::Chrome,
            browser_version: "133.0.0.0".to_string(),
            screen_width: 1920,
            screen_height: 1080,
            device_pixel_ratio: 1.0,
            language: "en-US,en;q=0.9".to_string(),
            timezone: "America/New_York".to_string(),
            geolocation: GeolocationConfig::default(),
            webrtc_policy: WebRtcPolicy::DisableNonProxiedUdp,
            canvas_noise: CanvasNoiseMode::Noise,
            webgl_noise: true,
            audio_noise: true,
            hardware_concurrency: 8,
            device_memory_gb: 16,
            do_not_track: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub group_id: Option<String>,
    pub group_name: Option<String>,
    pub tags: Vec<String>,
    pub status: ProfileStatus,
    pub fingerprint: FingerprintConfig,
    pub proxy_id: Option<String>,
    pub proxy_summary: Option<String>,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub is_pinned: bool,
    pub pid: Option<u32>,
    pub debugging_port: Option<u16>,
    pub last_launched_at: Option<String>,
    pub total_runtime_sec: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct CreateProfileInput {
    pub name: String,
    pub group_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub fingerprint: Option<FingerprintConfig>,
    pub proxy_id: Option<String>,
    pub notes: Option<String>,
}

impl Default for CreateProfileInput {
    fn default() -> Self {
        Self {
            name: "New Profile".to_string(),
            group_id: None,
            tags: None,
            fingerprint: None,
            proxy_id: None,
            notes: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateProfileInput {
    pub id: String,
    pub name: Option<String>,
    pub group_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub fingerprint: Option<FingerprintConfig>,
    pub proxy_id: Option<String>,
    pub notes: Option<String>,
}

impl Default for UpdateProfileInput {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: None,
            group_id: None,
            tags: None,
            fingerprint: None,
            proxy_id: None,
            notes: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkCreateProfilesInput {
    pub count: usize,
    pub name_prefix: String,
    pub os_type: OsType,
    pub browser_type: BrowserType,
    pub proxy_ids: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
}
