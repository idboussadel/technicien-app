use crate::database::DatabaseManager;
use crate::models::{Bande, BandeWithDetails, CreateBande, UpdateBande};
use crate::repositories::{BandeRepository, BandeRepositoryTrait};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn create_bande(
    bande: CreateBande,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Bande, String> {
    let repo = BandeRepository::new(db.inner().clone());
    repo.create(bande).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_bandes(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<BandeWithDetails>, String> {
    let repo = BandeRepository::new(db.inner().clone());
    repo.get_all().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_bandes_by_ferme(
    ferme_id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<BandeWithDetails>, String> {
    let repo = BandeRepository::new(db.inner().clone());
    repo.get_by_ferme(ferme_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_bande_by_id(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<BandeWithDetails, String> {
    let repo = BandeRepository::new(db.inner().clone());
    repo.get_by_id(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_bande(
    bande: UpdateBande,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Bande, String> {
    let repo = BandeRepository::new(db.inner().clone());
    repo.update(bande).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_bande(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let repo = BandeRepository::new(db.inner().clone());
    repo.delete(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_available_batiments(
    ferme_id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<String>, String> {
    let repo = BandeRepository::new(db.inner().clone());
    repo.get_available_batiments(ferme_id).await.map_err(|e| e.to_string())
}
