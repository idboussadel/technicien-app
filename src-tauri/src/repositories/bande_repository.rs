// Placeholder for bande repository - will be implemented after services
use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Bande, BandeWithDetails, CreateBande, UpdateBande};
use std::sync::Arc;

pub trait BandeRepositoryTrait: Send + Sync {
    async fn create(&self, bande: CreateBande) -> AppResult<Bande>;
    async fn get_all(&self) -> AppResult<Vec<BandeWithDetails>>;
    async fn get_by_id(&self, id: i64) -> AppResult<BandeWithDetails>;
    async fn update(&self, bande: UpdateBande) -> AppResult<Bande>;
    async fn delete(&self, id: i64) -> AppResult<()>;
    async fn get_by_ferme(&self, ferme_id: i64) -> AppResult<Vec<BandeWithDetails>>;
    async fn get_by_personnel(&self, personnel_id: i64) -> AppResult<Vec<BandeWithDetails>>;
}

pub struct BandeRepository {
    db: Arc<DatabaseManager>,
}

impl BandeRepository {
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }
}

impl BandeRepositoryTrait for BandeRepository {
    async fn create(&self, bande: CreateBande) -> AppResult<Bande> {
        let conn = self.db.get_connection()?;
        
        // Validation des clés étrangères
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

        let personnel_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM personnel WHERE id = ?1", 
            [bande.personnel_id],
            |row| row.get(0),
        )?;

        if personnel_exists == 0 {
            return Err(AppError::validation_error(
                "personnel_id", 
                "Le personnel spécifié n'existe pas"
            ));
        }

