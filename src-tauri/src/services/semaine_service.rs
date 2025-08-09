use crate::database::DatabaseManager;
use crate::error::AppResult;
use crate::models::{Semaine, CreateSemaine, SuiviQuotidienWithDetails};
use crate::repositories::semaine_repository::{SemaineRepository, SemaineRepositoryTrait};
use crate::repositories::suivi_quotidien_repository::{SuiviQuotidienRepository, SuiviQuotidienRepositoryTrait};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// Structure étendue d'une semaine avec ses suivis quotidiens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemaineWithDetails {
    pub id: Option<i64>,
    pub batiment_id: i64,
    pub numero_semaine: i32,
    pub poids: Option<f64>,
    pub suivi_quotidien: Vec<SuiviQuotidienWithDetails>,
}

/// Service pour la gestion des semaines avec logique métier complexe
pub struct SemaineService {
    db: Arc<DatabaseManager>,
}

impl SemaineService {
    /// Créer une nouvelle instance du service semaine
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }

    /// Récupère toutes les semaines d'un bâtiment avec leurs suivis quotidiens
    /// 
    /// Si certaines semaines n'existent pas (1-8), elles sont créées automatiquement.
    /// Pour chaque semaine, 7 suivis quotidiens sont générés (vides si non existants).
    /// 
    /// # Arguments
    /// * `batiment_id` - L'ID du bâtiment
    /// 
    /// # Returns
    /// Un `AppResult<Vec<SemaineWithDetails>>` contenant les 8 semaines complètes
    pub async fn get_full_semaines_by_batiment(&self, batiment_id: i64) -> AppResult<Vec<SemaineWithDetails>> {
        let semaine_repo = SemaineRepository::new(self.db.clone());
        let suivi_repo = SuiviQuotidienRepository::new(self.db.clone());
        
        // Récupérer les semaines existantes
        let existing_semaines = semaine_repo.get_by_batiment(batiment_id).await?;
        
        let mut result = Vec::new();
        
        // Créer un HashMap pour les semaines existantes pour une recherche plus efficace
        let mut semaines_map: HashMap<i32, Semaine> = HashMap::new();
        for semaine in existing_semaines {
            semaines_map.insert(semaine.numero_semaine, semaine);
        }
        
        // Créer ou récupérer les 8 semaines
        for numero_semaine in 1..=8 {
            let semaine = if let Some(existing) = semaines_map.get(&numero_semaine) {
                existing.clone()
            } else {
                // Créer une nouvelle semaine si elle n'existe pas
                let create_semaine = CreateSemaine {
                    batiment_id,
                    numero_semaine,
                    poids: None,
                };
                let new_semaine = semaine_repo.create(create_semaine).await?;
                // Ajouter à la map pour éviter les doublons
                semaines_map.insert(numero_semaine, new_semaine.clone());
                new_semaine
            };
            
            // Récupérer les suivis quotidiens existants pour cette semaine
            let mut suivis_quotidiens = Vec::new();
            
            if let Some(semaine_id) = semaine.id {
                let existing_suivis = suivi_repo.get_by_semaine(semaine_id).await?;
                
                // Créer 7 emplacements virtuels pour cette semaine (sans les créer en base)
                let start_age = (numero_semaine - 1) * 7 + 1;
                
                for day in 0..7 {
                    let age = start_age + day;
                    
                    // Chercher si un suivi existe déjà pour cet âge
                    let suivi = existing_suivis.iter()
                        .find(|s| s.age == age)
                        .cloned()
                        .unwrap_or_else(|| {
                            // Créer un suivi virtuel (pas encore en base de données)
                            SuiviQuotidienWithDetails {
                                id: None,
                                semaine_id: semaine_id,
                                age,
                                deces_par_jour: None,
                                deces_total: None,
                                alimentation_par_jour: None,
                                alimentation_total: None,
                                soins_id: None,
                                soins_nom: None,
                                soins_quantite: None,
                                analyses: None,
                                remarques: None,
                            }
                        });
                    
                    suivis_quotidiens.push(suivi);
                }
            }
            
            let semaine_with_details = SemaineWithDetails {
                id: semaine.id,
                batiment_id: semaine.batiment_id,
                numero_semaine: semaine.numero_semaine,
                poids: semaine.poids,
                suivi_quotidien: suivis_quotidiens,
            };
            
            result.push(semaine_with_details);
        }
        
        Ok(result)
    }

    /// Met à jour le poids d'une semaine
    /// 
    /// # Arguments
    /// * `semaine_id` - L'ID de la semaine
    /// * `poids` - Le nouveau poids
    /// 
    /// # Returns
    /// Un `AppResult<Semaine>` contenant la semaine mise à jour
    pub async fn update_semaine_poids(&self, semaine_id: i64, poids: Option<f64>) -> AppResult<Semaine> {
        let semaine_repo = SemaineRepository::new(self.db.clone());
        
        // Récupérer la semaine existante
        let existing_semaine = semaine_repo.get_by_id(semaine_id).await?;
        
        // Mettre à jour avec le nouveau poids
        let update_semaine = crate::models::UpdateSemaine {
            id: semaine_id,
            batiment_id: existing_semaine.batiment_id,
            numero_semaine: existing_semaine.numero_semaine,
            poids,
        };
        
        semaine_repo.update(update_semaine).await
    }

    /// Initialise toutes les semaines vides pour un bâtiment si elles n'existent pas
    /// 
    /// # Arguments
    /// * `batiment_id` - L'ID du bâtiment
    /// 
    /// # Returns
    /// Un `AppResult<Vec<Semaine>>` contenant les semaines créées/existantes
    pub async fn initialize_batiment_semaines(&self, batiment_id: i64) -> AppResult<Vec<Semaine>> {
        let semaine_repo = SemaineRepository::new(self.db.clone());
        
        // Vérifier quelles semaines existent déjà
        let existing_semaines = semaine_repo.get_by_batiment(batiment_id).await?;
        let mut result = existing_semaines.clone();
        
        // Créer les semaines manquantes
        for numero_semaine in 1..=8 {
            if !existing_semaines.iter().any(|s| s.numero_semaine == numero_semaine) {
                let create_semaine = CreateSemaine {
                    batiment_id,
                    numero_semaine,
                    poids: None,
                };
                
                let new_semaine = semaine_repo.create(create_semaine).await?;
                result.push(new_semaine);
            }
        }
        
        // Trier par numéro de semaine
        result.sort_by_key(|s| s.numero_semaine);
        
        Ok(result)
    }
}
