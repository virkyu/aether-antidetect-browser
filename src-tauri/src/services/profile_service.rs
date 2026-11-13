use chrono::Utc;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

use crate::browser::ProcessManager;
use crate::models::{
    BulkCreateProfilesInput, CreateProfileInput, CreateProxyInput, FingerprintConfig, Profile,
    ProfileStatus, Proxy, ProxyCheckResult, ProxyProtocol, ProxyStatus, UpdateProfileInput,
};
use crate::services::proxy_service::test_proxy_connection;

pub struct ProfileService {
    pool: SqlitePool,
    process_mgr: ProcessManager,
}

impl ProfileService {
    pub fn new(pool: SqlitePool, process_mgr: ProcessManager) -> Self {
        Self { pool, process_mgr }
    }

    // ==========================================
    // PROFILES
    // ==========================================

    pub async fn get_profiles(&self) -> Result<Vec<Profile>, String> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, group_id, group_name, tags, status, fingerprint,
                   proxy_id, proxy_summary, notes, is_favorite, is_pinned,
                   pid, debugging_port, last_launched_at, total_runtime_sec,
                   created_at, updated_at
            FROM profiles
            ORDER BY is_pinned DESC, last_launched_at DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let mut profiles = Vec::with_capacity(rows.len());
        for row in rows {
            let id: String = row.get("id");
            let name: String = row.get("name");
            let group_id: Option<String> = row.get("group_id");
            let group_name: Option<String> = row.get("group_name");
            let tags_str: String = row.get("tags");
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let status_str: String = row.get("status");
            let mut status: ProfileStatus = serde_json::from_value(serde_json::Value::String(status_str))
                .unwrap_or(ProfileStatus::Idle);

            let fp_str: String = row.get("fingerprint");
            let fingerprint: FingerprintConfig = serde_json::from_str(&fp_str).unwrap_or_default();

            let proxy_id: Option<String> = row.get("proxy_id");
            let proxy_summary: Option<String> = row.get("proxy_summary");
            let notes: Option<String> = row.get("notes");
            let is_favorite: bool = row.get::<i64, _>("is_favorite") != 0;
            let is_pinned: bool = row.get::<i64, _>("is_pinned") != 0;
            let mut pid: Option<u32> = row.get::<Option<i64>, _>("pid").map(|p| p as u32);
            let mut debugging_port: Option<u16> = row.get::<Option<i64>, _>("debugging_port").map(|p| p as u16);
            let last_launched_at: Option<String> = row.get("last_launched_at");
            let total_runtime_sec: i64 = row.get("total_runtime_sec");
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            // Check actual process supervisor state
            if self.process_mgr.is_running(&id).await {
                status = ProfileStatus::Running;
                if let Some((active_pid, active_port, _)) = self.process_mgr.get_session_info(&id).await {
                    pid = Some(active_pid);
                    debugging_port = Some(active_port);
                }
            } else if status == ProfileStatus::Running {
                // Was marked running but process is gone
                status = ProfileStatus::Idle;
            }

            profiles.push(Profile {
                id,
                name,
                group_id,
                group_name,
                tags,
                status,
                fingerprint,
                proxy_id,
                proxy_summary,
                notes,
                is_favorite,
                is_pinned,
                pid,
                debugging_port,
                last_launched_at,
                total_runtime_sec,
                created_at,
                updated_at,
            });
        }

