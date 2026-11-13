use std::sync::Arc;
use tauri::State;
use crate::models::{CreateProxyInput, Proxy, ProxyCheckResult};
use crate::services::ProfileService;

#[tauri::command]
pub async fn get_proxies(service: State<'_, Arc<ProfileService>>) -> Result<Vec<Proxy>, String> {
    service.get_proxies().await
}

#[tauri::command]
pub async fn create_proxy(
    input: CreateProxyInput,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Proxy, String> {
    service.create_proxy(input).await
}

#[tauri::command]
pub async fn bulk_import_proxies(
    text: String,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Vec<Proxy>, String> {
    service.bulk_import_proxies(&text).await
}

#[tauri::command]
pub async fn delete_proxy(
    id: String,
    service: State<'_, Arc<ProfileService>>,
) -> Result<(), String> {
    service.delete_proxy(&id).await
}

#[tauri::command]
pub async fn check_proxy(
    id: String,
    service: State<'_, Arc<ProfileService>>,
) -> Result<ProxyCheckResult, String> {
    service.check_proxy(&id).await
}
