use std::collections::HashMap;
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;
use tokio::process::Child;
use tokio::sync::Mutex;

use crate::browser::fingerprint::{
    build_cli_arguments, create_proxy_auth_extension, detect_chromium_executable,
};
use crate::models::FingerprintConfig;

pub struct ActiveSession {
    pub pid: u32,
    pub port: u16,
    pub started_at: Instant,
    pub child: Child,
    pub profile_dir: PathBuf,
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
        proxy_arg: Option<&str>,
        proxy_auth: Option<(&str, &str)>,
    ) -> Result<(u32, u16), String> {
        let mut sessions = self.sessions.lock().await;

        if sessions.contains_key(profile_id) {
            return Err("Profile is already running".to_string());
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

        // Check and clean any stale lockfiles
        let lock_file = profile_dir.join(".lock");
        if lock_file.exists() {
            tracing::warn!("Existing lockfile detected for profile {}, cleaning up", profile_id);
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

        // Pre-configure Chromium / Brave Default Preferences safely (merge to preserve disk cache, cookies and performance)
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

        prefs_data["webrtc"] = serde_json::json!({
            "ip_handling_policy": "disable_non_proxied_udp"
        });
        prefs_data["dns_over_https"] = serde_json::json!({
            "mode": "off"
        });
        prefs_data["net"] = serde_json::json!({
            "network_prediction_options": 2
        });
        prefs_data["brave"] = serde_json::json!({
            "shields": {
                "stats": false
            },
            "brave_news": {
                "enabled": false
            },
            "brave_ads": {
                "enabled": false
            },
            "today": {
                "enabled": false
            },
            "p3a": {
                "enabled": false
            },
            "wallet": {
                "enabled": false
            }
        });
        prefs_data["safebrowsing"] = serde_json::json!({
            "enabled": false
        });

        if let Ok(serialized) = serde_json::to_string_pretty(&prefs_data) {
            let _ = tokio::fs::write(&prefs_file, serialized).await;
        }

        // Generate proxy authentication extension only if credentials provided
        let ext_dir = if let Some((user, pass)) = proxy_auth {
            match create_proxy_auth_extension(&profile_dir, user, pass).await {
                Ok(path) => {
                    tracing::info!("Created proxy auth extension at {:?}", path);
                    Some(path)
                }
                Err(e) => {
                    tracing::error!("Failed to create proxy auth extension: {}", e);
                    None
                }
            }
        } else {
            None
        };

        let port = Self::find_free_port()?;
        let args = build_cli_arguments(&data_dir, port, fp, proxy_arg, ext_dir.as_deref());

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

        // Write lockfile
        let _ = tokio::fs::write(&lock_file, pid.to_string()).await;

        let session = ActiveSession {
            pid,
            port,
            started_at: Instant::now(),
            child,
            profile_dir,
        };

        sessions.insert(profile_id.to_string(), session);

        Ok((pid, port))
    }

    pub async fn stop_profile(&self, profile_id: &str) -> Result<u64, String> {
        let mut sessions = self.sessions.lock().await;

        if let Some(mut session) = sessions.remove(profile_id) {
            let duration = session.started_at.elapsed().as_secs();

            // Attempt graceful kill
            let _ = session.child.kill().await;

            // Remove lockfile
            let lock_file = session.profile_dir.join(".lock");
            let _ = tokio::fs::remove_file(&lock_file).await;

            Ok(duration)
        } else {
            Err("Profile is not actively running".to_string())
        }
    }

    pub async fn is_running(&self, profile_id: &str) -> bool {
        let sessions = self.sessions.lock().await;
        sessions.contains_key(profile_id)
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
