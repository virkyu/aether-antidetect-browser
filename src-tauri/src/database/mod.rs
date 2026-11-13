use std::path::PathBuf;
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;

pub async fn init_db() -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let mut data_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    data_dir.push(".aether");
    tokio::fs::create_dir_all(&data_dir).await?;

    let db_path = data_dir.join("aether.db");
    let db_url = format!("sqlite://{}", db_path.to_string_lossy());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options).await?;

    // Create tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_id TEXT,
            group_name TEXT,
            tags TEXT NOT NULL DEFAULT '[]',
            status TEXT NOT NULL DEFAULT 'idle',
            fingerprint TEXT NOT NULL,
            proxy_id TEXT,
            proxy_summary TEXT,
            notes TEXT,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            pid INTEGER,
            debugging_port INTEGER,
            last_launched_at TEXT,
            total_runtime_sec INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS proxies (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            protocol TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            username TEXT,
            password TEXT,
            status TEXT NOT NULL DEFAULT 'untested',
            latency_ms INTEGER,
            exit_ip TEXT,
            country_code TEXT,
            country_name TEXT,
            last_checked_at TEXT,
            error_message TEXT,
            tags TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            entity_name TEXT,
            details TEXT,
            status TEXT NOT NULL
        );
        "#
    )
    .execute(&pool)
    .await?;

    tracing::info!("SQLite database initialized successfully at {:?}", db_path);
    Ok(pool)
}
