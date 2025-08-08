use crate::database::DatabaseManager;
use crate::models::{Maladie, CreateMaladie, UpdateMaladie, PaginatedMaladies};
use crate::repositories::{MaladieRepository, MaladieRepositoryTrait};
use std::sync::Arc;

pub struct MaladieService {
    repository: Arc<MaladieRepository>,
}

impl MaladieService {
    pub fn new(db_manager: Arc<DatabaseManager>) -> Self {
        Self { 
            repository: Arc::new(MaladieRepository::new(db_manager)),
        }
    }

    /// Creates a new maladie
    pub async fn create_maladie(&self, maladie: CreateMaladie) -> Result<Maladie, String> {
        // Validate input
        if maladie.nom.trim().is_empty() {
            return Err("Le nom de la maladie ne peut pas être vide".to_string());
        }

        if maladie.nom.len() > 255 {
            return Err("Le nom de la maladie ne peut pas dépasser 255 caractères".to_string());
        }

        // Check if maladie with same name already exists
        if let Ok(existing_maladies) = self.repository.get_maladies_list().await {
            if existing_maladies.iter().any(|m| m.nom.to_lowercase() == maladie.nom.trim().to_lowercase()) {
                return Err("Une maladie avec ce nom existe déjà".to_string());
            }
        }

        self.repository.create(maladie).await
            .map_err(|e| format!("Erreur lors de la création de la maladie: {}", e))
    }

    /// Gets all maladies with pagination and search
    pub async fn get_maladies(&self, page: u32, per_page: u32, nom_search: Option<String>) -> Result<PaginatedMaladies, String> {
        self.repository.get_maladies(page, per_page, nom_search.as_deref()).await
            .map_err(|e| format!("Erreur lors de la récupération des maladies: {}", e))
    }

    /// Gets all maladies as a simple list (without pagination)
    pub async fn get_maladies_list(&self) -> Result<Vec<Maladie>, String> {
        self.repository.get_maladies_list().await
            .map_err(|e| format!("Erreur lors de la récupération des maladies: {}", e))
    }

    /// Updates a maladie
    pub async fn update_maladie(&self, maladie: UpdateMaladie) -> Result<Maladie, String> {
        // Validate input
        if maladie.nom.trim().is_empty() {
            return Err("Le nom de la maladie ne peut pas être vide".to_string());
        }

        if maladie.nom.len() > 255 {
            return Err("Le nom de la maladie ne peut pas dépasser 255 caractères".to_string());
        }

        // Check if another maladie with same name already exists (excluding current one)
        if let Ok(existing_maladies) = self.repository.get_maladies_list().await {
            if existing_maladies.iter().any(|m| m.id != maladie.id && m.nom.to_lowercase() == maladie.nom.trim().to_lowercase()) {
                return Err("Une autre maladie avec ce nom existe déjà".to_string());
            }
        }

        self.repository.update(maladie).await
            .map_err(|e| format!("Erreur lors de la mise à jour de la maladie: {}", e))
    }

    /// Deletes a maladie
    pub async fn delete_maladie(&self, id: i64) -> Result<(), String> {
        self.repository.delete(id).await
            .map_err(|e| format!("Erreur lors de la suppression de la maladie: {}", e))
    }
}
