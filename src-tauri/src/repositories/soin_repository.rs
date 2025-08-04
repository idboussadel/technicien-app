use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Soin, CreateSoin, UpdateSoin};
use std::sync::Arc;

/// Trait pour les opérations sur les soins
/// 
/// Définit l'interface pour toutes les opérations CRUD
/// sur les entités soins dans le système.
pub trait SoinRepositoryTrait: Send + Sync {
    /// Crée un nouveau soin
    /// 
    /// # Arguments
    /// * `soin` - Les données du soin à créer
    /// 
    /// # Returns
    /// Le soin créé avec son ID généré
    async fn create(&self, soin: CreateSoin) -> AppResult<Soin>;

    /// Récupère tous les soins
    /// 
    /// # Returns
    /// Une liste de tous les soins dans le système
    async fn get_all(&self) -> AppResult<Vec<Soin>>;

    /// Récupère un soin par son ID
    /// 
    /// # Arguments
    /// * `id` - L'ID du soin à récupérer
    /// 
    /// # Returns
    /// Le soin correspondant ou une erreur si non trouvé
    async fn get_by_id(&self, id: i64) -> AppResult<Soin>;

    /// Met à jour un soin existant
    /// 
    /// # Arguments
    /// * `soin` - Les nouvelles données du soin
    /// 
    /// # Returns
    /// Le soin mis à jour
    async fn update(&self, soin: UpdateSoin) -> AppResult<Soin>;

    /// Supprime un soin
    /// 
    /// # Arguments
    /// * `id` - L'ID du soin à supprimer
    /// 
    /// # Returns
    /// Un résultat indiquant le succès ou l'échec
    async fn delete(&self, id: i64) -> AppResult<()>;

    /// Recherche des soins par nom (partiel)
    /// 
    /// # Arguments
    /// * `nom` - Le nom ou partie du nom à rechercher
    /// 
    /// # Returns
    /// Une liste des soins correspondant à la recherche
    async fn search_by_name(&self, nom: &str) -> AppResult<Vec<Soin>>;

    /// Récupère les soins les plus utilisés
    /// 
    /// # Arguments
    /// * `limit` - Nombre maximum de soins à retourner
    /// 
    /// # Returns
    /// Une liste des soins les plus fréquemment utilisés
    async fn get_most_used(&self, limit: i32) -> AppResult<Vec<Soin>>;
}

/// Implémentation du repository pour les soins
/// 
/// Utilise SQLite avec un pool de connexions pour
/// optimiser les performances et éviter les conflits.
pub struct SoinRepository {
    db: Arc<DatabaseManager>,
}

impl SoinRepository {
    /// Crée une nouvelle instance du repository
    /// 
    /// # Arguments
    /// * `db` - Le gestionnaire de base de données partagé
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }

    /// Valide une unité de mesure
    /// 
    /// # Arguments
    /// * `unite` - L'unité à valider
    /// 
    /// # Returns
    /// Un résultat indiquant si l'unité est valide
    fn validate_unit(&self, unite: &str) -> AppResult<()> {
        let valid_units = ["l", "ml", "kg", "g", "mg", "dose", "comprimé", "ml/l", "g/l"];
        
        if !valid_units.contains(&unite.to_lowercase().as_str()) {
            return Err(AppError::validation_error(
                "unite_defaut",
                "Unité non reconnue. Unités valides: l, ml, kg, g, mg, dose, comprimé, ml/l, g/l"
            ));
        }

        Ok(())
    }
}

impl SoinRepositoryTrait for SoinRepository {
    async fn create(&self, soin: CreateSoin) -> AppResult<Soin> {
        let conn = self.db.get_connection()?;
        
        // Validation des données d'entrée
        if soin.nom.trim().is_empty() {
            return Err(AppError::validation_error(
                "nom", 
                "Le nom du soin ne peut pas être vide"
            ));
        }

        if soin.unite_defaut.trim().is_empty() {
            return Err(AppError::validation_error(
                "unite_defaut", 
                "L'unité par défaut ne peut pas être vide"
            ));
        }

        self.validate_unit(&soin.unite_defaut)?;

        // Vérifier que le nom n'existe pas déjà
        let existing: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM soins WHERE nom = ?1",
            [&soin.nom],
            |row| row.get(0),
        );

