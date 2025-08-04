use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{
    Bande, BandeWithDetails, CreateBande, UpdateBande,
    Semaine, CreateSemaine,
    SuiviQuotidien, CreateSuiviQuotidien
};
use crate::repositories::{
    BandeRepository, BandeRepositoryTrait,
    SemaineRepository, SemaineRepositoryTrait,
    SuiviQuotidienRepository, SuiviQuotidienRepositoryTrait
};
use std::sync::Arc;

/// Service pour la gestion des bandes avec création automatique des semaines et suivi quotidien
/// 
/// Ce service encapsule la logique métier complexe pour créer une bande
/// avec sa première semaine et les 7 jours de suivi quotidien.
pub struct BandeService {
    bande_repo: Arc<BandeRepository>,
    semaine_repo: Arc<SemaineRepository>,
    suivi_repo: Arc<SuiviQuotidienRepository>,
    db: Arc<DatabaseManager>,
}

impl BandeService {
    /// Crée une nouvelle instance du service bande
    /// 
    /// # Arguments
    /// * `db` - Le gestionnaire de base de données partagé
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        let bande_repo = Arc::new(BandeRepository::new(db.clone()));
        let semaine_repo = Arc::new(SemaineRepository::new(db.clone()));
        let suivi_repo = Arc::new(SuiviQuotidienRepository::new(db.clone()));
        
        Self { 
            bande_repo,
            semaine_repo,
            suivi_repo,
            db,
        }
    }

    /// Crée une nouvelle bande avec sa première semaine et 7 jours de suivi
    /// 
    /// # Arguments
    /// * `create_bande` - Les données de la bande à créer
    /// 
    /// # Returns
    /// La bande créée avec son ID généré
    /// 
    /// # Business Logic
    /// 1. Valide les données de la bande
    /// 2. Crée la bande en base
    /// 3. Crée automatiquement la semaine 1
    /// 4. Crée automatiquement 7 jours de suivi quotidien (âges 1-7)
    pub async fn create_bande_with_first_week(&self, create_bande: CreateBande) -> AppResult<Bande> {
        // Validation des données
        if create_bande.quantite <= 0 {
            return Err(AppError::validation_error(
                "quantite",
                "La quantité doit être supérieure à 0"
            ));
        }

        if create_bande.numero_batiment.trim().is_empty() {
            return Err(AppError::validation_error(
                "numero_batiment",
                "Le numéro de bâtiment ne peut pas être vide"
            ));
        }

        if create_bande.type_poussin.trim().is_empty() {
            return Err(AppError::validation_error(
                "type_poussin",
                "Le type de poussin ne peut pas être vide"
            ));
        }

        // Utiliser une transaction pour garantir la cohérence
        let conn = self.db.get_connection()?;
        let tx = conn.unchecked_transaction()?;

        // 1. Créer la bande
        let bande = self.bande_repo.create(create_bande).await?;
        let bande_id = bande.id.ok_or_else(|| {
            AppError::business_logic("La bande créée n'a pas d'ID")
        })?;

        // 2. Créer la première semaine
        let create_semaine = CreateSemaine {
            bande_id,
            numero_semaine: 1,
            poids: None, // Sera rempli plus tard
        };

        let semaine = self.semaine_repo.create(create_semaine).await?;
        let semaine_id = semaine.id.ok_or_else(|| {
            AppError::business_logic("La semaine créée n'a pas d'ID")
        })?;

        // 3. Créer les 7 jours de suivi quotidien
        for age in 1..=7 {
            let create_suivi = CreateSuiviQuotidien {
                semaine_id,
                age,
                deces_par_jour: None,
                deces_total: None,
                alimentation_par_jour: None,
                alimentation_total: None,
                soins_id: None,
                soins_quantite: None,
                analyses: None,
                remarques: None,
            };

            self.suivi_repo.create(create_suivi).await?;
        }

        // Valider la transaction
        tx.commit()?;

        Ok(bande)
    }

    /// Récupère toutes les bandes avec leurs détails
    pub async fn get_all_bandes(&self) -> AppResult<Vec<BandeWithDetails>> {
        self.bande_repo.get_all().await
    }

    /// Récupère une bande par son ID
    pub async fn get_bande_by_id(&self, id: i64) -> AppResult<BandeWithDetails> {
        if id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        self.bande_repo.get_by_id(id).await
    }

    /// Récupère toutes les bandes d'une ferme
    pub async fn get_bandes_by_ferme(&self, ferme_id: i64) -> AppResult<Vec<BandeWithDetails>> {
        if ferme_id <= 0 {
            return Err(AppError::validation_error(
                "ferme_id",
                "L'ID de la ferme doit être un nombre positif"
            ));
        }

        self.bande_repo.get_by_ferme(ferme_id).await
    }

    /// Met à jour une bande existante
    pub async fn update_bande(&self, update_bande: UpdateBande) -> AppResult<Bande> {
        // Validation des données
        if update_bande.id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        if update_bande.quantite <= 0 {
            return Err(AppError::validation_error(
                "quantite",
                "La quantité doit être supérieure à 0"
            ));
        }

        if update_bande.numero_batiment.trim().is_empty() {
            return Err(AppError::validation_error(
                "numero_batiment",
                "Le numéro de bâtiment ne peut pas être vide"
            ));
        }

        if update_bande.type_poussin.trim().is_empty() {
            return Err(AppError::validation_error(
                "type_poussin",
                "Le type de poussin ne peut pas être vide"
            ));
        }

        self.bande_repo.update(update_bande).await
    }

    /// Supprime une bande et toutes ses données associées
    pub async fn delete_bande(&self, id: i64) -> AppResult<()> {
        if id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        // Vérifier que la bande existe
        self.bande_repo.get_by_id(id).await?;

        // La suppression cascade est gérée par les contraintes FK
        self.bande_repo.delete(id).await
    }
}
