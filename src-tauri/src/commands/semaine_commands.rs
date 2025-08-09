use crate::models::{Semaine, CreateSemaine, UpdateSemaine};
use crate::repositories::semaine_repository::{SemaineRepository, SemaineRepositoryTrait};
use crate::services::semaine_service::{SemaineService, SemaineWithDetails};
use crate::database::DatabaseManager;
use std::sync::Arc;
use tauri::State;

/// Commande Tauri pour créer une nouvelle semaine
/// 
/// # Arguments
/// * `semaine` - Les données de la semaine à créer
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Semaine, String>` contenant la semaine créée ou une erreur
#[tauri::command]
pub async fn create_semaine(
    semaine: CreateSemaine,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Semaine, String> {
    let repository = SemaineRepository::new(db.inner().clone());
    
    repository.create(semaine)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour récupérer toutes les semaines
/// 
/// # Arguments
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Vec<Semaine>, String>` contenant toutes les semaines ou une erreur
#[tauri::command]
pub async fn get_all_semaines(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<Semaine>, String> {
    let repository = SemaineRepository::new(db.inner().clone());
    
    repository.get_all()
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour récupérer une semaine par son ID
/// 
/// # Arguments
/// * `id` - L'ID de la semaine
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Semaine, String>` contenant la semaine trouvée ou une erreur
#[tauri::command]
pub async fn get_semaine_by_id(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Semaine, String> {
    let repository = SemaineRepository::new(db.inner().clone());
    
    repository.get_by_id(id)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour récupérer toutes les semaines d'un bâtiment
/// 
/// # Arguments
/// * `batiment_id` - L'ID du bâtiment
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Vec<Semaine>, String>` contenant les semaines du bâtiment ou une erreur
#[tauri::command]
pub async fn get_semaines_by_batiment(
    batiment_id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<Semaine>, String> {
    let repository = SemaineRepository::new(db.inner().clone());
    
    repository.get_by_batiment(batiment_id)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour mettre à jour une semaine
/// 
/// # Arguments
/// * `semaine` - Les nouvelles données de la semaine
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Semaine, String>` contenant la semaine mise à jour ou une erreur
#[tauri::command]
pub async fn update_semaine(
    semaine: UpdateSemaine,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Semaine, String> {
    let repository = SemaineRepository::new(db.inner().clone());
    
    repository.update(semaine)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour supprimer une semaine
/// 
/// # Arguments
/// * `id` - L'ID de la semaine à supprimer
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<(), String>` indiquant le succès ou une erreur
#[tauri::command]
pub async fn delete_semaine(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let repository = SemaineRepository::new(db.inner().clone());
    
    repository.delete(id)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour récupérer toutes les semaines d'un bâtiment avec leurs suivis quotidiens
/// 
/// Cette commande utilise le service semaine pour créer automatiquement les 8 semaines
/// et leurs 7 suivis quotidiens respectifs s'ils n'existent pas.
/// 
/// # Arguments
/// * `batiment_id` - L'ID du bâtiment
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Vec<SemaineWithDetails>, String>` contenant les 8 semaines complètes
#[tauri::command]
pub async fn get_full_semaines_by_batiment(
    batiment_id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<SemaineWithDetails>, String> {
    let service = SemaineService::new(db.inner().clone());
    
    service.get_full_semaines_by_batiment(batiment_id)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour mettre à jour le poids d'une semaine
/// 
/// # Arguments
/// * `semaine_id` - L'ID de la semaine
/// * `poids` - Le nouveau poids
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Semaine, String>` contenant la semaine mise à jour
#[tauri::command]
pub async fn update_semaine_poids(
    semaine_id: i64,
    poids: Option<f64>,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Semaine, String> {
    let service = SemaineService::new(db.inner().clone());
    
    service.update_semaine_poids(semaine_id, poids)
        .await
        .map_err(|e| e.to_string())
}
