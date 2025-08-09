use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{
    Bande, BandeWithDetails, CreateBande, UpdateBande,
    Batiment, CreateBatiment,
    Semaine, CreateSemaine,
    SuiviQuotidien, CreateSuiviQuotidien
};
use crate::repositories::{
    BandeRepository,
    BatimentRepository,
    SemaineRepository, SemaineRepositoryTrait,
    SuiviQuotidienRepository, SuiviQuotidienRepositoryTrait
};
use std::sync::Arc;

/// Service pour la gestion des bandes avec création automatique des semaines et suivi quotidien
/// 
/// Ce service encapsule la logique métier complexe pour créer une bande
/// avec ses bâtiments, semaines et suivi quotidien.
pub struct BandeService {
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
        let semaine_repo = Arc::new(SemaineRepository::new(db.clone()));
        let suivi_repo = Arc::new(SuiviQuotidienRepository::new(db.clone()));
        
        Self { 
            semaine_repo,
            suivi_repo,
            db,
        }
    }

    /// Crée une nouvelle bande avec sa première semaine et 7 jours de suivi
    /// 
    /// # Arguments
    /// * `create_bande` - Les données de la bande à créer
    /// * `batiments` - Liste des bâtiments à créer pour cette bande
    /// 
    /// # Returns
    /// La bande créée avec son ID généré
    /// 
    /// # Business Logic
    /// 1. Valide les données de la bande
    /// 2. Crée la bande en base
    /// 3. Crée les bâtiments associés
    /// 4. Pour chaque bâtiment, crée automatiquement la semaine 1
    /// 5. Crée automatiquement 7 jours de suivi quotidien (âges 1-7) pour chaque bâtiment
    pub async fn create_bande_with_batiments_and_first_week(
        &self, 
        create_bande: CreateBande,
        batiments: Vec<CreateBatiment>
    ) -> AppResult<Bande> {
        // Validation des données
        if batiments.is_empty() {
            return Err(AppError::validation_error(
                "batiments",
                "Au moins un bâtiment doit être spécifié"
            ));
        }

        // Utiliser une transaction pour garantir la cohérence
        let conn = self.db.get_connection()?;
        let tx = conn.unchecked_transaction()?;

        // 1. Créer la bande
        let bande = BandeRepository::create(&conn, &create_bande)?;
        let bande_id = bande.id.ok_or_else(|| {
            AppError::business_logic("La bande créée n'a pas d'ID")
        })?;

        // 2. Créer chaque bâtiment
        for mut batiment_data in batiments {
            batiment_data.bande_id = bande_id;
            
            // Validation des données du bâtiment
            if batiment_data.quantite <= 0 {
                return Err(AppError::validation_error(
                    "quantite",
                    "La quantité doit être supérieure à 0"
                ));
            }

            if batiment_data.numero_batiment.trim().is_empty() {
                return Err(AppError::validation_error(
                    "numero_batiment",
                    "Le numéro de bâtiment ne peut pas être vide"
                ));
            }

            if batiment_data.poussin_id < 0 {
                return Err(AppError::validation_error(
                    "poussin_id",
                    "Un poussin valide doit être sélectionné"
                ));
            }

            let batiment = BatimentRepository::create(&conn, &batiment_data)?;
            let batiment_id = batiment.id.ok_or_else(|| {
                AppError::business_logic("Le bâtiment créé n'a pas d'ID")
            })?;

            // 3. Créer la première semaine pour ce bâtiment
            let create_semaine = CreateSemaine {
                batiment_id,
                numero_semaine: 1,
                poids: None, // Sera rempli plus tard
            };

            let semaine = self.semaine_repo.create(create_semaine).await?;
            let semaine_id = semaine.id.ok_or_else(|| {
                AppError::business_logic("La semaine créée n'a pas d'ID")
            })?;

            // 4. Créer les 7 jours de suivi quotidien pour cette semaine
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
        }

        // Valider la transaction
        tx.commit()?;

        Ok(bande)
    }

    /// Récupère toutes les bandes avec leurs détails
    pub async fn get_all_bandes(&self) -> AppResult<Vec<BandeWithDetails>> {
        let conn = self.db.get_connection()?;
        BandeRepository::get_all_list(&conn).map_err(AppError::from)
    }

    /// Récupère une bande par son ID
    pub async fn get_bande_by_id(&self, id: i64) -> AppResult<Option<BandeWithDetails>> {
        if id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        let conn = self.db.get_connection()?;
        BandeRepository::get_by_id(&conn, id).map_err(AppError::from)
    }

    /// Récupère toutes les bandes d'une ferme
    pub async fn get_bandes_by_ferme(&self, ferme_id: i64) -> AppResult<Vec<BandeWithDetails>> {
        if ferme_id <= 0 {
            return Err(AppError::validation_error(
                "ferme_id",
                "L'ID de la ferme doit être un nombre positif"
            ));
        }

        let conn = self.db.get_connection()?;
        BandeRepository::get_by_ferme(&conn, ferme_id).map_err(AppError::from)
    }

    /// Met à jour une bande existante
    pub async fn update_bande(&self, id: i64, update_bande: UpdateBande) -> AppResult<()> {
        // Validation des données
        if id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        let conn = self.db.get_connection()?;
        BandeRepository::update(&conn, id, &update_bande).map_err(AppError::from)
    }

    /// Supprime une bande et toutes ses données associées
    pub async fn delete_bande(&self, id: i64) -> AppResult<()> {
        if id <= 0 {
            return Err(AppError::validation_error(
                "id",
                "L'ID doit être un nombre positif"
            ));
        }

        let conn = self.db.get_connection()?;
        
        // Vérifier que la bande existe
        let bande = BandeRepository::get_by_id(&conn, id)?;
        if bande.is_none() {
            return Err(AppError::not_found("Bande", id));
        }

        // La suppression cascade est gérée par les contraintes FK
        BandeRepository::delete(&conn, id).map_err(AppError::from)
    }
}
