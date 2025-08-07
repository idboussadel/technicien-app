use crate::error::AppError;
use crate::models::{Bande, BandeWithDetails, BatimentWithDetails, CreateBande, UpdateBande};
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

        // Insertion de la bande
        conn.execute(
            "INSERT INTO bandes (date_entree, ferme_id, notes) VALUES (?1, ?2, ?3)",
            [
                &bande.date_entree.to_string(),
                &bande.ferme_id.to_string(),
                &bande.notes.as_ref().unwrap_or(&String::new()),
            ],
        )?;

        let id = conn.last_insert_rowid();

        Ok(Bande {
            id: Some(id),
            date_entree: bande.date_entree.clone(),
            ferme_id: bande.ferme_id,
            notes: bande.notes.clone(),
        })
    }

    /// Get all bandes with their batiments
    pub fn get_all(
        conn: &PooledConnection<SqliteConnectionManager>,
    ) -> Result<Vec<BandeWithDetails>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT b.id, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             ORDER BY b.date_entree DESC"
        )?;
        
        let bandes_result = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        let mut bandes = Vec::new();
        for (id, date_entree_str, ferme_id, ferme_nom, notes) in bandes_result {
            let date_entree = date_entree_str.parse().map_err(|_| {
                AppError::business_logic("Format de date invalide dans la base de données")
            })?;
            let batiments = Self::load_batiments(conn, id)?;
            bandes.push(BandeWithDetails {
                id: Some(id),
                date_entree,
                ferme_id,
                ferme_nom,
                notes,
                batiments,
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
            "SELECT b.id, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             WHERE b.ferme_id = ?1
             ORDER BY b.date_entree DESC"
        )?;
        
        let bandes_result = stmt.query_map([ferme_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        let mut bandes = Vec::new();
        for (id, date_entree_str, ferme_id, ferme_nom, notes) in bandes_result {
            let date_entree = date_entree_str.parse().map_err(|_| {
                AppError::business_logic("Format de date invalide dans la base de données")
            })?;
            let batiments = Self::load_batiments(conn, id)?;
            bandes.push(BandeWithDetails {
                id: Some(id),
                date_entree,
                ferme_id,
                ferme_nom,
                notes,
                batiments,
            });
        }

        Ok(bandes)
    }

    /// Get a bande by ID with its batiments
    pub fn get_by_id(
        conn: &PooledConnection<SqliteConnectionManager>,
        id: i64,
    ) -> Result<Option<BandeWithDetails>, AppError> {
        let result = conn.query_row(
            "SELECT b.id, b.date_entree, b.ferme_id, f.nom as ferme_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             WHERE b.id = ?1",
            [id],
            |row| Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
            )),
        );

        match result {
            Ok((id, date_entree_str, ferme_id, ferme_nom, notes)) => {
                let date_entree = date_entree_str.parse().map_err(|_| {
                    AppError::business_logic("Format de date invalide dans la base de données")
                })?;
                let batiments = Self::load_batiments(conn, id)?;
                Ok(Some(BandeWithDetails {
                    id: Some(id),
                    date_entree,
                    ferme_id,
                    ferme_nom,
                    notes,
                    batiments,
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
            "UPDATE bandes SET date_entree = ?1, ferme_id = ?2, notes = ?3 WHERE id = ?4",
            [
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
            "SELECT bat.id, bat.bande_id, bat.numero_batiment, bat.type_poussin,
                    bat.personnel_id, p.nom as personnel_nom, bat.quantite
             FROM batiments bat
             JOIN personnel p ON bat.personnel_id = p.id
             WHERE bat.bande_id = ?1
             ORDER BY bat.numero_batiment"
        )?;
        
        let batiments = stmt.query_map([bande_id], |row| {
            Ok(BatimentWithDetails {
                id: Some(row.get(0)?),
                bande_id: row.get(1)?,
                numero_batiment: row.get(2)?,
                type_poussin: row.get(3)?,
                personnel_id: row.get(4)?,
                personnel_nom: row.get(5)?,
                quantite: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(batiments)
    }
}