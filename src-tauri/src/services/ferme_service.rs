use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Ferme, CreateFerme, UpdateFerme};
use crate::repositories::{FermeRepository, FermeRepositoryTrait};
use std::sync::Arc;

/// Service pour la gestion des fermes
/// 
/// Ce service encapsule la logique métier pour les opérations
/// sur les fermes et sert d'interface entre les commandes Tauri
/// et la couche de données.
pub struct FermeService {
    repository: Arc<FermeRepository>,
}

impl FermeService {
    /// Crée une nouvelle instance du service ferme
    /// 
    /// # Arguments
    /// * `db` - Le gestionnaire de base de données partagé
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        let repository = Arc::new(FermeRepository::new(db));
        Self { repository }
    }

    /// Crée une nouvelle ferme avec validation métier
    /// 
    /// # Arguments
    /// * `ferme` - Les données de la ferme à créer
    /// 
    /// # Returns
    /// La ferme créée avec son ID généré
    pub async fn create_ferme(&self, ferme: CreateFerme) -> AppResult<Ferme> {
        // Validation métier supplémentaire
        if ferme.nom.len() < 2 {
            return Err(AppError::business_logic(
                "Le nom de la ferme doit contenir au moins 2 caractères"
            ));
        }

        if ferme.nom.len() > 100 {
            return Err(AppError::business_logic(
                "Le nom de la ferme ne peut pas dépasser 100 caractères"
            ));
        }

        // Nettoyer et normaliser le nom
        let cleaned_ferme = CreateFerme {
            nom: ferme.nom.trim().to_string(),
        };

        self.repository.create(cleaned_ferme).await
    }

    /// Récupère toutes les fermes
    /// 
    /// # Returns
    /// Une liste de toutes les fermes triées par nom
    pub async fn get_all_fermes(&self) -> AppResult<Vec<Ferme>> {
        self.repository.get_all().await
    }

    /// Récupère une ferme par son ID
    /// 
    /// # Arguments
    /// * `id` - L'ID de la ferme à récupérer
    /// 
    /// # Returns
    /// La ferme correspondante ou une erreur si non trouvée
    pub async fn get_ferme_by_id(&self, id: i64) -> AppResult<Ferme> {
        if id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        self.repository.get_by_id(id).await
    }

    /// Met à jour une ferme avec validation métier
    /// 
    /// # Arguments
    /// * `ferme` - Les nouvelles données de la ferme
    /// 
    /// # Returns
    /// La ferme mise à jour
    pub async fn update_ferme(&self, ferme: UpdateFerme) -> AppResult<Ferme> {
        // Validation métier
        if ferme.id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        if ferme.nom.len() < 2 {
            return Err(AppError::business_logic(
                "Le nom de la ferme doit contenir au moins 2 caractères"
            ));
        }

        if ferme.nom.len() > 100 {
            return Err(AppError::business_logic(
                "Le nom de la ferme ne peut pas dépasser 100 caractères"
            ));
        }

        // Nettoyer et normaliser le nom
        let cleaned_ferme = UpdateFerme {
            id: ferme.id,
            nom: ferme.nom.trim().to_string(),
        };

        self.repository.update(cleaned_ferme).await
    }

    /// Supprime une ferme avec vérifications métier
    /// 
    /// # Arguments
    /// * `id` - L'ID de la ferme à supprimer
    /// 
    /// # Returns
    /// Un résultat indiquant le succès ou l'échec
    pub async fn delete_ferme(&self, id: i64) -> AppResult<()> {
        if id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        // Vérifier que la ferme existe avant de tenter la suppression
        self.repository.get_by_id(id).await?;

        self.repository.delete(id).await
    }

    /// Recherche des fermes par nom
    /// 
    /// # Arguments
    /// * `nom` - Le nom ou partie du nom à rechercher
    /// 
    /// # Returns
    /// Une liste des fermes correspondant à la recherche
    pub async fn search_fermes(&self, nom: &str) -> AppResult<Vec<Ferme>> {
        if nom.trim().is_empty() {
            return Err(AppError::validation_error(
                "nom",
                "Le terme de recherche ne peut pas être vide"
            ));
        }

        if nom.len() < 2 {
            return Err(AppError::validation_error(
                "nom",
                "Le terme de recherche doit contenir au moins 2 caractères"
            ));
        }

        self.repository.search_by_name(nom.trim()).await
    }

    /// Obtient des statistiques sur les fermes
    /// 
    /// # Returns
    /// Un objet contenant les statistiques des fermes
    pub async fn get_ferme_statistics(&self) -> AppResult<FermeStatistics> {
        let fermes = self.repository.get_all().await?;
        
        Ok(FermeStatistics {
            total_fermes: fermes.len() as i32,
            // TODO: Ajouter plus de statistiques quand les bandes seront implémentées
            fermes_with_active_bandes: 0, // Placeholder
            average_bandes_per_ferme: 0.0, // Placeholder
        })
    }
}

/// Statistiques des fermes
/// 
/// Structure contenant diverses métriques sur les fermes
/// pour les tableaux de bord et rapports.
#[derive(Debug, serde::Serialize)]
pub struct FermeStatistics {
    pub total_fermes: i32,
    pub fermes_with_active_bandes: i32,
    pub average_bandes_per_ferme: f64,
}
