use crate::error::AppError;
use crate::models::alimentation::{AlimentationHistory, CreateAlimentationHistory, UpdateAlimentationHistory};
use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;

/// Repository for managing alimentation history
pub struct AlimentationRepository;

impl AlimentationRepository {
    /// Create a new alimentation history record and update the bande contour
    pub fn create(
        conn: &PooledConnection<SqliteConnectionManager>,
        alimentation: &CreateAlimentationHistory,
    ) -> Result<AlimentationHistory, AppError> {
        // Validation de la bande
        let bande_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bandes WHERE id = ?1",
            [alimentation.bande_id],
            |row| row.get(0),
        )?;

        if bande_exists == 0 {
            return Err(AppError::validation_error(
                "bande_id",
                "La bande spécifiée n'existe pas"
            ));
        }

        // Insertion de l'historique d'alimentation
        conn.execute(
            "INSERT INTO alimentation_history (bande_id, quantite) VALUES (?1, ?2)",
            [
                &alimentation.bande_id.to_string(),
                &alimentation.quantite.to_string(),
            ],
        )?;

        let id = conn.last_insert_rowid();

        // Update the bandes contour
        conn.execute(
            "UPDATE bandes SET alimentation_contour = alimentation_contour + ?1 WHERE id = ?2",
            [
                &alimentation.quantite.to_string(),
                &alimentation.bande_id.to_string(),
            ],
        )?;

        // Get the created record with its timestamp
        let created_record = conn.query_row(
            "SELECT id, bande_id, quantite, created_at FROM alimentation_history WHERE id = ?1",
            [id],
            |row| {
                Ok(AlimentationHistory {
                    id: Some(row.get(0)?),
                    bande_id: row.get(1)?,
                    quantite: row.get(2)?,
                    created_at: row.get(3)?,
                })
            },
        )?;

        Ok(created_record)
    }

    /// Get all alimentation history for a specific bande, ordered by creation date (most recent first)
    pub fn get_by_bande(
        conn: &PooledConnection<SqliteConnectionManager>,
        bande_id: i64,
    ) -> Result<Vec<AlimentationHistory>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, bande_id, quantite, created_at
             FROM alimentation_history
             WHERE bande_id = ?1
             ORDER BY created_at DESC, id DESC"
        )?;
        
        let alimentation_history = stmt.query_map([bande_id], |row| {
            Ok(AlimentationHistory {
                id: Some(row.get(0)?),
                bande_id: row.get(1)?,
                quantite: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(alimentation_history)
    }

    /// Get a specific alimentation history record by ID
    pub fn get_by_id(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
    ) -> Result<Option<AlimentationHistory>, AppError> {
        let result = conn.query_row(
            "SELECT id, bande_id, quantite, created_at
             FROM alimentation_history
             WHERE id = ?1",
            [id],
            |row| {
                Ok(AlimentationHistory {
                    id: Some(row.get(0)?),
                    bande_id: row.get(1)?,
                    quantite: row.get(2)?,
                    created_at: row.get(3)?,
                })
            },
        );

        match result {
            Ok(alimentation) => Ok(Some(alimentation)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::from(e)),
        }
    }

    /// Update an alimentation history record and adjust the bande contour accordingly
    pub fn update(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
        alimentation: &UpdateAlimentationHistory,
    ) -> Result<(), AppError> {
        // Validation de la bande
        let bande_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bandes WHERE id = ?1",
            [alimentation.bande_id],
            |row| row.get(0),
        )?;

        if bande_exists == 0 {
            return Err(AppError::validation_error(
                "bande_id",
                "La bande spécifiée n'existe pas"
            ));
        }

        // Get the old quantity to adjust the contour properly
        let old_record = conn.query_row(
            "SELECT bande_id, quantite FROM alimentation_history WHERE id = ?1",
            [id],
            |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?))
            },
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Alimentation History", id),
            _ => AppError::from(e),
        })?;

        let (old_bande_id, old_quantite) = old_record;

        // Update the alimentation history record
        let rows_affected = conn.execute(
            "UPDATE alimentation_history SET bande_id = ?1, quantite = ?2 WHERE id = ?3",
            [
                &alimentation.bande_id.to_string(),
                &alimentation.quantite.to_string(),
                &id.to_string(),
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Alimentation History", id));
        }

        // Adjust contours: remove old quantity from old bande, add new quantity to new bande
        if old_bande_id != alimentation.bande_id {
            // Different bandes: subtract from old, add to new
            conn.execute(
                "UPDATE bandes SET alimentation_contour = alimentation_contour - ?1 WHERE id = ?2",
                [&old_quantite.to_string(), &old_bande_id.to_string()],
            )?;
            conn.execute(
                "UPDATE bandes SET alimentation_contour = alimentation_contour + ?1 WHERE id = ?2",
                [&alimentation.quantite.to_string(), &alimentation.bande_id.to_string()],
            )?;
        } else {
            // Same bande: adjust by the difference
            let quantity_diff = alimentation.quantite - old_quantite;
            conn.execute(
                "UPDATE bandes SET alimentation_contour = alimentation_contour + ?1 WHERE id = ?2",
                [&quantity_diff.to_string(), &alimentation.bande_id.to_string()],
            )?;
        }

        Ok(())
    }

    /// Delete an alimentation history record and adjust the bande contour
    pub fn delete(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
    ) -> Result<(), AppError> {
        // Get the record details before deleting to adjust the contour
        let record = conn.query_row(
            "SELECT bande_id, quantite FROM alimentation_history WHERE id = ?1",
            [id],
            |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?))
            },
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Alimentation History", id),
            _ => AppError::from(e),
        })?;

        let (bande_id, quantite) = record;

        // Delete the record
        let rows_affected = conn.execute(
            "DELETE FROM alimentation_history WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Alimentation History", id));
        }

        // Update the bande contour by subtracting the deleted quantity
        conn.execute(
            "UPDATE bandes SET alimentation_contour = alimentation_contour - ?1 WHERE id = ?2",
            [&quantite.to_string(), &bande_id.to_string()],
        )?;

        Ok(())
    }

    /// Get the current alimentation contour for a specific bande (from bandes table)
    pub fn get_contour(
        conn: &PooledConnection<SqliteConnectionManager>,
        bande_id: i64,
    ) -> Result<f64, AppError> {
        let result = conn.query_row(
            "SELECT alimentation_contour FROM bandes WHERE id = ?1",
            [bande_id],
            |row| row.get::<_, f64>(0),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Bande", bande_id),
            _ => AppError::from(e),
        })?;

        Ok(result)
    }

    /// Delete all alimentation history for a specific bande and reset its contour
    /// Useful when deleting a bande
    pub fn delete_by_bande(
        conn: &PooledConnection<SqliteConnectionManager>,
        bande_id: i64,
    ) -> Result<u64, AppError> {
        // Delete all alimentation history for this bande
        let rows_affected = conn.execute(
            "DELETE FROM alimentation_history WHERE bande_id = ?1",
            [bande_id],
        )?;

        // Reset the bande contour to 0
        conn.execute(
            "UPDATE bandes SET alimentation_contour = 0.0 WHERE id = ?1",
            [bande_id],
        )?;

        Ok(rows_affected as u64)
    }
}