        // Insertion de la bande
        conn.execute(
            "INSERT INTO bandes (date_entree, quantite, ferme_id, numero_batiment, type_poussin, personnel_id, notes) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            [
                &bande.date_entree.to_string(),
                &bande.quantite.to_string(),
                &bande.ferme_id.to_string(),
                &bande.numero_batiment,
                &bande.type_poussin,
                &bande.personnel_id.to_string(),
                &bande.notes.as_ref().unwrap_or(&String::new()),
            ],
        )?;

        let id = conn.last_insert_rowid();

        Ok(Bande {
            id: Some(id),
            date_entree: bande.date_entree,
            quantite: bande.quantite,
            ferme_id: bande.ferme_id,
            numero_batiment: bande.numero_batiment,
            type_poussin: bande.type_poussin,
            personnel_id: bande.personnel_id,
            notes: bande.notes,
        })
    }

    async fn get_all(&self) -> AppResult<Vec<BandeWithDetails>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT b.id, b.date_entree, b.quantite, b.ferme_id, f.nom as ferme_nom,
                    b.numero_batiment, b.type_poussin, b.personnel_id, p.nom as personnel_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             JOIN personnel p ON b.personnel_id = p.id
             ORDER BY b.date_entree DESC"
        )?;
        
        let bandes = stmt.query_map([], |row| {
            Ok(BandeWithDetails {
                id: Some(row.get(0)?),
                date_entree: row.get::<_, String>(1)?.parse().map_err(|_| {
                    rusqlite::Error::InvalidColumnType(1, "date".to_string(), rusqlite::types::Type::Text)
                })?,
                quantite: row.get(2)?,
                ferme_id: row.get(3)?,
                ferme_nom: row.get(4)?,
                numero_batiment: row.get(5)?,
                type_poussin: row.get(6)?,
                personnel_id: row.get(7)?,
                personnel_nom: row.get(8)?,
                notes: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(bandes)
    }

    async fn get_by_id(&self, id: i64) -> AppResult<BandeWithDetails> {
        let conn = self.db.get_connection()?;
        
        let bande = conn.query_row(
            "SELECT b.id, b.date_entree, b.quantite, b.ferme_id, f.nom as ferme_nom,
                    b.numero_batiment, b.type_poussin, b.personnel_id, p.nom as personnel_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             JOIN personnel p ON b.personnel_id = p.id
             WHERE b.id = ?1",
            [id],
            |row| Ok(BandeWithDetails {
                id: Some(row.get(0)?),
                date_entree: row.get::<_, String>(1)?.parse().map_err(|_| {
                    rusqlite::Error::InvalidColumnType(1, "date".to_string(), rusqlite::types::Type::Text)
                })?,
                quantite: row.get(2)?,
                ferme_id: row.get(3)?,
                ferme_nom: row.get(4)?,
                numero_batiment: row.get(5)?,
                type_poussin: row.get(6)?,
                personnel_id: row.get(7)?,
                personnel_nom: row.get(8)?,
                notes: row.get(9)?,
            }),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Bande", id),
            _ => AppError::from(e),
        })?;

        Ok(bande)
    }

    async fn update(&self, bande: UpdateBande) -> AppResult<Bande> {
        let conn = self.db.get_connection()?;
        
        // Validation des clés étrangères
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

        let personnel_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM personnel WHERE id = ?1",
            [bande.personnel_id],
            |row| row.get(0),
        )?;

        if personnel_exists == 0 {
            return Err(AppError::validation_error(
                "personnel_id",
                "Le personnel spécifié n'existe pas"
            ));
        }

        // Mise à jour de la bande
        let rows_affected = conn.execute(
            "UPDATE bandes SET date_entree = ?1, quantite = ?2, ferme_id = ?3, numero_batiment = ?4, 
                               type_poussin = ?5, personnel_id = ?6, notes = ?7 WHERE id = ?8",
            [
                &bande.date_entree.to_string(),
                &bande.quantite.to_string(),
                &bande.ferme_id.to_string(),
                &bande.numero_batiment,
                &bande.type_poussin,
                &bande.personnel_id.to_string(),
                &bande.notes.as_ref().unwrap_or(&String::new()),
                &bande.id.to_string(),
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Bande", bande.id));
        }

        Ok(Bande {
            id: Some(bande.id),
            date_entree: bande.date_entree,
            quantite: bande.quantite,
            ferme_id: bande.ferme_id,
            numero_batiment: bande.numero_batiment,
            type_poussin: bande.type_poussin,
            personnel_id: bande.personnel_id,
            notes: bande.notes,
        })
    }

    async fn delete(&self, id: i64) -> AppResult<()> {
        let conn = self.db.get_connection()?;
        
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

    async fn get_by_ferme(&self, ferme_id: i64) -> AppResult<Vec<BandeWithDetails>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT b.id, b.date_entree, b.quantite, b.ferme_id, f.nom as ferme_nom,
                    b.numero_batiment, b.type_poussin, b.personnel_id, p.nom as personnel_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             JOIN personnel p ON b.personnel_id = p.id
             WHERE b.ferme_id = ?1
             ORDER BY b.date_entree DESC"
        )?;
        
        let bandes = stmt.query_map([ferme_id], |row| {
            Ok(BandeWithDetails {
                id: Some(row.get(0)?),
                date_entree: row.get::<_, String>(1)?.parse().map_err(|_| {
                    rusqlite::Error::InvalidColumnType(1, "date".to_string(), rusqlite::types::Type::Text)
                })?,
                quantite: row.get(2)?,
                ferme_id: row.get(3)?,
                ferme_nom: row.get(4)?,
                numero_batiment: row.get(5)?,
                type_poussin: row.get(6)?,
                personnel_id: row.get(7)?,
                personnel_nom: row.get(8)?,
                notes: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(bandes)
    }

    async fn get_by_personnel(&self, personnel_id: i64) -> AppResult<Vec<BandeWithDetails>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT b.id, b.date_entree, b.quantite, b.ferme_id, f.nom as ferme_nom,
                    b.numero_batiment, b.type_poussin, b.personnel_id, p.nom as personnel_nom, b.notes
             FROM bandes b
             JOIN fermes f ON b.ferme_id = f.id
             JOIN personnel p ON b.personnel_id = p.id
             WHERE b.personnel_id = ?1
             ORDER BY b.date_entree DESC"
        )?;
        
        let bandes = stmt.query_map([personnel_id], |row| {
            Ok(BandeWithDetails {
                id: Some(row.get(0)?),
                date_entree: row.get::<_, String>(1)?.parse().map_err(|_| {
                    rusqlite::Error::InvalidColumnType(1, "date".to_string(), rusqlite::types::Type::Text)
                })?,
                quantite: row.get(2)?,
                ferme_id: row.get(3)?,
                ferme_nom: row.get(4)?,
                numero_batiment: row.get(5)?,
                type_poussin: row.get(6)?,
                personnel_id: row.get(7)?,
                personnel_nom: row.get(8)?,
                notes: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(bandes)
    }
}
