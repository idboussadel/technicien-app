use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;
use serde::{Deserialize, Serialize};

/// Check if there's an update available
#[tauri::command]
pub async fn check_for_updates(app_handle: AppHandle) -> Result<UpdateInfo, String> {
    let updater = app_handle.updater_builder().build()
        .map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            Ok(UpdateInfo {
                available: true,
                version: update.version,
                body: update.body.unwrap_or_default(),
                date: update.date.map(|d| d.to_string()).unwrap_or_default(),
            })
        }
        Ok(None) => {
            Ok(UpdateInfo {
                available: false,
                version: String::new(),
                body: String::new(),
                date: String::new(),
            })
        }
        Err(e) => {
            Err(format!("Erreur lors de la vérification des mises à jour: {}", e))
        }
    }
}

/// Download and install the update
#[tauri::command]
pub async fn install_update(app_handle: AppHandle) -> Result<(), String> {
    println!("🚀 [RUST] Starting update installation...");
    
    let updater = app_handle.updater_builder().build()
        .map_err(|e| {
            println!("❌ [RUST] Failed to build updater: {}", e);
            format!("Erreur lors de la construction de l'updater: {}", e)
        })?;
    
    println!("✅ [RUST] Updater built successfully");
    
    // First check for updates
    println!("🔍 [RUST] Checking for available updates...");
    let update = updater.check().await
        .map_err(|e| {
            println!("❌ [RUST] Failed to check for updates: {}", e);
            format!("Erreur lors de la vérification: {}", e)
        })?
        .ok_or_else(|| {
            println!("❌ [RUST] No update available");
            "Aucune mise à jour disponible".to_string()
        })?;
    
    println!("✅ [RUST] Update found: version {}", update.version);
    
    // Download the update
    println!("📥 [RUST] Starting download...");
    println!("📥 [RUST] Update version: {}", update.version);
    update.download(|_, _| {}, || {}).await
        .map_err(|e| {
            println!("❌ [RUST] Failed to download update: {}", e);
            println!("❌ [RUST] Error type: {:?}", std::any::type_name_of_val(&e));
            println!("❌ [RUST] Full error details: {:#?}", e);
            format!("Erreur lors du téléchargement: {}", e)
        })?;
    
    println!("✅ [RUST] Download completed successfully");
    
    // Install the update
    println!("🔧 [RUST] Starting installation...");
    update.install(&[])
        .map_err(|e| {
            println!("❌ [RUST] Failed to install update: {}", e);
            format!("Erreur lors de l'installation: {}", e)
        })?;
    
    println!("✅ [RUST] Installation completed successfully");
    println!("🎉 [RUST] Update process completed, app should restart automatically");
    
    Ok(())
}

/// Get update progress (Note: This would need proper implementation with event listeners)
#[tauri::command]
pub async fn get_update_progress(_app_handle: AppHandle) -> Result<UpdateProgress, String> {
    // This is a simplified implementation
    // For real progress tracking, you'd need to use event listeners
    Ok(UpdateProgress {
        status: "Vérification des mises à jour...".to_string(),
        progress: 50.0,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: String,
    pub body: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProgress {
    pub status: String,
    pub progress: f64,
}