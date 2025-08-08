use crate::database::DatabaseManager;
use crate::models::alimentation::{AlimentationHistory, CreateAlimentationHistory, UpdateAlimentationHistory};
use crate::repositories::AlimentationRepository;
use tauri::State;

/// Create a new alimentation history record
#[tauri::command]
pub async fn create_alimentation_history(
    database: State<'_, DatabaseManager>,
    alimentation_data: CreateAlimentationHistory,
) -> Result<AlimentationHistory, String> {
    let conn = database.get_connection().map_err(|e| e.to_string())?;
    AlimentationRepository::create(&conn, &alimentation_data).map_err(|e| e.to_string())
}

/// Get all alimentation history for a specific bande
#[tauri::command]
pub async fn get_alimentation_history_by_bande(
    database: State<'_, DatabaseManager>,
    bande_id: i64,
) -> Result<Vec<AlimentationHistory>, String> {
    let conn = database.get_connection().map_err(|e| e.to_string())?;
    AlimentationRepository::get_by_bande(&conn, bande_id).map_err(|e| e.to_string())
}

/// Get a specific alimentation history record by ID
#[tauri::command]
pub async fn get_alimentation_history_by_id(
    database: State<'_, DatabaseManager>,
    id: i64,
) -> Result<Option<AlimentationHistory>, String> {
    let conn = database.get_connection().map_err(|e| e.to_string())?;
    AlimentationRepository::get_by_id(&conn, id).map_err(|e| e.to_string())
}

/// Update an alimentation history record
#[tauri::command]
pub async fn update_alimentation_history(
    database: State<'_, DatabaseManager>,
    id: i64,
    alimentation_data: UpdateAlimentationHistory,
) -> Result<(), String> {
    let conn = database.get_connection().map_err(|e| e.to_string())?;
    AlimentationRepository::update(&conn, id, &alimentation_data).map_err(|e| e.to_string())
}

/// Delete an alimentation history record
#[tauri::command]
pub async fn delete_alimentation_history(
    database: State<'_, DatabaseManager>,
    id: i64,
) -> Result<(), String> {
    let conn = database.get_connection().map_err(|e| e.to_string())?;
    AlimentationRepository::delete(&conn, id).map_err(|e| e.to_string())
}

/// Get the current alimentation contour for a specific bande
#[tauri::command]
pub async fn get_alimentation_contour(
    database: State<'_, DatabaseManager>,
    bande_id: i64,
) -> Result<f64, String> {
    let conn = database.get_connection().map_err(|e| e.to_string())?;
    AlimentationRepository::get_contour(&conn, bande_id).map_err(|e| e.to_string())
}
