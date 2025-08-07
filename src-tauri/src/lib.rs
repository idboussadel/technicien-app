/// Modules for the farm management application
mod models;
mod error;
mod database;
mod repositories;
mod services;
mod commands;

use std::sync::Arc;
use tauri::Manager;
use database::DatabaseManager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let app_dir = app.path().app_data_dir().expect("Failed to get app data directory");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
            
            let db_path = app_dir.join("farm_management.db");
            let db_manager = Arc::new(
                DatabaseManager::new(&db_path)
                    .expect("Failed to initialize database")
            );
            
            // Initialize database schema
            db_manager.initialize_schema()
                .expect("Failed to initialize database schema");
            
            // Store database manager in app state
            app.manage(db_manager);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // Auth commands
            commands::register_user,
            commands::login_user,
            commands::logout_user,
            commands::verify_token,
            commands::update_user_profile,
            commands::update_user_password,
            // Ferme commands
            commands::create_ferme,
            commands::get_all_fermes,
            commands::get_ferme_by_id,
            commands::update_ferme,
            commands::delete_ferme,
            commands::search_fermes,
            commands::get_ferme_statistics,
            // Personnel commands
            commands::create_personnel,
            commands::get_all_personnel,
            commands::get_personnel_list,
            commands::update_personnel,
            commands::delete_personnel,
            // Soin commands
            commands::create_soin,
            commands::get_all_soins,
            commands::get_soin_by_id,
            commands::update_soin,
            commands::delete_soin,
            // Bande commands
            commands::create_bande,
            commands::get_all_bandes,
            commands::get_bandes_by_ferme,
            commands::get_bande_by_id,
            commands::update_bande,
            commands::delete_bande,
            commands::get_available_batiments,
            // Batiment commands
            commands::create_batiment,
            commands::get_batiments_by_bande,
            commands::get_batiment_by_id,
            commands::update_batiment,
            commands::delete_batiment,
            commands::get_available_batiment_numbers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
