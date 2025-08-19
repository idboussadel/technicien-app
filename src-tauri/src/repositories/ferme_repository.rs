use crate::database::DatabaseManager;
use crate::error::{AppError, AppResult};
use crate::models::{Ferme, CreateFerme, UpdateFerme, Bande};
use std::sync::Arc;
use chrono::{Utc, Datelike};
use r2d2::PooledConnection;
use r2d2_sqlite::SqliteConnectionManager;

/// Statistiques globales du système
#[derive(Debug, serde::Serialize)]
pub struct GlobalStatistics {
    pub total_fermes: i32,
    pub total_bandes: i32,
    pub bandes_par_ferme: Vec<BandeParFerme>,
    pub maladies_par_ferme: Vec<FermeMaladieStats>,
}

/// Statistiques des bandes par ferme
#[derive(Debug, serde::Serialize)]
pub struct BandeParFerme {
    pub ferme_nom: String,
    pub total_bandes: i32,
    pub latest_bande_info: Option<LatestBandeInfo>,
}

/// Informations sur la dernière bande d'une ferme
#[derive(Debug, serde::Serialize)]
pub struct LatestBandeInfo {
    pub bande_id: i64,
    pub numero_bande: i32,
    pub date_entree: String,
    pub alimentation_contour: Option<f64>,
}

/// Statistiques des maladies par ferme
#[derive(Debug, serde::Serialize)]
pub struct FermeMaladieStats {
    pub ferme_nom: String,
    pub maladie_nom: String,
    pub total_bandes_affectees: i32,
    pub total_bandes_ferme: i32,
    pub pourcentage_affectees: f64,
}



/// Données de décès pour une bande spécifique
#[derive(Debug, serde::Serialize)]
pub struct BandeDeathData {
    pub bande_nom: String,
    pub entry_date: String,
    pub total_deaths: i32,
}

/// Récupère les statistiques des maladies par ferme pour l'année en cours (version synchrone)
/// 
/// # Arguments
/// * `conn` - La connexion à la base de données
/// * `current_year` - L'année en cours
/// 
/// # Returns
/// Les statistiques des maladies par ferme
fn get_maladie_statistics_sync(
    conn: &PooledConnection<SqliteConnectionManager>,
    current_year: u32,
) -> AppResult<Vec<FermeMaladieStats>> {
    // Récupérer toutes les fermes avec leurs bandes de l'année en cours et leurs maladies
    let mut stmt = conn.prepare(
        "SELECT 
            f.nom as ferme_nom,
            m.nom as maladie_nom,
            COUNT(DISTINCT b.id) as total_bandes_affectees,
            (
                SELECT COUNT(DISTINCT b2.id) 
                FROM bandes b2 
                WHERE b2.ferme_id = f.id 
                AND CAST(strftime('%Y', b2.date_entree) AS INTEGER) = ?
            ) as total_bandes_ferme
         FROM fermes f
         JOIN bandes b ON f.id = b.ferme_id
         JOIN batiments bat ON b.id = bat.bande_id
         JOIN batiment_maladies bm ON bat.id = bm.batiment_id
         JOIN maladies m ON bm.maladie_id = m.id
         WHERE CAST(strftime('%Y', b.date_entree) AS INTEGER) = ?
         GROUP BY f.id, f.nom, m.id, m.nom
         ORDER BY f.nom, total_bandes_affectees DESC"
    )?;
    
    let mut maladies_par_ferme = Vec::new();
    
    for row in stmt.query_map([current_year as i64, current_year as i64], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
        ))
    })? {
        let (ferme_nom, maladie_nom, total_bandes_affectees, total_bandes_ferme) = row?;
        
        let pourcentage = if total_bandes_ferme > 0 {
            (total_bandes_affectees as f64 / total_bandes_ferme as i64 as f64) * 100.0
        } else {
            0.0
        };
        
        maladies_par_ferme.push(FermeMaladieStats {
            ferme_nom,
            maladie_nom,
            total_bandes_affectees: total_bandes_affectees as i32,
            total_bandes_ferme: total_bandes_ferme as i32,
            pourcentage_affectees: pourcentage,
        });
    }
    
    Ok(maladies_par_ferme)
}



