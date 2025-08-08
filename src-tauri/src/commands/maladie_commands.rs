use crate::models::{Maladie, CreateMaladie, UpdateMaladie, PaginatedMaladies};
use crate::services::MaladieService;
use crate::database::DatabaseManager;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn create_maladie(
    maladie: CreateMaladie,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Maladie, String> {
    let service = MaladieService::new(db.inner().clone());
    service.create_maladie(maladie).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_maladies(
    page: Option<u32>,
    perPage: Option<u32>,
    nomSearch: Option<String>,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<PaginatedMaladies, String> {
    let service = MaladieService::new(db.inner().clone());
    let page = page.unwrap_or(1);
    let per_page = perPage.unwrap_or(10);
    
    // Convert empty strings to None and handle the parameters properly
    let nom_search = nomSearch.as_ref().and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    });
    
    service.get_maladies(page, per_page, nom_search.map(String::from)).await
}

#[tauri::command]
pub async fn get_maladies_list(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<Maladie>, String> {
    let service = MaladieService::new(db.inner().clone());
    service.get_maladies_list().await
}

#[tauri::command]
pub async fn update_maladie(
    maladie: UpdateMaladie,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Maladie, String> {
    let service = MaladieService::new(db.inner().clone());
    service.update_maladie(maladie).await
}

#[tauri::command]
pub async fn delete_maladie(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let service = MaladieService::new(db.inner().clone());
    service.delete_maladie(id).await
}
