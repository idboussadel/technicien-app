/// Tauri commands for managing batiments
/// 
/// This module provides command handlers for batiment-related operations
/// in the farm management application.

use tauri::State;
use std::sync::Arc;
use crate::database::DatabaseManager;
use crate::models::{Batiment, CreateBatiment, UpdateBatiment, BatimentWithDetails};
use crate::repositories::BatimentRepository;

/// Create a new batiment
#[tauri::command]
pub async fn create_batiment(
    db: State<'_, Arc<DatabaseManager>>,
    batiment: CreateBatiment,
) -> Result<Batiment, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BatimentRepository::create(&conn, &batiment)
        .map_err(|e| e.to_string())
}

/// Get all batiments for a specific bande
#[tauri::command]
pub async fn get_batiments_by_bande(
    db: State<'_, Arc<DatabaseManager>>,
    bande_id: i64,
) -> Result<Vec<BatimentWithDetails>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BatimentRepository::get_by_bande(&conn, bande_id)
        .map_err(|e| e.to_string())
}

/// Get a batiment by ID
#[tauri::command]
pub async fn get_batiment_by_id(
    db: State<'_, Arc<DatabaseManager>>,
    id: i64,
) -> Result<Option<BatimentWithDetails>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BatimentRepository::get_by_id(&conn, id)
        .map_err(|e| e.to_string())
}

/// Update a batiment
#[tauri::command]
pub async fn update_batiment(
    db: State<'_, Arc<DatabaseManager>>,
    id: i64,
    batiment: UpdateBatiment,
) -> Result<(), String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BatimentRepository::update(&conn, id, &batiment)
        .map_err(|e| e.to_string())
}

/// Delete a batiment
#[tauri::command]
pub async fn delete_batiment(
    db: State<'_, Arc<DatabaseManager>>,
    id: i64,
) -> Result<(), String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BatimentRepository::delete(&conn, id)
        .map_err(|e| e.to_string())
}

/// Get available batiment numbers for a ferme (used for validation)
#[tauri::command]
pub async fn get_available_batiment_numbers(
    db: State<'_, Arc<DatabaseManager>>,
    ferme_id: i64,
) -> Result<Vec<String>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BatimentRepository::get_available_batiment_numbers(&conn, ferme_id)
        .map_err(|e| e.to_string())
}
