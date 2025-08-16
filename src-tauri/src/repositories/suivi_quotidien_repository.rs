// Placeholder for suivi quotidien repository - will be implemented after services
use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{SuiviQuotidien, SuiviQuotidienWithDetails, CreateSuiviQuotidien, UpdateSuiviQuotidien};
use std::sync::Arc;

pub trait SuiviQuotidienRepositoryTrait: Send + Sync {
    async fn create(&self, suivi: CreateSuiviQuotidien) -> AppResult<SuiviQuotidien>;
    async fn get_all(&self) -> AppResult<Vec<SuiviQuotidienWithDetails>>;
    async fn get_by_id(&self, id: i64) -> AppResult<SuiviQuotidienWithDetails>;
    async fn update(&self, suivi: UpdateSuiviQuotidien) -> AppResult<SuiviQuotidien>;
    async fn delete(&self, id: i64) -> AppResult<()>;
    async fn get_by_semaine(&self, semaine_id: i64) -> AppResult<Vec<SuiviQuotidienWithDetails>>;
}

pub struct SuiviQuotidienRepository {
    db: Arc<DatabaseManager>,
}

impl SuiviQuotidienRepository {
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }
}

impl SuiviQuotidienRepositoryTrait for SuiviQuotidienRepository {
    async fn create(&self, suivi: CreateSuiviQuotidien) -> AppResult<SuiviQuotidien> {
        let conn = self.db.get_connection()?;
        
        // Vérifier que la semaine existe
        let semaine_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM semaines WHERE id = ?1",
            [suivi.semaine_id],
            |row| row.get(0),
        )?;

        if semaine_exists == 0 {
            return Err(AppError::validation_error(
                "semaine_id",
                "La semaine spécifiée n'existe pas"
            ));
        }

