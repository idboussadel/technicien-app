// Placeholder for semaine repository - will be implemented after services
use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Semaine, CreateSemaine, UpdateSemaine};
use std::sync::Arc;

pub trait SemaineRepositoryTrait: Send + Sync {
    async fn create(&self, semaine: CreateSemaine) -> AppResult<Semaine>;
    async fn get_all(&self) -> AppResult<Vec<Semaine>>;
    async fn get_by_id(&self, id: i64) -> AppResult<Semaine>;
    async fn update(&self, semaine: UpdateSemaine) -> AppResult<Semaine>;
    async fn delete(&self, id: i64) -> AppResult<()>;
    async fn get_by_batiment(&self, batiment_id: i64) -> AppResult<Vec<Semaine>>;
}

pub struct SemaineRepository {
    db: Arc<DatabaseManager>,
}

impl SemaineRepository {
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }
}

impl SemaineRepositoryTrait for SemaineRepository {
    async fn create(&self, semaine: CreateSemaine) -> AppResult<Semaine> {
        let conn = self.db.get_connection()?;
        
        // Vérifier que le bâtiment existe
        let batiment_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM batiments WHERE id = ?1",
            [semaine.batiment_id],
            |row| row.get(0),
        )?;

        if batiment_exists == 0 {
            return Err(AppError::validation_error(
                "batiment_id",
                "Le bâtiment spécifié n'existe pas"
            ));
        }

        // Insertion de la semaine
        conn.execute(
            "INSERT INTO semaines (batiment_id, numero_semaine, poids) VALUES (?1, ?2, ?3)",
            rusqlite::params![
                semaine.batiment_id,
                semaine.numero_semaine,
                semaine.poids,
            ],
        )?;

        let id = conn.last_insert_rowid();

        Ok(Semaine {
            id: Some(id),
            batiment_id: semaine.batiment_id,
            numero_semaine: semaine.numero_semaine,
            poids: semaine.poids,
        })
    }

    async fn get_all(&self) -> AppResult<Vec<Semaine>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare("SELECT id, batiment_id, numero_semaine, poids FROM semaines ORDER BY batiment_id, numero_semaine")?;
        
        let semaines = stmt.query_map([], |row| {
            Ok(Semaine {
                id: Some(row.get(0)?),
                batiment_id: row.get(1)?,
                numero_semaine: row.get(2)?,
                poids: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(semaines)
    }

    async fn get_by_id(&self, id: i64) -> AppResult<Semaine> {
        let conn = self.db.get_connection()?;
        
        let semaine = conn.query_row(
            "SELECT id, batiment_id, numero_semaine, poids FROM semaines WHERE id = ?1",
            [id],
            |row| Ok(Semaine {
                id: Some(row.get(0)?),
                batiment_id: row.get(1)?,
                numero_semaine: row.get(2)?,
                poids: row.get(3)?,
            }),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Semaine", id),
            _ => AppError::from(e),
        })?;

        Ok(semaine)
    }

    async fn update(&self, semaine: UpdateSemaine) -> AppResult<Semaine> {
        let conn = self.db.get_connection()?;
        
        // Vérifier que le bâtiment existe
        let batiment_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM batiments WHERE id = ?1",
            [semaine.batiment_id],
            |row| row.get(0),
        )?;

        if batiment_exists == 0 {
            return Err(AppError::validation_error(
                "batiment_id",
                "Le bâtiment spécifié n'existe pas"
            ));
        }

        // Mise à jour de la semaine
        let rows_affected = conn.execute(
            "UPDATE semaines SET batiment_id = ?1, numero_semaine = ?2, poids = ?3 WHERE id = ?4",
            rusqlite::params![
                semaine.batiment_id,
                semaine.numero_semaine,
                semaine.poids,
                semaine.id,
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Semaine", semaine.id));
        }

        Ok(Semaine {
            id: Some(semaine.id),
            batiment_id: semaine.batiment_id,
            numero_semaine: semaine.numero_semaine,
            poids: semaine.poids,
        })
    }

    async fn delete(&self, id: i64) -> AppResult<()> {
        let conn = self.db.get_connection()?;
        
        // La suppression cascade est gérée par les contraintes FK
        let rows_affected = conn.execute(
            "DELETE FROM semaines WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Semaine", id));
        }

        Ok(())
    }

    async fn get_by_batiment(&self, batiment_id: i64) -> AppResult<Vec<Semaine>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT id, batiment_id, numero_semaine, poids FROM semaines WHERE batiment_id = ?1 ORDER BY numero_semaine"
        )?;
        
        let semaines = stmt.query_map([batiment_id], |row| {
            Ok(Semaine {
                id: Some(row.get(0)?),
                batiment_id: row.get(1)?,
                numero_semaine: row.get(2)?,
                poids: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(semaines)
    }
}
