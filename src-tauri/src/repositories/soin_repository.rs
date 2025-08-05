use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Soin, CreateSoin, UpdateSoin, PaginatedSoin};
use std::sync::Arc;
use chrono::{DateTime, Utc};

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
    
    /// Get all soins with pagination and search
    async fn get_all(&self, page: u32, per_page: u32, nom_search: Option<&str>, unite_search: Option<&str>) -> AppResult<PaginatedSoin>;
    
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

/// Repository implementation for soins
pub struct SoinRepository {
    db: Arc<DatabaseManager>,
}

impl SoinRepository {
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

        // Get the created_at timestamp from the database
        let mut stmt = conn.prepare("SELECT created_at FROM soins WHERE id = ?1")?;
        let created_at: String = stmt.query_row([id], |row| {
            Ok(row.get(0)?)
        })?;

        // Parse the timestamp using NaiveDateTime first, then convert to UTC
        let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at, "%Y-%m-%d %H:%M:%S")
            .map_err(|e| {
                AppError::validation_error("created_at", &format!("Failed to parse date '{}': {}", created_at, e))
            })?;
        let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);

        Ok(Soin {
            id: Some(id),
            nom: soin.nom,
            unite_defaut: soin.unite_defaut,
            created_at,
        })
    }

    async fn get_all(&self, page: u32, per_page: u32, nom_search: Option<&str>, unite_search: Option<&str>) -> AppResult<PaginatedSoin> {
        let conn = self.db.get_connection()?;
        
        // Build search conditions and parameters
        let mut conditions = Vec::new();
        let mut search_params = Vec::new();
        
        if let Some(nom_term) = nom_search {
            let nom_trimmed = nom_term.trim();
            if !nom_trimmed.is_empty() {
                conditions.push("nom LIKE ?");
                search_params.push(format!("%{}%", nom_trimmed));
            }
        }
        
        if let Some(unite_term) = unite_search {
            let unite_trimmed = unite_term.trim();
            if !unite_trimmed.is_empty() {
                conditions.push("unite_defaut LIKE ?");
                search_params.push(format!("%{}%", unite_trimmed));
            }
        }
        
        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };
        
        // Count total matching records
        let count_query = format!("SELECT COUNT(*) FROM soins {}", where_clause);
        let total: i64 = if search_params.is_empty() {
            conn.query_row(&count_query, [], |row| row.get(0))?
        } else {
            conn.query_row(
                &count_query,
                rusqlite::params_from_iter(search_params.iter()),
                |row| row.get(0)
            )?
        };
        
        // Calculate pagination
        let offset = (page.saturating_sub(1)) * per_page;
        let total_pages = if total == 0 { 1 } else { ((total as f64) / (per_page as f64)).ceil() as u32 };
        
        // Get paginated data
        let data_query = format!(
            "SELECT id, nom, unite_defaut, created_at FROM soins {} ORDER BY nom LIMIT ? OFFSET ?",
            where_clause
        );
        
        // Prepare all parameters: search params + pagination params
        let mut all_params = search_params;
        all_params.push(per_page.to_string());
        all_params.push(offset.to_string());
        
        let mut stmt = conn.prepare(&data_query)?;
        let soins_list = stmt.query_map(
            rusqlite::params_from_iter(all_params.iter()),
            |row| {
                let created_at_str: String = row.get(3)?;
                
                // Parse using NaiveDateTime first, then convert to UTC
                let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at_str, "%Y-%m-%d %H:%M:%S")
                    .map_err(|e| {
                        rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                    })?;
                let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);
                
                Ok(Soin {
                    id: Some(row.get(0)?),
                    nom: row.get(1)?,
                    unite_defaut: row.get(2)?,
                    created_at,
                })
            }
        )?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(PaginatedSoin {
            data: soins_list,
            total,
            page,
            limit: per_page,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        })
    }

    async fn get_by_id(&self, id: i64) -> AppResult<Soin> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare("SELECT id, nom, unite_defaut, created_at FROM soins WHERE id = ?1")?;
        let soin = stmt.query_row([id], |row| {
            let created_at_str: String = row.get(3)?;
            
            // Parse using NaiveDateTime first, then convert to UTC
            let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at_str, "%Y-%m-%d %H:%M:%S")
                .map_err(|e| {
                    rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                })?;
            let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);
            
            Ok(Soin {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                unite_defaut: row.get(2)?,
                created_at,
            })
        }).map_err(|e| {
            match e {
                rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Soin", id),
                _ => e.into(),
            }
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

        // Get the created_at timestamp from the database
        let mut stmt = conn.prepare("SELECT created_at FROM soins WHERE id = ?1")?;
        let created_at: String = stmt.query_row([soin.id], |row| {
            Ok(row.get(0)?)
        })?;

        // Parse the timestamp using NaiveDateTime first, then convert to UTC
        let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at, "%Y-%m-%d %H:%M:%S")
            .map_err(|e| {
                AppError::validation_error("created_at", &format!("Failed to parse date '{}': {}", created_at, e))
            })?;
        let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);

        Ok(Soin {
            id: Some(soin.id),
            nom: soin.nom,
            unite_defaut: soin.unite_defaut,
            created_at,
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
            "SELECT id, nom, unite_defaut, created_at FROM soins WHERE nom LIKE ?1 ORDER BY nom"
        )?;
        
        let soins = stmt.query_map([search_pattern], |row| {
            let created_at_str: String = row.get(3)?;
            
            // Parse using NaiveDateTime first, then convert to UTC
            let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at_str, "%Y-%m-%d %H:%M:%S")
                .map_err(|e| {
                    rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                })?;
            let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);
            
            Ok(Soin {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                unite_defaut: row.get(2)?,
                created_at,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(soins)
    }

    async fn get_most_used(&self, limit: i32) -> AppResult<Vec<Soin>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT s.id, s.nom, s.unite_defaut, s.created_at, COUNT(sq.soins_id) as usage_count
             FROM soins s
             LEFT JOIN suivi_quotidien sq ON s.id = sq.soins_id
             GROUP BY s.id, s.nom, s.unite_defaut, s.created_at
             ORDER BY usage_count DESC, s.nom
             LIMIT ?1"
        )?;
        
        let soins = stmt.query_map([limit], |row| {
            let created_at_str: String = row.get(3)?;
            
            // Parse using NaiveDateTime first, then convert to UTC
            let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at_str, "%Y-%m-%d %H:%M:%S")
                .map_err(|e| {
                    rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                })?;
            let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);
            
            Ok(Soin {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                unite_defaut: row.get(2)?,
                created_at,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(soins)
    }
}
