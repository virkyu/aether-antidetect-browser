pub mod browser;
pub mod commands;
pub mod database;
pub mod models;
pub mod services;

#[cfg(test)]
mod tests;

use std::sync::Arc;
use tauri::Manager;
use browser::ProcessManager;
use database::init_db;
use services::ProfileService;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut log_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    log_dir.push(".aether");
    let _ = std::fs::create_dir_all(&log_dir);
    let log_file = log_dir.join("app.log");

    if let Ok(file) = std::fs::File::create(&log_file) {
        tracing_subscriber::fmt()
            .with_writer(file)
            .with_max_level(tracing::Level::DEBUG)
            .init();
    } else {
        tracing_subscriber::fmt::init();
    }

    tracing::info!("Initializing Aether Browser engine and storage...");

    let pool = tauri::async_runtime::block_on(async {
        init_db().await.expect("Failed to initialize SQLite database")
    });

    let process_mgr = ProcessManager::new();
    let profile_service = Arc::new(ProfileService::new(pool, process_mgr));

    tauri::Builder::default()
        .manage(profile_service)
        .invoke_handler(tauri::generate_handler![
            commands::get_profiles,
            commands::create_profile,
            commands::bulk_create_profiles,
            commands::update_profile,
            commands::delete_profile,
            commands::bulk_delete_profiles,
            commands::start_profile,
            commands::stop_profile,
            commands::toggle_favorite,
            commands::toggle_pin,
            commands::get_proxies,
            commands::create_proxy,
            commands::bulk_import_proxies,
            commands::delete_proxy,
            commands::check_proxy,
        ])
        .setup(|_app| {
            tracing::info!("Aether Browser desktop workspace initialized.");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
