use crate::error::AppError;
use crate::models::{Batiment, BatimentWithDetails, CreateBatiment, UpdateBatiment};
use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Result as SqliteResult;

/// Repository for managing batiments
pub struct BatimentRepository;

impl BatimentRepository {
    /// Create a new batiment
    pub fn create(
        conn: &PooledConnection<SqliteConnectionManager>,
        batiment: &CreateBatiment,
    ) -> Result<Batiment, AppError> {
        // Validation des clés étrangères
        let bande_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bandes WHERE id = ?1",
            [batiment.bande_id],
            |row| row.get(0),
        )?;

        if bande_exists == 0 {
            return Err(AppError::validation_error(
                "bande_id",
                "La bande spécifiée n'existe pas"
            ));
        }

        let personnel_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM personnel WHERE id = ?1", 
            [batiment.personnel_id],
            |row| row.get(0),
        )?;

        if personnel_exists == 0 {
            return Err(AppError::validation_error(
                "personnel_id", 
                "Le personnel spécifié n'existe pas"
            ));
        }

        let poussin_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM poussins WHERE id = ?1", 
            [batiment.poussin_id],
            |row| row.get(0),
        )?;

        if poussin_exists == 0 {
            return Err(AppError::validation_error(
                "poussin_id", 
                "Le poussin spécifié n'existe pas"
            ));
        }

        // Vérifier que le numéro de bâtiment n'est pas déjà utilisé dans la même bande
        let existing_batiment: i64 = conn.query_row(
            "SELECT COUNT(*) FROM batiments 
             WHERE bande_id = ?1 AND numero_batiment = ?2",
            [batiment.bande_id, batiment.numero_batiment.parse::<i64>().unwrap_or(0)],
            |row| row.get(0),
        )?;

        if existing_batiment > 0 {
            return Err(AppError::validation_error(
                "numero_batiment",
                "Ce numéro de bâtiment est déjà utilisé dans cette bande"
            ));
        }

        // Insertion du bâtiment
        conn.execute(
            "INSERT INTO batiments (bande_id, numero_batiment, poussin_id, personnel_id, quantite) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            [
                &batiment.bande_id.to_string(),
                &batiment.numero_batiment,
                &batiment.poussin_id.to_string(),
                &batiment.personnel_id.to_string(),
                &batiment.quantite.to_string(),
            ],
        )?;

        let id = conn.last_insert_rowid();

        Ok(Batiment {
            id: Some(id),
            bande_id: batiment.bande_id,
            numero_batiment: batiment.numero_batiment.clone(),
            poussin_id: batiment.poussin_id,
            personnel_id: batiment.personnel_id,
            quantite: batiment.quantite,
        })
    }

    /// Get all batiments for a specific bande
    pub fn get_by_bande(
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

    /// Get a batiment by ID
    pub fn get_by_id(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
    ) -> Result<Option<BatimentWithDetails>, AppError> {
        let result = conn.query_row(
            "SELECT bat.id, bat.bande_id, bat.numero_batiment, bat.poussin_id,
                    pous.nom as poussin_nom, bat.personnel_id, p.nom as personnel_nom, bat.quantite
             FROM batiments bat
             JOIN personnel p ON bat.personnel_id = p.id
             JOIN poussins pous ON bat.poussin_id = pous.id
             WHERE bat.id = ?1",
            [id],
            |row| Ok(BatimentWithDetails {
                id: Some(row.get(0)?),
                bande_id: row.get(1)?,
                numero_batiment: row.get(2)?,
                poussin_id: row.get(3)?,
                poussin_nom: row.get(4)?,
                personnel_id: row.get(5)?,
                personnel_nom: row.get(6)?,
                quantite: row.get(7)?,
            }),
        );

        match result {
            Ok(batiment) => Ok(Some(batiment)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::from(e)),
        }
    }

    /// Update a batiment
    pub fn update(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
        batiment: &UpdateBatiment,
    ) -> Result<(), AppError> {
        // Validation des clés étrangères
        let bande_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bandes WHERE id = ?1",
            [batiment.bande_id],
            |row| row.get(0),
        )?;

        if bande_exists == 0 {
            return Err(AppError::validation_error(
                "bande_id",
                "La bande spécifiée n'existe pas"
            ));
        }

        let poussin_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM poussins WHERE id = ?1",
            [batiment.poussin_id],
            |row| row.get(0),
        )?;

        if poussin_exists == 0 {
            return Err(AppError::validation_error(
                "poussin_id",
                "Le poussin spécifié n'existe pas"
            ));
        }

        let personnel_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM personnel WHERE id = ?1",
            [batiment.personnel_id],
            |row| row.get(0),
        )?;

        if personnel_exists == 0 {
            return Err(AppError::validation_error(
                "personnel_id",
                "Le personnel spécifié n'existe pas"
            ));
        }

        // Mise à jour du bâtiment
        let rows_affected = conn.execute(
            "UPDATE batiments SET bande_id = ?1, numero_batiment = ?2, poussin_id = ?3, 
                                  personnel_id = ?4, quantite = ?5 WHERE id = ?6",
            [
                &batiment.bande_id.to_string(),
                &batiment.numero_batiment,
                &batiment.poussin_id.to_string(),
                &batiment.personnel_id.to_string(),
                &batiment.quantite.to_string(),
                &id.to_string(),
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Batiment", id));
        }

        Ok(())
    }

    /// Delete a batiment
    pub fn delete(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
    ) -> Result<(), AppError> {
        // La suppression en cascade est gérée par les contraintes FK
        let rows_affected = conn.execute(
            "DELETE FROM batiments WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Batiment", id));
        }

        Ok(())
    }

    /// Get available batiment numbers for a ferme (all numbers are available since they can be reused across different bands)
    pub fn get_available_batiment_numbers(
        conn: &PooledConnection<SqliteConnectionManager>,
        ferme_id: i64,
    ) -> Result<Vec<String>, AppError> {
        // Vérifier que la ferme existe
        let ferme_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM fermes WHERE id = ?1",
            [ferme_id],
            |row| row.get(0),
        )?;

        if ferme_exists == 0 {
            return Err(AppError::validation_error(
                "ferme_id",
                "La ferme spécifiée n'existe pas"
            ));
        }

        // Retourner tous les numéros de bâtiments disponibles
        // Les bâtiments peuvent être réutilisés dans différentes bandes
        let all_numbers: Vec<String> = (1..=20).map(|i| i.to_string()).collect();

        Ok(all_numbers)
    }
}