/// Trait pour les opérations sur les fermes
/// 
/// Définit l'interface pour toutes les opérations CRUD
/// sur les entités ferme dans le système.
pub trait FermeRepositoryTrait: Send + Sync {
    /// Crée une nouvelle ferme
    /// 
    /// # Arguments
    /// * `ferme` - Les données de la ferme à créer
    /// 
    /// # Returns
    /// La ferme créée avec son ID généré
    async fn create(&self, ferme: CreateFerme) -> AppResult<Ferme>;

    /// Récupère toutes les fermes
    /// 
    /// # Returns
    /// Une liste de toutes les fermes dans le système
    async fn get_all(&self) -> AppResult<Vec<Ferme>>;

    /// Récupère une ferme par son ID
    /// 
    /// # Arguments
    /// * `id` - L'ID de la ferme à récupérer
    /// 
    /// # Returns
    /// La ferme correspondante ou une erreur si non trouvée
    async fn get_by_id(&self, id: i64) -> AppResult<Ferme>;

    /// Met à jour une ferme existante
    /// 
    /// # Arguments
    /// * `ferme` - Les nouvelles données de la ferme
    /// 
    /// # Returns
    /// La ferme mise à jour
    async fn update(&self, ferme: UpdateFerme) -> AppResult<Ferme>;

    /// Supprime une ferme
    /// 
    /// # Arguments
    /// * `id` - L'ID de la ferme à supprimer
    /// 
    /// # Returns
    /// Un résultat indiquant le succès ou l'échec
    async fn delete(&self, id: i64) -> AppResult<()>;

    /// Recherche des fermes par nom (partiel)
    /// 
    /// # Arguments
    /// * `nom` - Le nom ou partie du nom à rechercher
    /// 
    /// # Returns
    /// Une liste des fermes correspondant à la recherche
    async fn search_by_name(&self, nom: &str) -> AppResult<Vec<Ferme>>;

    /// Récupère toutes les bandes d'une ferme
    /// 
    /// # Arguments
    /// * `ferme_id` - L'ID de la ferme
    /// 
    /// # Returns
    /// Une liste des bandes de la ferme
    async fn get_bandes_by_ferme(&self, ferme_id: i64) -> AppResult<Vec<Bande>>;

    /// Récupère les statistiques globales de toutes les fermes
    /// 
    /// # Returns
    /// Les statistiques globales du système
    async fn get_global_statistics(&self) -> AppResult<GlobalStatistics>;

    /// Récupère le total des décès pour une bande spécifique
    /// 
    /// # Arguments
    /// * `bande_id` - L'ID de la bande
    /// 
    /// # Returns
    /// Le total des décès pour cette bande
    async fn get_deaths_for_bande(&self, bande_id: i64) -> AppResult<i32>;




}

/// Implémentation du repository pour les fermes
/// 
/// Utilise SQLite avec un pool de connexions pour
/// optimiser les performances et éviter les conflits.
pub struct FermeRepository {
    db: Arc<DatabaseManager>,
}

impl FermeRepository {
    /// Crée une nouvelle instance du repository
    /// 
    /// # Arguments
    /// * `db` - Le gestionnaire de base de données partagé
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { db }
    }
}

impl FermeRepositoryTrait for FermeRepository {
    async fn create(&self, ferme: CreateFerme) -> AppResult<Ferme> {
        let conn = self.db.get_connection()?;
        
        // Validation des données d'entrée
        if ferme.nom.trim().is_empty() {
            return Err(AppError::validation_error(
                "nom", 
                "Le nom de la ferme ne peut pas être vide"
            ));
        }

        if ferme.nbr_meuble < 0 {
            return Err(AppError::validation_error(
                "nbr_meuble", 
                "Le nombre de meubles ne peut pas être négatif"
            ));
        }

        // Vérifier que le nom n'existe pas déjà
        let existing: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM fermes WHERE nom = ?1",
            [&ferme.nom],
            |row| row.get(0),
        );

