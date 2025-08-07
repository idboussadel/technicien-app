/// Tauri commands for managing bandes
/// 
/// This module provides command handlers for bande-related operations
/// in the farm management application with the new batiment structure.

use tauri::State;
use std::sync::Arc;
use crate::database::DatabaseManager;
use crate::models::{Bande, BandeWithDetails, CreateBande, UpdateBande};
use crate::repositories::BandeRepository;

/// Create a new bande
#[tauri::command]
pub async fn create_bande(
    db: State<'_, Arc<DatabaseManager>>,
    bande: CreateBande,
) -> Result<Bande, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::create(&conn, &bande)
        .map_err(|e| e.to_string())
}

/// Get all bandes with their batiments
#[tauri::command]
pub async fn get_all_bandes(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<BandeWithDetails>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::get_all(&conn)
        .map_err(|e| e.to_string())
}

/// Get bandes by ferme with their batiments
#[tauri::command]
pub async fn get_bandes_by_ferme(
    db: State<'_, Arc<DatabaseManager>>,
    ferme_id: i64,
) -> Result<Vec<BandeWithDetails>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::get_by_ferme(&conn, ferme_id)
        .map_err(|e| e.to_string())
}

/// Get a bande by ID with its batiments
#[tauri::command]
pub async fn get_bande_by_id(
    db: State<'_, Arc<DatabaseManager>>,
    id: i64,
) -> Result<Option<BandeWithDetails>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::get_by_id(&conn, id)
        .map_err(|e| e.to_string())
}

/// Update a bande
#[tauri::command]
pub async fn update_bande(
    db: State<'_, Arc<DatabaseManager>>,
    id: i64,
    bande: UpdateBande,
) -> Result<(), String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::update(&conn, id, &bande)
        .map_err(|e| e.to_string())
}

/// Delete a bande (will cascade delete batiments)
#[tauri::command]
pub async fn delete_bande(
    db: State<'_, Arc<DatabaseManager>>,
    id: i64,
) -> Result<(), String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::delete(&conn, id)
        .map_err(|e| e.to_string())
}

/// Get available batiment numbers for a ferme
#[tauri::command]
pub async fn get_available_batiments(
    db: State<'_, Arc<DatabaseManager>>,
    ferme_id: i64,
) -> Result<Vec<String>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::get_available_batiments(&conn, ferme_id)
        .map_err(|e| e.to_string())
}
