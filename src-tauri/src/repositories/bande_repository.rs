use crate::error::AppError;
use crate::models::{Bande, BandeWithDetails, BatimentWithDetails, CreateBande, UpdateBande, PaginatedBandes};
use crate::repositories::AlimentationRepository;
use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;

/// Repository for managing bandes
pub struct BandeRepository;

impl BandeRepository {
    /// Create a new bande
    pub fn create(
        conn: &PooledConnection<SqliteConnectionManager>,
        bande: &CreateBande,
    ) -> Result<Bande, AppError> {
        // Validation de la ferme
        let ferme_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM fermes WHERE id = ?1",
            [bande.ferme_id],
            |row| row.get(0),
        )?;

        if ferme_exists == 0 {
            return Err(AppError::validation_error(
                "ferme_id",
                "La ferme spécifiée n'existe pas"
            ));
        }

        // Get the next numero_bande for this farm
        let next_numero: i32 = conn.query_row(
            "SELECT COALESCE(MAX(numero_bande), 0) + 1 FROM bandes WHERE ferme_id = ?1",
            [bande.ferme_id],
            |row| row.get(0),
        )?;

        // Insertion de la bande
        conn.execute(
            "INSERT INTO bandes (numero_bande, date_entree, ferme_id, notes) VALUES (?1, ?2, ?3, ?4)",
            [
                &next_numero.to_string(),
                &bande.date_entree.to_string(),
                &bande.ferme_id.to_string(),
                &bande.notes.as_ref().unwrap_or(&String::new()),
            ],
        )?;

        let id = conn.last_insert_rowid();