        if let Ok(count) = existing {
            if count > 0 {
                return Err(AppError::validation_error(
                    "nom",
                    "Une ferme avec ce nom existe déjà"
                ));
            }
        }

        // Insertion de la nouvelle ferme
        conn.execute(
            "INSERT INTO fermes (nom, nbr_meuble) VALUES (?1, ?2)",
            [&ferme.nom, &ferme.nbr_meuble.to_string()],
        )?;

        let id = conn.last_insert_rowid();

        Ok(Ferme {
            id: Some(id),
            nom: ferme.nom,
            nbr_meuble: ferme.nbr_meuble,
        })
    }

    async fn get_all(&self) -> AppResult<Vec<Ferme>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare("SELECT id, nom, nbr_meuble FROM fermes ORDER BY nom")?;
        
        let fermes = stmt.query_map([], |row| {
            Ok(Ferme {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                nbr_meuble: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(fermes)
    }

    async fn get_by_id(&self, id: i64) -> AppResult<Ferme> {
        let conn = self.db.get_connection()?;
        
        let ferme = conn.query_row(
            "SELECT id, nom, nbr_meuble FROM fermes WHERE id = ?1",
            [id],
            |row| Ok(Ferme {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                nbr_meuble: row.get(2)?,
            }),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::not_found("Ferme", id),
            _ => AppError::from(e),
        })?;

        Ok(ferme)
    }

    async fn update(&self, ferme: UpdateFerme) -> AppResult<Ferme> {
        let conn = self.db.get_connection()?;
        
        // Validation des données d'entrée
        if ferme.nom.trim().is_empty() {
            return Err(AppError::validation_error(
                "nom", 
                "Le nom de la ferme ne peut pas être vide"
            ));
        }

        if ferme.nbr_meuble < 0 {
            return Err(AppError::validation_error(
                "nbr_meuble", 
                "Le nombre de meubles ne peut pas être négatif"
            ));
        }

        // Vérifier que le nom n'existe pas déjà pour une autre ferme
        let existing: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM fermes WHERE nom = ?1 AND id != ?2",
            [&ferme.nom, &ferme.id.to_string()],
            |row| row.get(0),
        );

        if let Ok(count) = existing {
            if count > 0 {
                return Err(AppError::validation_error(
                    "nom",
                    "Une autre ferme avec ce nom existe déjà"
                ));
            }
        }

        // Mise à jour de la ferme
        let rows_affected = conn.execute(
            "UPDATE fermes SET nom = ?1, nbr_meuble = ?2 WHERE id = ?3",
            [&ferme.nom, &ferme.nbr_meuble.to_string(), &ferme.id.to_string()],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Ferme", ferme.id));
        }

        Ok(Ferme {
            id: Some(ferme.id),
            nom: ferme.nom,
            nbr_meuble: ferme.nbr_meuble,
        })
    }

    async fn delete(&self, id: i64) -> AppResult<()> {
        let conn = self.db.get_connection()?;
        
        // Vérifier s'il y a des bandes liées à cette ferme
        let bande_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bandes WHERE ferme_id = ?1",
            [id],
            |row| row.get(0),
        )?;

        if bande_count > 0 {
            return Err(AppError::constraint_violation(
                "Impossible de supprimer la ferme car elle contient des bandes"
            ));
        }

        // Suppression de la ferme
        let rows_affected = conn.execute(
            "DELETE FROM fermes WHERE id = ?1",
            [id],
        )?;

        if rows_affected == 0 {
            return Err(AppError::not_found("Ferme", id));
        }

        Ok(())
    }

    async fn search_by_name(&self, nom: &str) -> AppResult<Vec<Ferme>> {
        let conn = self.db.get_connection()?;
        
        let search_pattern = format!("%{}%", nom);
        let mut stmt = conn.prepare(
            "SELECT id, nom, nbr_meuble FROM fermes WHERE nom LIKE ?1 ORDER BY nom"
        )?;
        
        let fermes = stmt.query_map([search_pattern], |row| {
            Ok(Ferme {
                id: Some(row.get(0)?),
                nom: row.get(1)?,
                nbr_meuble: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(fermes)
    }

    async fn get_bandes_by_ferme(&self, ferme_id: i64) -> AppResult<Vec<Bande>> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT id, numero_bande, date_entree, ferme_id, notes FROM bandes WHERE ferme_id = ?1 ORDER BY date_entree"
        )?;
        
        let bandes = stmt.query_map([ferme_id], |row| {
            Ok(Bande {
                id: Some(row.get(0)?),
                numero_bande: row.get(1)?,
                date_entree: row.get(2)?,
                ferme_id: row.get(3)?,
                notes: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(bandes)
    }

    async fn get_global_statistics(&self) -> AppResult<GlobalStatistics> {
        let conn = self.db.get_connection()?;
        
        // Récupérer le nombre total de fermes
        let total_fermes: i64 = conn.query_row(
            "SELECT COUNT(*) FROM fermes",
            [],
            |row| row.get(0),
        )?;

        // Récupérer le nombre total de bandes de l'année en cours
        let current_year = Utc::now().year_ce().1;
        let total_bandes: i64 = conn.query_row(
            "SELECT COUNT(*) FROM bandes WHERE strftime('%Y', date_entree) = ?1",
            [&current_year.to_string()],
            |row| row.get(0),
        )?;

        // Récupérer toutes les fermes avec info sur la dernière bande (toutes années confondues)
        let mut stmt = conn.prepare(
            "SELECT 
                f.nom, 
                f.id as ferme_id
             FROM fermes f 
             ORDER BY f.nom ASC"
        )?;
        
        let mut bandes_par_ferme = Vec::new();
        
        for row in stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
            ))
        })? {
            let (ferme_nom, ferme_id) = row?;
            
            // Récupérer les informations sur la dernière bande de cette ferme (toutes années confondues)
            let latest_bande_info = {
                let mut latest_bande_stmt = conn.prepare(
                    "SELECT 
                        b.id, b.numero_bande, b.date_entree,
                        COALESCE(b.alimentation_contour, 0) as alimentation_contour
                     FROM bandes b
                     WHERE b.ferme_id = ?1
                     ORDER BY b.date_entree DESC
                     LIMIT 1"
                )?;
                
                let latest_bande = latest_bande_stmt.query_row([&ferme_id], |row| {
                    Ok(LatestBandeInfo {
                        bande_id: row.get(0)?,
                        numero_bande: row.get(1)?,
                        date_entree: row.get(2)?,
                        alimentation_contour: Some(row.get(3)?),
                    })
                });
                
                latest_bande.ok()
            };
            
            // Compter les bandes de l'année en cours pour l'affichage du graphique
            let total_bandes_current_year: i64 = conn.query_row(
                "SELECT COUNT(*) FROM bandes WHERE ferme_id = ?1 AND CAST(strftime('%Y', date_entree) AS INTEGER) = ?2",
                [&ferme_id, &(current_year as i64)],
                |row| row.get(0),
            ).unwrap_or(0);
            
            bandes_par_ferme.push(BandeParFerme {
                ferme_nom,
                total_bandes: total_bandes_current_year as i32,
                latest_bande_info,
            });
        }

        // Récupérer les statistiques des maladies par ferme
        let maladies_par_ferme = get_maladie_statistics_sync(&conn, current_year)?;

        Ok(GlobalStatistics {
            total_fermes: total_fermes as i32,
            total_bandes: total_bandes as i32,
            bandes_par_ferme,
            maladies_par_ferme,
        })
    }

    /// Récupère le total des décès pour une bande spécifique
    async fn get_deaths_for_bande(&self, bande_id: i64) -> AppResult<i32> {
        let conn = self.db.get_connection()?;
        
        // Récupérer le total des décès depuis suivi_quotidien via les bâtiments de cette bande
        let total_deaths: i64 = conn.query_row(
            "SELECT COALESCE(SUM(sq.deces_par_jour), 0) 
             FROM suivi_quotidien sq
             JOIN semaines s ON sq.semaine_id = s.id
             JOIN batiments b ON s.batiment_id = b.id
             WHERE b.bande_id = ?1",
            [bande_id],
            |row| row.get(0),
        )?;

        Ok(total_deaths as i32)
    }
}
