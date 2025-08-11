use crate::models::{SuiviQuotidien, SuiviQuotidienWithDetails, CreateSuiviQuotidien, UpdateSuiviQuotidien};
use crate::repositories::suivi_quotidien_repository::{SuiviQuotidienRepository, SuiviQuotidienRepositoryTrait};
use crate::database::DatabaseManager;
use std::sync::Arc;
use tauri::State;

/// Commande Tauri pour créer un nouveau suivi quotidien
/// 
/// # Arguments
/// * `suivi` - Les données du suivi quotidien à créer
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<SuiviQuotidien, String>` contenant le suivi créé ou une erreur
#[tauri::command]
pub async fn create_suivi_quotidien(
    suivi: CreateSuiviQuotidien,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<SuiviQuotidien, String> {
    let repository = SuiviQuotidienRepository::new(db.inner().clone());
    
    repository.create(suivi)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour récupérer tous les suivis quotidiens
/// 
/// # Arguments
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Vec<SuiviQuotidienWithDetails>, String>` contenant tous les suivis ou une erreur
#[tauri::command]
pub async fn get_all_suivi_quotidien(
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<SuiviQuotidienWithDetails>, String> {
    let repository = SuiviQuotidienRepository::new(db.inner().clone());
    
    repository.get_all()
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour récupérer un suivi quotidien par son ID
/// 
/// # Arguments
/// * `id` - L'ID du suivi quotidien
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<SuiviQuotidienWithDetails, String>` contenant le suivi trouvé ou une erreur
#[tauri::command]
pub async fn get_suivi_quotidien_by_id(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<SuiviQuotidienWithDetails, String> {
    let repository = SuiviQuotidienRepository::new(db.inner().clone());
    
    repository.get_by_id(id)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour récupérer tous les suivis quotidiens d'une semaine
/// 
/// # Arguments
/// * `semaine_id` - L'ID de la semaine
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<Vec<SuiviQuotidienWithDetails>, String>` contenant les suivis de la semaine ou une erreur
#[tauri::command]
pub async fn get_suivi_quotidien_by_semaine(
    semaine_id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Vec<SuiviQuotidienWithDetails>, String> {
    let repository = SuiviQuotidienRepository::new(db.inner().clone());
    
    repository.get_by_semaine(semaine_id)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour mettre à jour un suivi quotidien
/// 
/// # Arguments
/// * `suivi` - Les nouvelles données du suivi quotidien
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<SuiviQuotidien, String>` contenant le suivi mis à jour ou une erreur
#[tauri::command]
pub async fn update_suivi_quotidien(
    suivi: UpdateSuiviQuotidien,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<SuiviQuotidien, String> {
    let repository = SuiviQuotidienRepository::new(db.inner().clone());
    
    repository.update(suivi)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour supprimer un suivi quotidien
/// 
/// # Arguments
/// * `id` - L'ID du suivi quotidien à supprimer
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<(), String>` indiquant le succès ou une erreur
#[tauri::command]
pub async fn delete_suivi_quotidien(
    id: i64,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let repository = SuiviQuotidienRepository::new(db.inner().clone());
    
    repository.delete(id)
        .await
        .map_err(|e| e.to_string())
}

/// Commande Tauri pour créer ou mettre à jour un suivi quotidien
/// 
/// Cette commande implémente la logique "lazy creation" pour les suivis quotidiens:
/// - Si un suivi existe déjà pour la semaine et l'âge donnés, elle le met à jour
/// - Si aucun suivi n'existe, elle en crée un nouveau avec la valeur fournie
/// 
/// Cette approche évite de créer des milliers d'enregistrements vides lors de la
/// création des semaines, et ne crée les suivis qu'au moment où l'utilisateur
/// commence à saisir des données.
/// 
/// # Arguments
/// * `semaine_id` - L'ID de la semaine
/// * `age` - L'âge en jours
/// * `field` - Le champ à mettre à jour
/// * `value` - La nouvelle valeur (sous forme de chaîne)
/// * `db` - L'état de la base de données
/// 
/// # Returns
/// Un `Result<SuiviQuotidien, String>` contenant le suivi créé/mis à jour ou une erreur
#[tauri::command]
pub async fn upsert_suivi_quotidien_field(
    semaine_id: i64,
    age: i32,
    field: String,
    value: String,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<SuiviQuotidien, String> {
    let repository = SuiviQuotidienRepository::new(db.inner().clone());
    
    // D'abord, vérifier que la semaine existe et récupérer la bande_id
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    
    let (semaine_exists, bande_id): (i64, i64) = conn.query_row(
        "SELECT COUNT(*), COALESCE(MAX(s.batiment_id), 0) as batiment_id
         FROM semaines s 
         WHERE s.id = ?1",
        [semaine_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    if semaine_exists == 0 {
        return Err(format!("La semaine avec l'ID {} n'existe pas", semaine_id));
    }

    // Récupérer la bande_id à partir du batiment_id
    let bande_id: i64 = conn.query_row(
        "SELECT bande_id FROM batiments b 
         JOIN semaines s ON s.batiment_id = b.id 
         WHERE s.id = ?1",
        [semaine_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    let existing_id: Option<i64> = match conn.query_row(
        "SELECT id FROM suivi_quotidien WHERE semaine_id = ?1 AND age = ?2",
        [semaine_id, age as i64],
        |row| row.get(0),
    ) {
        Ok(id) => Some(id),
        Err(rusqlite::Error::QueryReturnedNoRows) => None,
        Err(e) => return Err(e.to_string()),
    };
    
    if let Some(id) = existing_id {
        // Mettre à jour l'enregistrement existant
        let current = repository.get_by_id(id).await.map_err(|e| e.to_string())?;
        
        let mut update_suivi = UpdateSuiviQuotidien {
            id,
            semaine_id: current.semaine_id,
            age: current.age,
            deces_par_jour: current.deces_par_jour,
            alimentation_par_jour: current.alimentation_par_jour,
            soins_id: current.soins_id,
            soins_quantite: current.soins_quantite,
            analyses: current.analyses,
            remarques: current.remarques,
        };
        
        // Mettre à jour le champ spécifique et gérer alimentation_contour
        match field.as_str() {
            "deces_par_jour" => update_suivi.deces_par_jour = value.parse().ok(),
            "alimentation_par_jour" => {
                let old_value = current.alimentation_par_jour.unwrap_or(0.0);
                let new_value: f64 = value.parse().unwrap_or(0.0);
                
                // Calculer la différence pour ajuster alimentation_contour (sachets × 50 kg)
                let difference_sachets = new_value - old_value;
                let difference_kg = difference_sachets * 50.0;
                
                // Mettre à jour le suivi quotidien
                update_suivi.alimentation_par_jour = if value.is_empty() { None } else { Some(new_value) };
                
                // Mettre à jour alimentation_contour (soustraire la différence en kg car on consomme)
                if difference_kg != 0.0 {
                    conn.execute(
                        "UPDATE bandes SET alimentation_contour = alimentation_contour - ?1 WHERE id = ?2",
                        rusqlite::params![difference_kg, bande_id],
                    ).map_err(|e| e.to_string())?;
                }
            },
            "soins_id" => {
                if value.is_empty() {
                    update_suivi.soins_id = None;
                } else {
                    // Vérifier que le soin existe avant de l'assigner
                    if let Ok(soin_id) = value.parse::<i64>() {
                        let soin_exists: i64 = conn.query_row(
                            "SELECT COUNT(*) FROM soins WHERE id = ?1",
                            [soin_id],
                            |row| row.get(0),
                        ).map_err(|e| e.to_string())?;
                        
                        if soin_exists > 0 {
                            update_suivi.soins_id = Some(soin_id);
                        } else {
                            return Err(format!("Le soin avec l'ID {} n'existe pas", soin_id));
                        }
                    } else {
                        update_suivi.soins_id = None;
                    }
                }
            },
            "soins_quantite" => update_suivi.soins_quantite = if value.is_empty() { None } else { Some(value) },
            "analyses" => update_suivi.analyses = if value.is_empty() { None } else { Some(value) },
            "remarques" => update_suivi.remarques = if value.is_empty() { None } else { Some(value) },
            _ => return Err(format!("Champ inconnu: {}", field)),
        }
        
        repository.update(update_suivi)
            .await
            .map_err(|e| e.to_string())
    } else {
        // Créer un nouvel enregistrement
        let mut create_suivi = CreateSuiviQuotidien {
            semaine_id,
            age,
            deces_par_jour: None,
            alimentation_par_jour: None,
            soins_id: None,
            soins_quantite: None,
            analyses: None,
            remarques: None,
        };
        
        // Définir le champ spécifique
        match field.as_str() {
            "deces_par_jour" => create_suivi.deces_par_jour = value.parse().ok(),
            "alimentation_par_jour" => {
                let new_value: f64 = value.parse().unwrap_or(0.0);
                
                // Mettre à jour le suivi quotidien
                create_suivi.alimentation_par_jour = if value.is_empty() { None } else { Some(new_value) };
                
                // Mettre à jour alimentation_contour (soustraire en kg: sachets × 50 kg)
                if new_value > 0.0 {
                    let kg_value = new_value * 50.0;
                    conn.execute(
                        "UPDATE bandes SET alimentation_contour = alimentation_contour - ?1 WHERE id = ?2",
                        rusqlite::params![kg_value, bande_id],
                    ).map_err(|e| e.to_string())?;
                }
            },
            "soins_id" => {
                if value.is_empty() {
                    create_suivi.soins_id = None;
                } else {
                    // Vérifier que le soin existe avant de l'assigner
                    if let Ok(soin_id) = value.parse::<i64>() {
                        let soin_exists: i64 = conn.query_row(
                            "SELECT COUNT(*) FROM soins WHERE id = ?1",
                            [soin_id],
                            |row| row.get(0),
                        ).map_err(|e| e.to_string())?;
                        
                        if soin_exists > 0 {
                            create_suivi.soins_id = Some(soin_id);
                        } else {
                            return Err(format!("Le soin avec l'ID {} n'existe pas", soin_id));
                        }
                    } else {
                        create_suivi.soins_id = None;
                    }
                }
            },
            "soins_quantite" => create_suivi.soins_quantite = if value.is_empty() { None } else { Some(value) },
            "analyses" => create_suivi.analyses = if value.is_empty() { None } else { Some(value) },
            "remarques" => create_suivi.remarques = if value.is_empty() { None } else { Some(value) },
            _ => return Err(format!("Champ inconnu: {}", field)),
        }
        
        repository.create(create_suivi)
            .await
            .map_err(|e| e.to_string())
    }
}
