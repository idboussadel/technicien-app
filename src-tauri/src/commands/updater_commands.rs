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
        Err(e) => Err(format!("Erreur lors de la vérification des mises à jour: {}", e))
    }
}

/// Download and install the update
#[tauri::command]
pub async fn install_update(app_handle: AppHandle) -> Result<(), String> {
    let updater = app_handle.updater_builder().build()
        .map_err(|e| e.to_string())?;
    
    // First check for updates
    let update = updater.check().await
        .map_err(|e| format!("Erreur lors de la vérification: {}", e))?
        .ok_or("Aucune mise à jour disponible".to_string())?;
    
    // Download the update
    update.download(|_, _| {}, || {}).await
        .map_err(|e| format!("Erreur lors du téléchargement: {}", e))?;
    
    // Install the update
    update.install(&[])
        .map_err(|e| format!("Erreur lors de l'installation: {}", e))?;
    
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