        Ok(profiles)
    }

    pub async fn create_profile(&self, input: CreateProfileInput) -> Result<Profile, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let tags = input.tags.unwrap_or_default();
        let tags_json = serde_json::to_string(&tags).map_err(|e| e.to_string())?;
        let fp = input.fingerprint.unwrap_or_default();
        let fp_json = serde_json::to_string(&fp).map_err(|e| e.to_string())?;

        sqlx::query(
            r#"
            INSERT INTO profiles (
                id, name, group_id, group_name, tags, status, fingerprint,
                proxy_id, proxy_summary, notes, is_favorite, is_pinned,
                pid, debugging_port, last_launched_at, total_runtime_sec,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'idle', ?, ?, ?, ?, 0, 0, NULL, NULL, NULL, 0, ?, ?)
            "#
        )
        .bind(&id)
        .bind(&input.name)
        .bind(&input.group_id)
        .bind(None::<String>)
        .bind(&tags_json)
        .bind(&fp_json)
        .bind(&input.proxy_id)
        .bind(None::<String>)
        .bind(&input.notes)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(Profile {
            id,
            name: input.name,
            group_id: input.group_id,
            group_name: None,
            tags,
            status: ProfileStatus::Idle,
            fingerprint: fp,
            proxy_id: input.proxy_id,
            proxy_summary: None,
            notes: input.notes,
            is_favorite: false,
            is_pinned: false,
            pid: None,
            debugging_port: None,
            last_launched_at: None,
            total_runtime_sec: 0,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub async fn bulk_create_profiles(&self, input: BulkCreateProfilesInput) -> Result<Vec<Profile>, String> {
        let mut created = Vec::with_capacity(input.count);
        let tags = input.tags.unwrap_or_else(|| vec!["bulk".to_string()]);

        for i in 1..=input.count {
            let name = format!("{} {:02}", input.name_prefix, i);
            let mut fp = FingerprintConfig::default();
            fp.os_type = input.os_type.clone();
            fp.browser_type = input.browser_type.clone();

            // Distribute proxies if provided
            let proxy_id = if let Some(ref p_ids) = input.proxy_ids {
                if !p_ids.is_empty() {
                    Some(p_ids[(i - 1) % p_ids.len()].clone())
                } else {
                    None
                }
            } else {
                None
            };

            let profile = self.create_profile(CreateProfileInput {
                name,
                group_id: None,
                tags: Some(tags.clone()),
                fingerprint: Some(fp),
                proxy_id,
                notes: Some("Bulk generated profile".to_string()),
            }).await?;

            created.push(profile);
        }

        Ok(created)
    }

    pub async fn update_profile(&self, input: UpdateProfileInput) -> Result<Profile, String> {
        let now = Utc::now().to_rfc3339();

        if let Some(ref name) = input.name {
            sqlx::query("UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?")
                .bind(name)
                .bind(&now)
                .bind(&input.id)
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
        }

        if let Some(ref tags) = input.tags {
            let tags_json = serde_json::to_string(tags).map_err(|e| e.to_string())?;
            sqlx::query("UPDATE profiles SET tags = ?, updated_at = ? WHERE id = ?")
                .bind(tags_json)
                .bind(&now)
                .bind(&input.id)
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
        }

        if let Some(ref fp) = input.fingerprint {
            let fp_json = serde_json::to_string(fp).map_err(|e| e.to_string())?;
            sqlx::query("UPDATE profiles SET fingerprint = ?, updated_at = ? WHERE id = ?")
                .bind(fp_json)
                .bind(&now)
                .bind(&input.id)
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
        }

        if let Some(ref notes) = input.notes {
            sqlx::query("UPDATE profiles SET notes = ?, updated_at = ? WHERE id = ?")
                .bind(notes)
                .bind(&now)
                .bind(&input.id)
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
        }

        sqlx::query("UPDATE profiles SET proxy_id = ?, updated_at = ? WHERE id = ?")
            .bind(&input.proxy_id)
            .bind(&now)
            .bind(&input.id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        let profiles = self.get_profiles().await?;
        profiles
            .into_iter()
            .find(|p| p.id == input.id)
            .ok_or_else(|| "Profile not found after update".to_string())
    }

    pub async fn delete_profile(&self, id: &str) -> Result<(), String> {
        // Stop if running
        if self.process_mgr.is_running(id).await {
            let _ = self.process_mgr.stop_profile(id).await;
        }

        sqlx::query("DELETE FROM profiles WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub async fn start_profile(&self, id: &str) -> Result<Profile, String> {
        let profiles = self.get_profiles().await?;
        let mut profile = profiles
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| "Profile not found".to_string())?;

        // Retrieve proxy argument and credentials if configured
        let mut proxy_arg_str = None;
        let mut proxy_auth_pair = None;
        if let Some(ref p_id) = profile.proxy_id {
            if let Ok(proxies) = self.get_proxies().await {
                if let Some(p) = proxies.into_iter().find(|px| px.id == *p_id) {
                    let scheme = match p.protocol {
                        ProxyProtocol::Http => "http",
                        ProxyProtocol::Https => "https",
                        ProxyProtocol::Socks5 => "socks5",
                    };
                    proxy_arg_str = Some(format!("{}://{}:{}", scheme, p.host, p.port));

                    if let (Some(ref u), Some(ref pw)) = (p.username, p.password) {
                        let ut = u.trim();
                        let pwt = pw.trim();
                        if !ut.is_empty() && !pwt.is_empty() {
                            proxy_auth_pair = Some((ut.to_string(), pwt.to_string()));
                        }
                    }
                }
            }
        }

        let proxy_auth_refs = proxy_auth_pair
            .as_ref()
            .map(|(u, p)| (u.as_str(), p.as_str()));

        let (pid, port) = self
            .process_mgr
            .launch_profile(id, &profile.fingerprint, proxy_arg_str.as_deref(), proxy_auth_refs)
            .await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE profiles SET status = 'running', pid = ?, debugging_port = ?, last_launched_at = ?, updated_at = ? WHERE id = ?"
        )
        .bind(pid as i64)
        .bind(port as i64)
        .bind(&now)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        profile.status = ProfileStatus::Running;
        profile.pid = Some(pid);
        profile.debugging_port = Some(port);
        profile.last_launched_at = Some(now);

        Ok(profile)
    }

    pub async fn stop_profile(&self, id: &str) -> Result<Profile, String> {
        let runtime_sec = self.process_mgr.stop_profile(id).await.unwrap_or(0);
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE profiles SET status = 'idle', pid = NULL, debugging_port = NULL, total_runtime_sec = total_runtime_sec + ?, updated_at = ? WHERE id = ?"
        )
        .bind(runtime_sec as i64)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let profiles = self.get_profiles().await?;
        profiles
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| "Profile not found after stop".to_string())
    }

    pub async fn toggle_favorite(&self, id: &str) -> Result<Profile, String> {
        sqlx::query("UPDATE profiles SET is_favorite = NOT is_favorite WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        let profiles = self.get_profiles().await?;
        profiles
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| "Profile not found".to_string())
    }

    pub async fn toggle_pin(&self, id: &str) -> Result<Profile, String> {
        sqlx::query("UPDATE profiles SET is_pinned = NOT is_pinned WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        let profiles = self.get_profiles().await?;
        profiles
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| "Profile not found".to_string())
    }

    // ==========================================
    // PROXIES
    // ==========================================

    pub async fn get_proxies(&self) -> Result<Vec<Proxy>, String> {
        let rows = sqlx::query(
            r#"
            SELECT id, title, protocol, host, port, username, password,
                   status, latency_ms, exit_ip, country_code, country_name,
                   last_checked_at, error_message, tags, created_at, updated_at
            FROM proxies
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let mut proxies = Vec::with_capacity(rows.len());
        for row in rows {
            let id: String = row.get("id");
            let title: String = row.get("title");
            let proto_str: String = row.get("protocol");
            let protocol = match proto_str.to_lowercase().as_str() {
                "https" => ProxyProtocol::Https,
                "socks5" => ProxyProtocol::Socks5,
                _ => ProxyProtocol::Http,
            };
            let host: String = row.get("host");
            let port: u16 = row.get::<i64, _>("port") as u16;
            let username: Option<String> = row.get("username");
            let password: Option<String> = row.get("password");
            let status_str: String = row.get("status");
            let status = match status_str.as_str() {
                "active" => ProxyStatus::Active,
                "failed" => ProxyStatus::Failed,
                "testing" => ProxyStatus::Testing,
                _ => ProxyStatus::Untested,
            };
            let latency_ms: Option<u64> = row.get::<Option<i64>, _>("latency_ms").map(|l| l as u64);
            let exit_ip: Option<String> = row.get("exit_ip");
            let country_code: Option<String> = row.get("country_code");
            let country_name: Option<String> = row.get("country_name");
            let last_checked_at: Option<String> = row.get("last_checked_at");
            let error_message: Option<String> = row.get("error_message");
            let tags_str: String = row.get("tags");
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            proxies.push(Proxy {
                id,
                title,
                protocol,
                host,
                port,
                username,
                password,
                status,
                latency_ms,
                exit_ip,
                country_code,
                country_name,
                last_checked_at,
                error_message,
                tags,
                created_at,
                updated_at,
            });
        }

        Ok(proxies)
    }

    pub async fn create_proxy(&self, input: CreateProxyInput) -> Result<Proxy, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let title = input.title.unwrap_or_else(|| format!("{}:{}", input.host, input.port));
        let tags = input.tags.unwrap_or_default();
        let tags_json = serde_json::to_string(&tags).map_err(|e| e.to_string())?;

        let proto_str = match input.protocol {
            ProxyProtocol::Http => "http",
            ProxyProtocol::Https => "https",
            ProxyProtocol::Socks5 => "socks5",
        };

        sqlx::query(
            r#"
            INSERT INTO proxies (
                id, title, protocol, host, port, username, password,
                status, latency_ms, exit_ip, country_code, country_name,
                last_checked_at, error_message, tags, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'untested', NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)
            "#
        )
        .bind(&id)
        .bind(&title)
        .bind(proto_str)
        .bind(&input.host)
        .bind(input.port as i64)
        .bind(&input.username)
        .bind(&input.password)
        .bind(&tags_json)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(Proxy {
            id,
            title,
            protocol: input.protocol,
            host: input.host,
            port: input.port,
            username: input.username,
            password: input.password,
            status: ProxyStatus::Untested,
            latency_ms: None,
            exit_ip: None,
            country_code: None,
            country_name: None,
            last_checked_at: None,
            error_message: None,
            tags,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub async fn bulk_import_proxies(&self, text: &str) -> Result<Vec<Proxy>, String> {
        let mut created = Vec::new();
        for line in text.lines() {
            let clean = line.trim();
            if clean.is_empty() {
                continue;
            }

            // Supported formats:
            // 1. host:port:login:password
            // 2. host:port
            // 3. login:password@host:port
            // 4. socks5://login:password@host:port or http://host:port:login:password
            let mut protocol = ProxyProtocol::Http;
            let mut rest = clean;

            if rest.starts_with("socks5://") {
                protocol = ProxyProtocol::Socks5;
                rest = &rest[9..];
            } else if rest.starts_with("https://") {
                protocol = ProxyProtocol::Https;
                rest = &rest[8..];
            } else if rest.starts_with("http://") {
                protocol = ProxyProtocol::Http;
                rest = &rest[7..];
            }

            let (host, port, username, password) = if rest.contains('@') {
                let parts: Vec<&str> = rest.splitn(2, '@').collect();
                let auth_parts: Vec<&str> = parts[0].splitn(2, ':').collect();
                let host_parts: Vec<&str> = parts[1].split(':').collect();

                let u = auth_parts.get(0).map(|s| s.to_string());
                let p = auth_parts.get(1).map(|s| s.to_string());
                let h = host_parts.get(0).unwrap_or(&"").to_string();
                let port: u16 = host_parts.get(1).and_then(|p| p.parse().ok()).unwrap_or(8080);
                (h, port, u, p)
            } else {
                let parts: Vec<&str> = rest.split(':').collect();
                if parts.len() >= 4 {
                    // host:port:login:password
                    let h = parts[0].to_string();
                    let port: u16 = parts[1].parse().unwrap_or(8080);
                    let u = Some(parts[2].to_string());
                    let p = Some(parts[3..].join(":"));
                    (h, port, u, p)
                } else if parts.len() >= 2 {
                    // host:port
                    let h = parts[0].to_string();
                    let port: u16 = parts[1].parse().unwrap_or(8080);
                    (h, port, None, None)
                } else {
                    continue;
                }
            };

            if !host.is_empty() {
                let p = self.create_proxy(CreateProxyInput {
                    title: None,
                    protocol,
                    host,
                    port,
                    username,
                    password,
                    tags: Some(vec!["imported".to_string()]),
                }).await?;

                created.push(p);
            }
        }

        Ok(created)
    }

    pub async fn delete_proxy(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM proxies WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        // Nullify proxy reference in profiles
        let _ = sqlx::query("UPDATE profiles SET proxy_id = NULL WHERE proxy_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await;

        Ok(())
    }

    pub async fn check_proxy(&self, id: &str) -> Result<ProxyCheckResult, String> {
        let proxies = self.get_proxies().await?;
        let proxy = proxies
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| "Proxy not found".to_string())?;

        let result = test_proxy_connection(&proxy).await;
        let now = Utc::now().to_rfc3339();
        let status_str = match result.status {
            ProxyStatus::Active => "active",
            ProxyStatus::Failed => "failed",
            _ => "untested",
        };

        sqlx::query(
            "UPDATE proxies SET status = ?, latency_ms = ?, exit_ip = ?, country_code = ?, error_message = ?, last_checked_at = ?, updated_at = ? WHERE id = ?"
        )
        .bind(status_str)
        .bind(result.latency_ms.map(|l| l as i64))
        .bind(&result.exit_ip)
        .bind(&result.country_code)
        .bind(&result.error_message)
        .bind(&now)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(result)
    }
}