        if let Ok(count) = existing {
            if count > 0 {
                return Err(AppError::validation_error(
                    "nom",
                    "Un soin avec ce nom existe déjà"
                ));
            }
        }

        // Insertion du nouveau soin
        conn.execute(
            "INSERT INTO soins (nom, unite_defaut) VALUES (?1, ?2)",
            [&soin.nom, &soin.unite_defaut],
        )?;

        let id = conn.last_insert_rowid();

        Ok(Soin {
            id: Some(id),
            nom: soin.nom,
            unite_defaut: soin.unite_defaut,
        })
    }

    async fn get_all(&self) -> AppResult<Vec<Soin>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare("SELECT id, nom, unite_defaut FROM soins ORDER BY nom")?;
        
        let soins = stmt.query_map([], |row| {
            Ok(Soin {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                unite_defaut: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(soins)
    }

    async fn get_by_id(&self, id: i64) -> AppResult<Soin> {
        let conn = self.db.get_connection()?;
        
        let soin = conn.query_row(
            "SELECT id, nom, unite_defaut FROM soins WHERE id = ?1",
            [id],
            |row| Ok(Soin {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                unite_defaut: row.get(2)?,
            }),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Soin", id),
            _ => AppError::from(e),
        })?;

        Ok(soin)
    }

    async fn update(&self, soin: UpdateSoin) -> AppResult<Soin> {
        let conn = self.db.get_connection()?;
        
        // Validation des données d'entrée
        if soin.nom.trim().is_empty() {
            return Err(AppError::validation_error(
                "nom", 
                "Le nom du soin ne peut pas être vide"
            ));
        }

        if soin.unite_defaut.trim().is_empty() {
            return Err(AppError::validation_error(
                "unite_defaut", 
                "L'unité par défaut ne peut pas être vide"
            ));
        }

        self.validate_unit(&soin.unite_defaut)?;

        // Vérifier que le nom n'existe pas déjà pour un autre soin
        let existing: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM soins WHERE nom = ?1 AND id != ?2",
            [&soin.nom, &soin.id.to_string()],
            |row| row.get(0),
        );

        if let Ok(count) = existing {
            if count > 0 {
                return Err(AppError::validation_error(
                    "nom",
                    "Un autre soin avec ce nom existe déjà"
                ));
            }
        }

        // Mise à jour du soin
        let rows_affected = conn.execute(
            "UPDATE soins SET nom = ?1, unite_defaut = ?2 WHERE id = ?3",
            [&soin.nom, &soin.unite_defaut, &soin.id.to_string()],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Soin", soin.id));
        }

        Ok(Soin {
            id: Some(soin.id),
            nom: soin.nom,
            unite_defaut: soin.unite_defaut,
        })
    }

    async fn delete(&self, id: i64) -> AppResult<()> {
        let conn = self.db.get_connection()?;
        
        // Vérifier s'il y a des entrées de suivi quotidien qui utilisent ce soin
        let usage_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM suivi_quotidien WHERE soins_id = ?1",
            [id],
            |row| row.get(0),
        )?;

        if usage_count > 0 {
            return Err(AppError::constraint_violation(
                "Impossible de supprimer le soin car il est utilisé dans le suivi quotidien"
            ));
        }

        // Suppression du soin
        let rows_affected = conn.execute(
            "DELETE FROM soins WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Soin", id));
        }

        Ok(())
    }

    async fn search_by_name(&self, nom: &str) -> AppResult<Vec<Soin>> {
        let conn = self.db.get_connection()?;
        
        let search_pattern = format!("%{}%", nom);
        let mut stmt = conn.prepare(
            "SELECT id, nom, unite_defaut FROM soins WHERE nom LIKE ?1 ORDER BY nom"
        )?;
        
        let soins = stmt.query_map([search_pattern], |row| {
            Ok(Soin {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                unite_defaut: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(soins)
    }

    async fn get_most_used(&self, limit: i32) -> AppResult<Vec<Soin>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT s.id, s.nom, s.unite_defaut, COUNT(sq.soins_id) as usage_count
             FROM soins s
             LEFT JOIN suivi_quotidien sq ON s.id = sq.soins_id
             GROUP BY s.id, s.nom, s.unite_defaut
             ORDER BY usage_count DESC, s.nom
             LIMIT ?1"
        )?;
        
        let soins = stmt.query_map([limit], |row| {
            Ok(Soin {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                unite_defaut: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(soins)
    }
}
