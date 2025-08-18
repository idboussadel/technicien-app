use crate::database::DatabaseManager;
use crate::models::{Ferme, CreateFerme, UpdateFerme};
use crate::services::{FermeService, FermeStatistics, FermeDetailedStatistics};
use crate::repositories::GlobalStatistics;
use std::sync::Arc;
use tauri::State;

/// Crée une nouvelle ferme
/// 
/// # Arguments
/// * `ferme` - Les données de la ferme à créer
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// La ferme créée avec son ID généré ou une erreur
#[tauri::command]
pub async fn create_ferme(
    ferme: CreateFerme,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Ferme, String> {
    let service = FermeService::new(db.inner().clone());
    service.create_ferme(ferme).await.map_err(|e| e.to_string())
}

/// Récupère toutes les fermes
/// 
/// # Arguments
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// Une liste de toutes les fermes ou une erreur
#[tauri::command]
pub async fn get_all_fermes(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<Ferme>, String> {
    let service = FermeService::new(db.inner().clone());
    service.get_all_fermes().await.map_err(|e| e.to_string())
}

/// Récupère une ferme par son ID
/// 
/// # Arguments
/// * `id` - L'ID de la ferme à récupérer
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// La ferme correspondante ou une erreur
#[tauri::command]
pub async fn get_ferme_by_id(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Ferme, String> {
    let service = FermeService::new(db.inner().clone());
    service.get_ferme_by_id(id).await.map_err(|e| e.to_string())
}

/// Met à jour une ferme existante
/// 
/// # Arguments
/// * `ferme` - Les nouvelles données de la ferme
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// La ferme mise à jour ou une erreur
#[tauri::command]
pub async fn update_ferme(
    ferme: UpdateFerme,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Ferme, String> {
    let service = FermeService::new(db.inner().clone());
    service.update_ferme(ferme).await.map_err(|e| e.to_string())
}

/// Supprime une ferme
/// 
/// # Arguments
/// * `id` - L'ID de la ferme à supprimer
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// Un succès vide ou une erreur
#[tauri::command]
pub async fn delete_ferme(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let service = FermeService::new(db.inner().clone());
    service.delete_ferme(id).await.map_err(|e| e.to_string())
}

/// Recherche des fermes par nom
/// 
/// # Arguments
/// * `nom` - Le nom ou partie du nom à rechercher
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// Une liste des fermes correspondant à la recherche ou une erreur
#[tauri::command]
pub async fn search_fermes(
    nom: String,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<Ferme>, String> {
    let service = FermeService::new(db.inner().clone());
    service.search_fermes(&nom).await.map_err(|e| e.to_string())
}

/// Obtient les statistiques des fermes
/// 
/// # Arguments
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// Les statistiques des fermes ou une erreur
#[tauri::command]
pub async fn get_ferme_statistics(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<FermeStatistics, String> {
    let service = FermeService::new(db.inner().clone());
    service.get_ferme_statistics().await.map_err(|e| e.to_string())
}

/// Obtient les statistiques détaillées d'une ferme spécifique
/// 
/// # Arguments
/// * `ferme_id` - L'ID de la ferme pour laquelle récupérer les statistiques
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// Les statistiques détaillées de la ferme ou une erreur
#[tauri::command]
pub async fn get_ferme_detailed_statistics(
    ferme_id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<FermeDetailedStatistics, String> {
    let service = FermeService::new(db.inner().clone());
    service.get_ferme_detailed_statistics(ferme_id).await.map_err(|e| e.to_string())
}

/// Obtient les statistiques globales de toutes les fermes
/// 
/// # Arguments
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// Les statistiques globales du système ou une erreur
#[tauri::command]
pub async fn get_global_statistics(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<GlobalStatistics, String> {
    let service = FermeService::new(db.inner().clone());
    service.get_global_statistics().await.map_err(|e| e.to_string())
}
