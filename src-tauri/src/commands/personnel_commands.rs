use crate::database::DatabaseManager;
use crate::models::{Personnel, CreatePersonnel, UpdatePersonnel, PaginatedPersonnel};
use crate::repositories::{PersonnelRepository, PersonnelRepositoryTrait};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn create_personnel(
    personnel: CreatePersonnel,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Personnel, String> {
    let repo = PersonnelRepository::new(db.inner().clone());
    repo.create(personnel).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_personnel(
    page: Option<u32>,
    perPage: Option<u32>,
    nomSearch: Option<String>,
    teleSearch: Option<String>,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<PaginatedPersonnel, String> {
    let repo = PersonnelRepository::new(db.inner().clone());
    let page = page.unwrap_or(1);
    let per_page = perPage.unwrap_or(10);
    
    // Convert empty strings to None and handle the parameters properly
    let nom_search = nomSearch.as_ref().and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    });
    
    let tele_search = teleSearch.as_ref().and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    });
    
    repo.get_all(page, per_page, nom_search, tele_search).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_personnel(
    personnel: UpdatePersonnel,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Personnel, String> {
    let repo = PersonnelRepository::new(db.inner().clone());
    repo.update(personnel).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_personnel(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let repo = PersonnelRepository::new(db.inner().clone());
    repo.delete(id).await.map_err(|e| e.to_string())
}
