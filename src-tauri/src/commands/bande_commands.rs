/// Tauri commands for managing bandes
/// 
/// This module provides command handlers for bande-related operations
/// in the farm management application with the new batiment structure.

use tauri::State;
use std::sync::Arc;
use crate::database::DatabaseManager;
use crate::models::{Bande, BandeWithDetails, CreateBande, UpdateBande, PaginatedBandes};
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

/// Get all bandes with their batiments (simple, non-paginated)
#[tauri::command]
pub async fn get_all_bandes(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<BandeWithDetails>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::get_all_list(&conn)
        .map_err(|e| e.to_string())
}

/// Get bandes by ferme with their batiments (simple, non-paginated)
#[tauri::command]
pub async fn get_bandes_by_ferme(
    db: State<'_, Arc<DatabaseManager>>,
    ferme_id: i64,
) -> Result<Vec<BandeWithDetails>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::get_by_ferme(&conn, ferme_id)
        .map_err(|e| e.to_string())
}

/// Get latest bandes by ferme (for selectors)
#[tauri::command]
pub async fn get_latest_bandes_by_ferme(
    db: State<'_, Arc<DatabaseManager>>,
    ferme_id: i64,
    limit: Option<u32>,
) -> Result<Vec<BandeWithDetails>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::get_latest_by_ferme(&conn, ferme_id, limit.unwrap_or(10))
        .map_err(|e| e.to_string())
}

/// Get bandes by ferme with pagination and optional date range filtering
#[tauri::command]
pub async fn get_bandes_by_ferme_paginated(
    db: State<'_, Arc<DatabaseManager>>,
    ferme_id: i64,
    page: u32,
    per_page: u32,
    date_from: Option<String>, // Format: "YYYY-MM-DD"
    date_to: Option<String>,   // Format: "YYYY-MM-DD"
) -> Result<PaginatedBandes, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::get_by_ferme_paginated(&conn, ferme_id, page, per_page, date_from, date_to)
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
    let mut conn = db.get_connection().map_err(|e| e.to_string())?;
    
    BandeRepository::delete(&mut conn, id)
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