        Ok(Bande {
            id: Some(id),
            numero_bande: next_numero,
            date_entree: bande.date_entree.clone(),
            ferme_id: bande.ferme_id,
            notes: bande.notes.clone(),
        })
    }

    /// Get all bandes with their batiments (non-paginated list)
    pub fn get_all_list(
        conn: &PooledConnection<SqliteConnectionManager>,
    ) -> Result<Vec<BandeWithDetails>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT b.id, b.numero_bande, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             ORDER BY b.date_entree DESC"
        )?;
        
        let bandes_result = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        let mut bandes = Vec::new();
        for (id, numero_bande, date_entree_str, ferme_id, ferme_nom, notes) in bandes_result {
            let date_entree = date_entree_str.parse().map_err(|_| {
                AppError::business_logic("Format de date invalide dans la base de données")
            })?;
            let batiments = Self::load_batiments(conn, id)?;
            let alimentation_contour = AlimentationRepository::get_contour(conn, id)?;
            bandes.push(BandeWithDetails {
                id: Some(id),
                numero_bande,
                date_entree,
                ferme_id,
                ferme_nom,
                notes,
                batiments,
                alimentation_contour,
            });
        }

        Ok(bandes)
    }

    /// Get bandes by ferme with their batiments
    pub fn get_by_ferme(
        conn: &PooledConnection<SqliteConnectionManager>,
        ferme_id: i64,
    ) -> Result<Vec<BandeWithDetails>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT b.id, b.numero_bande, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             WHERE b.ferme_id = ?1
             ORDER BY b.date_entree DESC"
        )?;
        
        let bandes_result = stmt.query_map([ferme_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        let mut bandes = Vec::new();
        for (id, numero_bande, date_entree_str, ferme_id, ferme_nom, notes) in bandes_result {
            let date_entree = date_entree_str.parse().map_err(|_| {
                AppError::business_logic("Format de date invalide dans la base de données")
            })?;
            let batiments = Self::load_batiments(conn, id)?;
            let alimentation_contour = AlimentationRepository::get_contour(conn, id)?;
            bandes.push(BandeWithDetails {
                id: Some(id),
                numero_bande,
                date_entree,
                ferme_id,
                ferme_nom,
                notes,
                batiments,
                alimentation_contour,
            });
        }

        Ok(bandes)
    }

    /// Get latest bandes by ferme (limited for selectors)
    pub fn get_latest_by_ferme(
        conn: &PooledConnection<SqliteConnectionManager>,
        ferme_id: i64,
        limit: u32,
    ) -> Result<Vec<BandeWithDetails>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT b.id, b.numero_bande, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             WHERE b.ferme_id = ?1
             ORDER BY b.date_entree DESC
             LIMIT ?2"
        )?;
        
        let bandes_result = stmt.query_map([ferme_id, limit as i64], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        let mut bandes = Vec::new();
        for (id, numero_bande, date_entree_str, ferme_id, ferme_nom, notes) in bandes_result {
            let date_entree = date_entree_str.parse().map_err(|_| {
                AppError::business_logic("Format de date invalide dans la base de données")
            })?;
            let batiments = Self::load_batiments(conn, id)?;
            let alimentation_contour = AlimentationRepository::get_contour(conn, id)?;
            bandes.push(BandeWithDetails {
                id: Some(id),
                numero_bande,
                date_entree,
                ferme_id,
                ferme_nom,
                notes,
                batiments,
                alimentation_contour,
            });
        }

        Ok(bandes)
    }

    /// Get bandes by ferme with pagination and optional date range filtering
    pub fn get_by_ferme_paginated(
        conn: &PooledConnection<SqliteConnectionManager>,
        ferme_id: i64,
        page: u32,
        per_page: u32,
        date_from: Option<String>,
        date_to: Option<String>,
    ) -> Result<PaginatedBandes, AppError> {
        let offset = (page - 1) * per_page;
        
        // Build the WHERE clause based on date filters
        let mut where_conditions = vec!["b.ferme_id = ?1".to_string()];
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(ferme_id)];
        let mut param_index = 2;
        
        if let Some(from_date) = &date_from {
            where_conditions.push(format!("b.date_entree >= ?{}", param_index));
            params.push(Box::new(from_date.clone()));
            param_index += 1;
        }
        
        if let Some(to_date) = &date_to {
            where_conditions.push(format!("b.date_entree <= ?{}", param_index));
            params.push(Box::new(to_date.clone()));
            param_index += 1;
        }
        
        let where_clause = where_conditions.join(" AND ");
        
        // Count total records with filters
        let count_query = format!(
            "SELECT COUNT(*) FROM bandes b WHERE {}",
            where_clause
        );
        
        let total: u32 = {
            let mut stmt = conn.prepare(&count_query)?;
            let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
            stmt.query_row(&params_refs[..], |row| row.get::<_, i64>(0))?
        } as u32;
        
        // Get paginated data with filters
        let select_query = format!(
            "SELECT b.id, b.numero_bande, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             WHERE {}
             ORDER BY b.date_entree DESC
             LIMIT ?{} OFFSET ?{}",
            where_clause, param_index, param_index + 1
        );
        
        // Add LIMIT and OFFSET parameters
        params.push(Box::new(per_page as i64));
        params.push(Box::new(offset as i64));
        
        let mut stmt = conn.prepare(&select_query)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let bandes_result = stmt.query_map(&params_refs[..], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        let mut bandes = Vec::new();
        for (id, numero_bande, date_entree_str, ferme_id, ferme_nom, notes) in bandes_result {
            let date_entree = date_entree_str.parse().map_err(|_| {
                AppError::business_logic("Format de date invalide dans la base de données")
            })?;
            let batiments = Self::load_batiments(conn, id)?;
            let alimentation_contour = AlimentationRepository::get_contour(conn, id)?;
            bandes.push(BandeWithDetails {
                id: Some(id),
                numero_bande,
                date_entree,
                ferme_id,
                ferme_nom,
                notes,
                batiments,
                alimentation_contour,
            });
        }

        let total_pages = (total + per_page - 1) / per_page;
        let has_next = page < total_pages;
        let has_prev = page > 1;

        Ok(PaginatedBandes {
            data: bandes,
            total,
            page,
            limit: per_page,
            total_pages,
            has_next,
            has_prev,
        })
    }

    /// Get bandes by ferme with pagination and date range filtering
    pub fn get_by_ferme_paginated_with_date_filter(
        conn: &PooledConnection<SqliteConnectionManager>,
        ferme_id: i64,
        page: u32,
        per_page: u32,
        date_from: Option<String>,
        date_to: Option<String>,
    ) -> Result<PaginatedBandes, AppError> {
        let offset = (page - 1) * per_page;
        
        // Build the WHERE clause based on date filters
        let mut where_conditions = vec!["b.ferme_id = ?1".to_string()];
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(ferme_id)];
        let mut param_index = 2;
        
        if let Some(from_date) = &date_from {
            where_conditions.push(format!("b.date_entree >= ?{}", param_index));
            params.push(Box::new(from_date.clone()));
            param_index += 1;
        }
        
        if let Some(to_date) = &date_to {
            where_conditions.push(format!("b.date_entree <= ?{}", param_index));
            params.push(Box::new(to_date.clone()));
            param_index += 1;
        }
        
        let where_clause = where_conditions.join(" AND ");
        
        // Count total records with filters
        let count_query = format!(
            "SELECT COUNT(*) FROM bandes b WHERE {}",
            where_clause
        );
        
        let total: u32 = {
            let mut stmt = conn.prepare(&count_query)?;
            let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
            stmt.query_row(&params_refs[..], |row| row.get::<_, i64>(0))?
        } as u32;
        
        // Get paginated data with filters
        let select_query = format!(
            "SELECT b.id, b.numero_bande, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             WHERE {}
             ORDER BY b.date_entree DESC
             LIMIT ?{} OFFSET ?{}",
            where_clause, param_index, param_index + 1
        );
        
        // Add LIMIT and OFFSET parameters
        params.push(Box::new(per_page as i64));
        params.push(Box::new(offset as i64));
        
        let mut stmt = conn.prepare(&select_query)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let bandes_result = stmt.query_map(&params_refs[..], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        let mut bandes = Vec::new();
        for (id, numero_bande, date_entree_str, ferme_id, ferme_nom, notes) in bandes_result {
            let date_entree = date_entree_str.parse().map_err(|_| {
                AppError::business_logic("Format de date invalide dans la base de données")
            })?;
            let batiments = Self::load_batiments(conn, id)?;
            let alimentation_contour = AlimentationRepository::get_contour(conn, id)?;
            bandes.push(BandeWithDetails {
                id: Some(id),
                numero_bande,
                date_entree,
                ferme_id,
                ferme_nom,
                notes,
                batiments,
                alimentation_contour,
            });
        }

        // Calculate pagination metadata
        let total_pages = (total + per_page - 1) / per_page;
        let has_next = page < total_pages;
        let has_prev = page > 1;

        Ok(PaginatedBandes {
            data: bandes,
            total,
            page,
            limit: per_page,
            total_pages,
            has_next,
            has_prev,
        })
    }

    /// Get a bande by ID with its batiments
    pub fn get_by_id(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
    ) -> Result<Option<BandeWithDetails>, AppError> {
        let result = conn.query_row(
            "SELECT b.id, b.numero_bande, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             WHERE b.id = ?1",
            [id],
            |row| Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<String>>(5)?,
            )),
        );

        match result {
            Ok((id, numero_bande, date_entree_str, ferme_id, ferme_nom, notes)) => {
                let date_entree = date_entree_str.parse().map_err(|_| {
                    AppError::business_logic("Format de date invalide dans la base de données")
                })?;
                let batiments = Self::load_batiments(conn, id)?;
                let alimentation_contour = AlimentationRepository::get_contour(conn, id)?;
                Ok(Some(BandeWithDetails {
                    id: Some(id),
                    numero_bande,
                    date_entree,
                    ferme_id,
                    ferme_nom,
                    notes,
                    batiments,
                    alimentation_contour,
                }))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::from(e)),
        }
    }

    /// Update a bande
    pub fn update(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
        bande: &UpdateBande,
    ) -> Result<(), AppError> {
        // Validation de la ferme
        let ferme_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM fermes WHERE id = ?1",
            [bande.ferme_id],
            |row| row.get(0),
        )?;

        if ferme_exists == 0 {
            return Err(AppError::validation_error(
                "ferme_id",
                "La ferme spécifiée n'existe pas"
            ));
        }

        // Mise à jour de la bande
        let rows_affected = conn.execute(
            "UPDATE bandes SET numero_bande = ?1, date_entree = ?2, ferme_id = ?3, notes = ?4 WHERE id = ?5",
            [
                &bande.numero_bande.to_string(),
                &bande.date_entree.to_string(),
                &bande.ferme_id.to_string(),
                &bande.notes.as_ref().unwrap_or(&String::new()),
                &id.to_string(),
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Bande", id));
        }

        Ok(())
    }

    /// Delete a bande (will cascade delete batiments)
    pub fn delete(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
    ) -> Result<(), AppError> {
        // La suppression en cascade est gérée par les contraintes FK
        let rows_affected = conn.execute(
            "DELETE FROM bandes WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Bande", id));
        }

        Ok(())
    }

    /// Get available batiment numbers for a ferme
    pub fn get_available_batiments(
        conn: &PooledConnection<SqliteConnectionManager>,
        ferme_id: i64,
    ) -> Result<Vec<String>, AppError> {
        // Get the number of meubles in the ferme
        let nbr_meuble: i32 = conn.query_row(
            "SELECT nbr_meuble FROM fermes WHERE id = ?1",
            [ferme_id],
            |row| row.get(0),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Ferme", ferme_id),
            _ => AppError::from(e),
        })?;

        // Return all available batiment numbers (1 to nbr_meuble)
        // Since bandes are historical records, all batiments can be reused for new bandes
        let available: Vec<String> = (1..=nbr_meuble).map(|i| i.to_string()).collect();

        Ok(available)
    }

    /// Load batiments for a bande
    fn load_batiments(
        conn: &PooledConnection<SqliteConnectionManager>,
        bande_id: i64,
    ) -> Result<Vec<BatimentWithDetails>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT bat.id, bat.bande_id, bat.numero_batiment, bat.poussin_id,
                    pous.nom as poussin_nom, bat.personnel_id, p.nom as personnel_nom, bat.quantite
             FROM batiments bat
             JOIN personnel p ON bat.personnel_id = p.id
             JOIN poussins pous ON bat.poussin_id = pous.id
             WHERE bat.bande_id = ?1
             ORDER BY bat.numero_batiment"
        )?;
        
        let batiments = stmt.query_map([bande_id], |row| {
            Ok(BatimentWithDetails {
                id: Some(row.get(0)?),
                bande_id: row.get(1)?,
                numero_batiment: row.get(2)?,
                poussin_id: row.get(3)?,
                poussin_nom: row.get(4)?,
                personnel_id: row.get(5)?,
                personnel_nom: row.get(6)?,
                quantite: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(batiments)
    }
}