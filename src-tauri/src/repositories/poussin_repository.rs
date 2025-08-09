use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Poussin, CreatePoussin, UpdatePoussin, PaginatedPoussin};
use std::sync::Arc;
use chrono::{DateTime, Utc};

/// Repository trait for poussin operations
pub trait PoussinRepositoryTrait: Send + Sync {
    /// Create a new poussin
    async fn create(&self, poussin: CreatePoussin) -> AppResult<Poussin>;
    
    /// Get all poussins with pagination and search
    async fn get_all(&self, page: u32, per_page: u32, nom_search: Option<&str>) -> AppResult<PaginatedPoussin>;
    
    /// Get all poussins as a simple list (no pagination)
    async fn get_poussin_list(&self) -> AppResult<Vec<Poussin>>;
    
    /// Update existing poussin
    async fn update(&self, poussin: UpdatePoussin) -> AppResult<Poussin>;
    
    /// Delete poussin by ID
    async fn delete(&self, id: i64) -> AppResult<()>;
}

/// Poussin repository implementation
pub struct PoussinRepository {
    db: Arc<DatabaseManager>,
}

impl PoussinRepository {
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }
}

impl PoussinRepositoryTrait for PoussinRepository {
    async fn create(&self, poussin: CreatePoussin) -> AppResult<Poussin> {
        let conn = self.db.get_connection()?;
        
        conn.execute(
            "INSERT INTO poussins (nom) VALUES (?1)",
            [&poussin.nom],
        )?;

        let id = conn.last_insert_rowid();

        // Get the created_at timestamp from the database
        let mut stmt = conn.prepare("SELECT created_at FROM poussins WHERE id = ?1")?;
        let created_at: String = stmt.query_row([id], |row| {
            Ok(row.get(0)?)
        })?;

        // Parse the timestamp using NaiveDateTime first, then convert to UTC
        let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at, "%Y-%m-%d %H:%M:%S")
            .map_err(|e| {
                AppError::validation_error("created_at", &format!("Failed to parse date '{}': {}", created_at, e))
            })?;
        let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);

        Ok(Poussin {
            id: Some(id),
            nom: poussin.nom,
            created_at,
        })
    }

    async fn get_all(&self, page: u32, per_page: u32, nom_search: Option<&str>) -> AppResult<PaginatedPoussin> {
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
        let count_query = format!("SELECT COUNT(*) FROM poussins {}", where_clause);
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
            "SELECT id, nom, created_at FROM poussins {} ORDER BY nom LIMIT ? OFFSET ?",
            where_clause
        );
        
        // Prepare all parameters: search params + pagination params
        let mut all_params = search_params;
        all_params.push(per_page.to_string());
        all_params.push(offset.to_string());
        
        let mut stmt = conn.prepare(&data_query)?;
        let poussin_list = stmt.query_map(
            rusqlite::params_from_iter(all_params.iter()),
            |row| {
                let created_at_str: String = row.get(2)?;
                
                // Parse using NaiveDateTime first, then convert to UTC
                let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at_str, "%Y-%m-%d %H:%M:%S")
                    .map_err(|e| {
                        rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                    })?;
                let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);
                
                Ok(Poussin {
                    id: Some(row.get(0)?),
                    nom: row.get(1)?,
                    created_at,
                })
            }
        )?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(PaginatedPoussin {
            data: poussin_list,
            total,
            page,
            limit: per_page,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        })
    }

    async fn update(&self, poussin: UpdatePoussin) -> AppResult<Poussin> {
        let conn = self.db.get_connection()?;
        
        let rows_affected = conn.execute(
            "UPDATE poussins SET nom = ?1 WHERE id = ?2",
            [&poussin.nom, &poussin.id.to_string()],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Poussin", poussin.id));
        }

        // Get the created_at timestamp from the database
        let mut stmt = conn.prepare("SELECT created_at FROM poussins WHERE id = ?1")?;
        let created_at: String = stmt.query_row([poussin.id], |row| {
            Ok(row.get(0)?)
        })?;

        // Parse the timestamp using NaiveDateTime first, then convert to UTC
        let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at, "%Y-%m-%d %H:%M:%S")
            .map_err(|e| {
                AppError::validation_error("created_at", &format!("Failed to parse date '{}': {}", created_at, e))
            })?;
        let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);

        Ok(Poussin {
            id: Some(poussin.id),
            nom: poussin.nom,
            created_at,
        })
    }

    async fn delete(&self, id: i64) -> AppResult<()> {
        let conn = self.db.get_connection()?;
        
        let rows_affected = conn.execute(
            "DELETE FROM poussins WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Poussin", id));
        }

        Ok(())
    }

    async fn get_poussin_list(&self) -> AppResult<Vec<Poussin>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare("SELECT id, nom, created_at FROM poussins ORDER BY nom")?;
        let poussin_list = stmt.query_map([], |row| {
            let created_at_str: String = row.get(2)?;
            
            // Parse using NaiveDateTime first, then convert to UTC
            let naive_dt = chrono::NaiveDateTime::parse_from_str(&created_at_str, "%Y-%m-%d %H:%M:%S")
                .map_err(|e| {
                    rusqlite::Error::ToSqlConversionFailure(Box::new(e))
                })?;
            let created_at = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);
            
            Ok(Poussin {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                created_at,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(poussin_list)
    }
}
