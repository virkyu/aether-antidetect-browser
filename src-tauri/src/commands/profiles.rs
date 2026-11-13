use std::sync::Arc;
use tauri::State;
use crate::models::{BulkCreateProfilesInput, CreateProfileInput, Profile, UpdateProfileInput};
use crate::services::ProfileService;

#[tauri::command]
pub async fn get_profiles(service: State<'_, Arc<ProfileService>>) -> Result<Vec<Profile>, String> {
    service.get_profiles().await
}

#[tauri::command]
pub async fn create_profile(
    input: CreateProfileInput,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Profile, String> {
    service.create_profile(input).await
}

#[tauri::command]
pub async fn bulk_create_profiles(
    input: BulkCreateProfilesInput,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Vec<Profile>, String> {
    service.bulk_create_profiles(input).await
}

#[tauri::command]
pub async fn update_profile(
    input: UpdateProfileInput,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Profile, String> {
    service.update_profile(input).await
}

#[tauri::command]
pub async fn delete_profile(
    id: String,
    service: State<'_, Arc<ProfileService>>,
) -> Result<(), String> {
    service.delete_profile(&id).await
}

#[tauri::command]
pub async fn bulk_delete_profiles(
    ids: Vec<String>,
    service: State<'_, Arc<ProfileService>>,
) -> Result<(), String> {
    for id in ids {
        service.delete_profile(&id).await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn start_profile(
    id: String,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Profile, String> {
    service.start_profile(&id).await
}

#[tauri::command]
pub async fn stop_profile(
    id: String,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Profile, String> {
    service.stop_profile(&id).await
}

#[tauri::command]
pub async fn toggle_favorite(
    id: String,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Profile, String> {
    service.toggle_favorite(&id).await
}

#[tauri::command]
pub async fn toggle_pin(
    id: String,
    service: State<'_, Arc<ProfileService>>,
) -> Result<Profile, String> {
    service.toggle_pin(&id).await
}
