// Placeholder for soin commands - will be implemented next
use crate::database::DatabaseManager;
use crate::models::{Soin, CreateSoin, UpdateSoin};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn create_soin(
    _soin: CreateSoin,
    _db: State<'_, Arc<DatabaseManager>>,
) -> Result<Soin, String> {
    Err("Not implemented yet".to_string())
}

#[tauri::command]
pub async fn get_all_soins(
    _db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<Soin>, String> {
    Err("Not implemented yet".to_string())
}
