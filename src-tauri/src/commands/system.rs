use serde::{Deserialize, Serialize};
use std::time::Duration;

const GITHUB_LATEST_RELEASE_URL: &str =
    "https://api.github.com/repos/virkyu/aether-antidetect-browser/releases/latest";

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Debug, Deserialize)]
struct GithubReleaseResponse {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    html_url: String,
    published_at: Option<String>,
    assets: Option<Vec<GithubAsset>>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub tag_name: String,
    pub name: String,
    pub body: String,
    pub html_url: String,
    pub download_url: Option<String>,
    pub published_at: String,
    pub update_available: bool,
}

pub fn parse_semver(version: &str) -> (u64, u64, u64) {
    let clean = version.trim().trim_start_matches(['v', 'V']);
    let base = clean.split('-').next().unwrap_or(clean);
    let mut parts = base.split('.');
    let major = parts.next().and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
    let minor = parts.next().and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
    let patch = parts.next().and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
    (major, minor, patch)
}

pub fn is_newer_version(current: &str, latest: &str) -> bool {
    parse_semver(latest) > parse_semver(current)
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to initialize HTTP client: {}", e))?;

    let resp = client
        .get(GITHUB_LATEST_RELEASE_URL)
        .header("User-Agent", format!("Aether-Browser/{}", current_version))
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("Failed to contact GitHub Releases API: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GitHub API returned HTTP {}", resp.status()));
    }

    let release: GithubReleaseResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub release response: {}", e))?;

    let latest_version = release
        .tag_name
        .trim()
        .trim_start_matches(['v', 'V'])
        .to_string();

    let download_url = release.assets.and_then(|assets| {
        assets
            .into_iter()
            .find(|a| a.name.to_lowercase().ends_with(".exe"))
            .map(|a| a.browser_download_url)
    });

    let update_available = is_newer_version(&current_version, &latest_version);

    Ok(UpdateInfo {
        current_version,
        latest_version,
        tag_name: release.tag_name.clone(),
        name: release.name.unwrap_or_else(|| release.tag_name),
        body: release.body.unwrap_or_default(),
        html_url: release.html_url,
        download_url,
        published_at: release.published_at.unwrap_or_default(),
        update_available,
    })
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://github.com/virkyu/aether-antidetect-browser") {
        return Err("Only project GitHub URLs are allowed".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_semver_comparison() {
        assert_eq!(parse_semver("v1.0.4"), (1, 0, 4));
        assert_eq!(parse_semver("1.2.3-beta"), (1, 2, 3));
        assert!(is_newer_version("1.0.3", "v1.0.4"));
        assert!(is_newer_version("1.0.4", "1.1.0"));
        assert!(!is_newer_version("1.0.4", "v1.0.4"));
        assert!(!is_newer_version("1.0.4", "v1.0.3"));
    }
}