        // Insertion du suivi quotidien
        conn.execute(
            "INSERT INTO suivi_quotidien (
                semaine_id, age, deces_par_jour, 
                alimentation_par_jour, 
                soins_id, soins_quantite, analyses, remarques
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                suivi.semaine_id,
                suivi.age,
                suivi.deces_par_jour,
                suivi.alimentation_par_jour,
                suivi.soins_id,
                suivi.soins_quantite,
                suivi.analyses,
                suivi.remarques,
            ],
        )?;

        let id = conn.last_insert_rowid();

        Ok(SuiviQuotidien {
            id: Some(id),
            semaine_id: suivi.semaine_id,
            age: suivi.age,
            deces_par_jour: suivi.deces_par_jour,
            alimentation_par_jour: suivi.alimentation_par_jour,
            soins_id: suivi.soins_id,
            soins_quantite: suivi.soins_quantite,
            analyses: suivi.analyses,
            remarques: suivi.remarques,
        })
    }

    async fn get_all(&self) -> AppResult<Vec<SuiviQuotidienWithDetails>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT sq.id, sq.semaine_id, sq.age, sq.deces_par_jour,
                    sq.alimentation_par_jour, sq.soins_id, 
                    s.nom as soins_nom, s.unit as soins_unit, sq.soins_quantite, sq.analyses, sq.remarques
             FROM suivi_quotidien sq
             LEFT JOIN soins s ON sq.soins_id = s.id
             ORDER BY sq.semaine_id, sq.age"
        )?;
        
        let suivis = stmt.query_map([], |row| {
            Ok(SuiviQuotidienWithDetails {
                id: Some(row.get(0)?),
                semaine_id: row.get(1)?,
                age: row.get(2)?,
                deces_par_jour: row.get(3)?,
                alimentation_par_jour: row.get(4)?,
                soins_id: row.get(5)?,
                soins_nom: row.get(6)?,
                soins_unit: row.get(7)?,
                soins_quantite: row.get(8)?,
                analyses: row.get(9)?,
                remarques: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(suivis)
    }

    async fn get_by_id(&self, id: i64) -> AppResult<SuiviQuotidienWithDetails> {
        let conn = self.db.get_connection()?;
        
        let suivi = conn.query_row(
            "SELECT sq.id, sq.semaine_id, sq.age, sq.deces_par_jour,
                    sq.alimentation_par_jour, sq.soins_id, 
                    s.nom as soins_nom, s.unit as soins_unit, sq.soins_quantite, sq.analyses, sq.remarques
             FROM suivi_quotidien sq
             LEFT JOIN soins s ON sq.soins_id = s.id
             WHERE sq.id = ?1",
            [id],
            |row| Ok(SuiviQuotidienWithDetails {
                id: Some(row.get(0)?),
                semaine_id: row.get(1)?,
                age: row.get(2)?,
                deces_par_jour: row.get(3)?,
                alimentation_par_jour: row.get(4)?,
                soins_id: row.get(5)?,
                soins_nom: row.get(6)?,
                soins_unit: row.get(7)?,
                soins_quantite: row.get(8)?,
                analyses: row.get(9)?,
                remarques: row.get(10)?,
            }),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("SuiviQuotidien", id),
            _ => AppError::from(e),
        })?;

        Ok(suivi)
    }

    async fn update(&self, suivi: UpdateSuiviQuotidien) -> AppResult<SuiviQuotidien> {
        let conn = self.db.get_connection()?;
        
        // Vérifier que la semaine existe
        let semaine_exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM semaines WHERE id = ?1",
            [suivi.semaine_id],
            |row| row.get(0),
        )?;

        if semaine_exists == 0 {
            return Err(AppError::validation_error(
                "semaine_id",
                "La semaine spécifiée n'existe pas"
            ));
        }

        // Mise à jour du suivi quotidien
        let rows_affected = conn.execute(
            "UPDATE suivi_quotidien SET 
                semaine_id = ?1, age = ?2, deces_par_jour = ?3,
                alimentation_par_jour = ?4,
                soins_id = ?5, soins_quantite = ?6, analyses = ?7, remarques = ?8
             WHERE id = ?9",
            rusqlite::params![
                suivi.semaine_id,
                suivi.age,
                suivi.deces_par_jour,
                suivi.alimentation_par_jour,
                suivi.soins_id,
                suivi.soins_quantite,
                suivi.analyses,
                suivi.remarques,
                suivi.id,
            ],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("SuiviQuotidien", suivi.id));
        }

        Ok(SuiviQuotidien {
            id: Some(suivi.id),
            semaine_id: suivi.semaine_id,
            age: suivi.age,
            deces_par_jour: suivi.deces_par_jour,
            alimentation_par_jour: suivi.alimentation_par_jour,
            soins_id: suivi.soins_id,
            soins_quantite: suivi.soins_quantite,
            analyses: suivi.analyses,
            remarques: suivi.remarques,
        })
    }

    async fn delete(&self, id: i64) -> AppResult<()> {
        let conn = self.db.get_connection()?;
        
        let rows_affected = conn.execute(
            "DELETE FROM suivi_quotidien WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("SuiviQuotidien", id));
        }

        Ok(())
    }

    async fn get_by_semaine(&self, semaine_id: i64) -> AppResult<Vec<SuiviQuotidienWithDetails>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT sq.id, sq.semaine_id, sq.age, sq.deces_par_jour,
                    sq.alimentation_par_jour, sq.soins_id, 
                    s.nom as soins_nom, s.unit as soins_unit, sq.soins_quantite, sq.analyses, sq.remarques
             FROM suivi_quotidien sq
             LEFT JOIN soins s ON sq.soins_id = s.id
             WHERE sq.semaine_id = ?1
             ORDER BY sq.age"
        )?;
        
        let suivis = stmt.query_map([semaine_id], |row| {
            Ok(SuiviQuotidienWithDetails {
                id: Some(row.get(0)?),
                semaine_id: row.get(1)?,
                age: row.get(2)?,
                deces_par_jour: row.get(3)?,
                alimentation_par_jour: row.get(4)?,
                soins_id: row.get(5)?,
                soins_nom: row.get(6)?,
                soins_unit: row.get(7)?,
                soins_quantite: row.get(8)?,
                analyses: row.get(9)?,
                remarques: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(suivis)
    }
}
