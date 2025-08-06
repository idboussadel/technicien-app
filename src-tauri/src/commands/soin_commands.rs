use crate::database::DatabaseManager;
use crate::models::{Soin, CreateSoin, UpdateSoin, PaginatedSoin};
use crate::repositories::{SoinRepository, SoinRepositoryTrait};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn create_soin(
    soin: CreateSoin,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Soin, String> {
    let repo = SoinRepository::new(db.inner().clone());
    repo.create(soin).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_soins(
    page: Option<u32>,
    perPage: Option<u32>,
    nomSearch: Option<String>,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<PaginatedSoin, String> {
    let repo = SoinRepository::new(db.inner().clone());
    let page = page.unwrap_or(1);
    let per_page = perPage.unwrap_or(10);
    
    // Convert empty strings to None and handle the parameters properly
    let nom_search = nomSearch.as_ref().and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    });
    
    repo.get_all(page, per_page, nom_search).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_soin_by_id(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Soin, String> {
    let repo = SoinRepository::new(db.inner().clone());
    repo.get_by_id(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_soin(
    soin: UpdateSoin,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Soin, String> {
    let repo = SoinRepository::new(db.inner().clone());
    repo.update(soin).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_soin(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let repo = SoinRepository::new(db.inner().clone());
    repo.delete(id).await.map_err(|e| e.to_string())
}
