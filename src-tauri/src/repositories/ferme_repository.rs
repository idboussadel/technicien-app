use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Ferme, CreateFerme, UpdateFerme};
use std::sync::Arc;

/// Trait pour les opérations sur les fermes
/// 
/// Définit l'interface pour toutes les opérations CRUD
/// sur les entités ferme dans le système.
pub trait FermeRepositoryTrait: Send + Sync {
    /// Crée une nouvelle ferme
    /// 
    /// # Arguments
    /// * `ferme` - Les données de la ferme à créer
    /// 
    /// # Returns
    /// La ferme créée avec son ID généré
    async fn create(&self, ferme: CreateFerme) -> AppResult<Ferme>;

    /// Récupère toutes les fermes
    /// 
    /// # Returns
    /// Une liste de toutes les fermes dans le système
    async fn get_all(&self) -> AppResult<Vec<Ferme>>;

    /// Récupère une ferme par son ID
    /// 
    /// # Arguments
    /// * `id` - L'ID de la ferme à récupérer
    /// 
    /// # Returns
    /// La ferme correspondante ou une erreur si non trouvée
    async fn get_by_id(&self, id: i64) -> AppResult<Ferme>;

    /// Met à jour une ferme existante
    /// 
    /// # Arguments
    /// * `ferme` - Les nouvelles données de la ferme
    /// 
    /// # Returns
    /// La ferme mise à jour
    async fn update(&self, ferme: UpdateFerme) -> AppResult<Ferme>;

    /// Supprime une ferme
    /// 
    /// # Arguments
    /// * `id` - L'ID de la ferme à supprimer
    /// 
    /// # Returns
    /// Un résultat indiquant le succès ou l'échec
    async fn delete(&self, id: i64) -> AppResult<()>;

    /// Recherche des fermes par nom (partiel)
    /// 
    /// # Arguments
    /// * `nom` - Le nom ou partie du nom à rechercher
    /// 
    /// # Returns
    /// Une liste des fermes correspondant à la recherche
    async fn search_by_name(&self, nom: &str) -> AppResult<Vec<Ferme>>;
}

/// Implémentation du repository pour les fermes
/// 
/// Utilise SQLite avec un pool de connexions pour
/// optimiser les performances et éviter les conflits.
pub struct FermeRepository {
    db: Arc<DatabaseManager>,
}

impl FermeRepository {
    /// Crée une nouvelle instance du repository
    /// 
    /// # Arguments
    /// * `db` - Le gestionnaire de base de données partagé
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }
}

impl FermeRepositoryTrait for FermeRepository {
    async fn create(&self, ferme: CreateFerme) -> AppResult<Ferme> {
        let conn = self.db.get_connection()?;
        
        // Validation des données d'entrée
        if ferme.nom.trim().is_empty() {
            return Err(AppError::validation_error(
                "nom", 
                "Le nom de la ferme ne peut pas être vide"
            ));
        }

        // Vérifier que le nom n'existe pas déjà
        let existing: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM fermes WHERE nom = ?1",
            [&ferme.nom],
            |row| row.get(0),
        );

        if let Ok(count) = existing {
            if count > 0 {
                return Err(AppError::validation_error(
                    "nom",
                    "Une ferme avec ce nom existe déjà"
                ));
            }
        }

        // Insertion de la nouvelle ferme
        conn.execute(
            "INSERT INTO fermes (nom) VALUES (?1)",
            [&ferme.nom],
        )?;

        let id = conn.last_insert_rowid();

        Ok(Ferme {
            id: Some(id),
            nom: ferme.nom,
        })
    }

    async fn get_all(&self) -> AppResult<Vec<Ferme>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare("SELECT id, nom FROM fermes ORDER BY nom")?;
        
        let fermes = stmt.query_map([], |row| {
            Ok(Ferme {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(fermes)
    }

    async fn get_by_id(&self, id: i64) -> AppResult<Ferme> {
        let conn = self.db.get_connection()?;
        
        let ferme = conn.query_row(
            "SELECT id, nom FROM fermes WHERE id = ?1",
            [id],
            |row| Ok(Ferme {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
            }),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Ferme", id),
            _ => AppError::from(e),
        })?;

        Ok(ferme)
    }

    async fn update(&self, ferme: UpdateFerme) -> AppResult<Ferme> {
        let conn = self.db.get_connection()?;
        
        // Validation des données d'entrée
        if ferme.nom.trim().is_empty() {
            return Err(AppError::validation_error(
                "nom", 
                "Le nom de la ferme ne peut pas être vide"
            ));
        }

        // Vérifier que le nom n'existe pas déjà pour une autre ferme
        let existing: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM fermes WHERE nom = ?1 AND id != ?2",
            [&ferme.nom, &ferme.id.to_string()],
            |row| row.get(0),
        );

        if let Ok(count) = existing {
            if count > 0 {
                return Err(AppError::validation_error(
                    "nom",
                    "Une autre ferme avec ce nom existe déjà"
                ));
            }
        }

        // Mise à jour de la ferme
        let rows_affected = conn.execute(
            "UPDATE fermes SET nom = ?1 WHERE id = ?2",
            [&ferme.nom, &ferme.id.to_string()],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Ferme", ferme.id));
        }

        Ok(Ferme {
            id: Some(ferme.id),
            nom: ferme.nom,
        })
    }

    async fn delete(&self, id: i64) -> AppResult<()> {
        let conn = self.db.get_connection()?;
        
        // Vérifier s'il y a des bandes liées à cette ferme
        let bande_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bandes WHERE ferme_id = ?1",
            [id],
            |row| row.get(0),
        )?;

        if bande_count > 0 {
            return Err(AppError::constraint_violation(
                "Impossible de supprimer la ferme car elle contient des bandes"
            ));
        }

        // Suppression de la ferme
        let rows_affected = conn.execute(
            "DELETE FROM fermes WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Ferme", id));
        }

        Ok(())
    }

    async fn search_by_name(&self, nom: &str) -> AppResult<Vec<Ferme>> {
        let conn = self.db.get_connection()?;
        
        let search_pattern = format!("%{}%", nom);
        let mut stmt = conn.prepare(
            "SELECT id, nom FROM fermes WHERE nom LIKE ?1 ORDER BY nom"
        )?;
        
        let fermes = stmt.query_map([search_pattern], |row| {
            Ok(Ferme {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(fermes)
    }
}
