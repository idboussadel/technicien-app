use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Maladie, CreateMaladie, UpdateMaladie, PaginatedMaladies};
use std::sync::Arc;
use chrono::{DateTime, Utc};

/// Repository trait for maladie operations
pub trait MaladieRepositoryTrait: Send + Sync {
    /// Create a new maladie
    async fn create(&self, maladie: CreateMaladie) -> AppResult<Maladie>;
    
    /// Get all maladies with pagination and search
    async fn get_maladies(&self, page: u32, per_page: u32, nom_search: Option<&str>) -> AppResult<PaginatedMaladies>;
    
    /// Get all maladies as a simple list (no pagination)
    async fn get_maladies_list(&self) -> AppResult<Vec<Maladie>>;
    
    /// Update existing maladie
    async fn update(&self, maladie: UpdateMaladie) -> AppResult<Maladie>;
    
    /// Delete maladie by ID
    async fn delete(&self, id: i64) -> AppResult<()>;
}

/// Maladie repository implementation
pub struct MaladieRepository {
    db: Arc<DatabaseManager>,
}

impl MaladieRepository {
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }
}

impl MaladieRepositoryTrait for MaladieRepository {
    async fn create(&self, maladie: CreateMaladie) -> AppResult<Maladie> {
        let conn = self.db.get_connection()?;
        let now = Utc::now();
        
        conn.execute(
            "INSERT INTO maladies (nom, created_at) VALUES (?1, ?2)",
            [&maladie.nom, &now.to_rfc3339()],
        )?;

        let id = conn.last_insert_rowid();

        // Get the created_at timestamp from the database
        let mut stmt = conn.prepare("SELECT created_at FROM maladies WHERE id = ?1")?;
        let created_at: String = stmt.query_row([id], |row| {
            Ok(row.get(0)?)
        })?;

        // Parse the timestamp
        let created_at = DateTime::parse_from_rfc3339(&created_at)
            .map_err(|e| {
                AppError::validation_error("created_at", &format!("Failed to parse date '{}': {}", created_at, e))
            })?
            .with_timezone(&Utc);

        Ok(Maladie {
            id,
            nom: maladie.nom,
            created_at,
        })
    }

    async fn get_maladies(&self, page: u32, per_page: u32, nom_search: Option<&str>) -> AppResult<PaginatedMaladies> {
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
        
        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };
        
        // Count total matching records
        let count_query = format!("SELECT COUNT(*) FROM maladies {}", where_clause);
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
            "SELECT id, nom, created_at FROM maladies {} ORDER BY nom LIMIT ? OFFSET ?",
            where_clause
        );
        
        // Prepare all parameters: search params + pagination params
        let mut all_params = search_params;
        all_params.push(per_page.to_string());
        all_params.push(offset.to_string());
        
        let mut stmt = conn.prepare(&data_query)?;
        let maladies_list = stmt.query_map(
            rusqlite::params_from_iter(all_params.iter()),
            |row| {
                let created_at_str: String = row.get(2)?;
                
                // Parse the timestamp
                let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                    .map_err(|e| {
                        rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                    })?
                    .with_timezone(&Utc);
                
                Ok(Maladie {
                    id: row.get(0)?,
                    nom: row.get(1)?,
                    created_at,
                })
            }
        )?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(PaginatedMaladies {
            data: maladies_list,
            total,
            page,
            limit: per_page,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        })
    }

    async fn update(&self, maladie: UpdateMaladie) -> AppResult<Maladie> {
        let conn = self.db.get_connection()?;
        
        let rows_affected = conn.execute(
            "UPDATE maladies SET nom = ?1 WHERE id = ?2",
            [&maladie.nom, &maladie.id.to_string()],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Maladie", maladie.id));
        }

        // Get the created_at timestamp from the database
        let mut stmt = conn.prepare("SELECT created_at FROM maladies WHERE id = ?1")?;
        let created_at: String = stmt.query_row([maladie.id], |row| {
            Ok(row.get(0)?)
        })?;

        // Parse the timestamp
        let created_at = DateTime::parse_from_rfc3339(&created_at)
            .map_err(|e| {
                AppError::validation_error("created_at", &format!("Failed to parse date '{}': {}", created_at, e))
            })?
            .with_timezone(&Utc);

        Ok(Maladie {
            id: maladie.id,
            nom: maladie.nom,
            created_at,
        })
    }

    async fn delete(&self, id: i64) -> AppResult<()> {
        let conn = self.db.get_connection()?;
        
        let rows_affected = conn.execute(
            "DELETE FROM maladies WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Maladie", id));
        }

        Ok(())
    }

    async fn get_maladies_list(&self) -> AppResult<Vec<Maladie>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare("SELECT id, nom, created_at FROM maladies ORDER BY nom")?;
        let maladies_list = stmt.query_map([], |row| {
            let created_at_str: String = row.get(2)?;
            
            // Parse the timestamp
            let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                .map_err(|e| {
                    rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                })?
                .with_timezone(&Utc);
            
            Ok(Maladie {
                id: row.get(0)?,
                nom: row.get(1)?,
                created_at,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(maladies_list)
    }
}
