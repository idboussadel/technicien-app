use crate::error::{AppError, AppResult};
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::path::Path;

/// Gestionnaire de base de données avec pool de connexions
/// 
/// Ce gestionnaire utilise un pool de connexions pour optimiser les performances
/// et éviter les problèmes de verrouillage de base de données SQLite.
pub struct DatabaseManager {
    pub pool: Pool<SqliteConnectionManager>,
}

impl DatabaseManager {
    /// Crée un nouveau gestionnaire de base de données
    /// 
    /// # Arguments
    /// * `database_path` - Le chemin vers le fichier de base de données SQLite
    /// 
    /// # Returns
    /// Un `AppResult<DatabaseManager>` contenant le gestionnaire ou une erreur
    pub fn new<P: AsRef<Path>>(database_path: P) -> AppResult<Self> {
        // Configuration du gestionnaire de connexions SQLite
        let manager = SqliteConnectionManager::file(database_path)
            .with_init(|conn| {
                // Configuration de la connexion SQLite pour de meilleures performances
                conn.execute_batch(
                    "
                    PRAGMA foreign_keys = ON;
                    PRAGMA journal_mode = WAL;
                    PRAGMA synchronous = NORMAL;
                    PRAGMA cache_size = 1000;
                    PRAGMA temp_store = memory;
                    ",
                )?;
                Ok(())
            });

        // Configuration du pool de connexions
        let pool = Pool::builder()
            .max_size(15) // Maximum 15 connexions simultanées
            .min_idle(Some(5)) // Minimum 5 connexions en attente
            .build(manager)
            .map_err(AppError::from)?;

        Ok(DatabaseManager { pool })
    }

    /// Obtient une connexion du pool
    /// 
    /// # Returns
    /// Une connexion SQLite prête à être utilisée
    pub fn get_connection(&self) -> AppResult<r2d2::PooledConnection<SqliteConnectionManager>> {
        self.pool.get().map_err(AppError::from)
    }

    /// Initialise le schéma de base de données
    /// 
    /// Crée toutes les tables et index nécessaires pour l'application
    /// si elles n'existent pas déjà.
    pub fn initialize_schema(&self) -> AppResult<()> {
        let conn = self.get_connection()?;
        
        // Création de la table users (pour l'authentification)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Création de la table fermes
        conn.execute(
            "CREATE TABLE IF NOT EXISTS fermes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL UNIQUE,
                nbr_meuble INTEGER NOT NULL DEFAULT 0
            )",
            [],
        )?;

        // Création de la table personnel
        conn.execute(
            "CREATE TABLE IF NOT EXISTS personnel (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL UNIQUE,
                telephone TEXT UNIQUE,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Création de la table soins
        conn.execute(
            "CREATE TABLE IF NOT EXISTS soins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL UNIQUE,
                unit TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Création de la table bandes
        conn.execute(
            "CREATE TABLE IF NOT EXISTS bandes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date_entree DATE NOT NULL,
                ferme_id INTEGER NOT NULL,
                notes TEXT,
                FOREIGN KEY (ferme_id) REFERENCES fermes(id) ON DELETE RESTRICT
            )",
            [],
        )?;

        // Création de la table batiments
        conn.execute(
            "CREATE TABLE IF NOT EXISTS batiments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bande_id INTEGER NOT NULL,
                numero_batiment TEXT NOT NULL,
                type_poussin TEXT NOT NULL,
                personnel_id INTEGER NOT NULL,
                quantite INTEGER NOT NULL,
                FOREIGN KEY (bande_id) REFERENCES bandes(id) ON DELETE CASCADE,
                FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE RESTRICT
            )",
            [],
        )?;

        // Création de la table semaines
        conn.execute(
            "CREATE TABLE IF NOT EXISTS semaines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batiment_id INTEGER NOT NULL,
                numero_semaine INTEGER NOT NULL CHECK (numero_semaine BETWEEN 1 AND 9),
                poids REAL,
                FOREIGN KEY (batiment_id) REFERENCES batiments(id) ON DELETE CASCADE,
                UNIQUE(batiment_id, numero_semaine)
            )",
            [],
        )?;

        // Création de la table suivi_quotidien
        conn.execute(
            "CREATE TABLE IF NOT EXISTS suivi_quotidien (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                semaine_id INTEGER NOT NULL,
                age INTEGER NOT NULL CHECK (age > 0),
                deces_par_jour INTEGER,
                deces_total INTEGER,
                alimentation_par_jour REAL,
                alimentation_total REAL,
                soins_id INTEGER,
                soins_quantite TEXT,
                analyses TEXT,
                remarques TEXT,
                FOREIGN KEY (semaine_id) REFERENCES semaines(id) ON DELETE CASCADE,
                FOREIGN KEY (soins_id) REFERENCES soins(id) ON DELETE SET NULL,
                UNIQUE(semaine_id, age)
            )",
            [],
        )?;

        // Création des index pour optimiser les performances
        self.create_indexes(&conn)?;

        Ok(())
    }

    /// Crée les index de performance pour les requêtes fréquentes
    /// 
    /// # Arguments
    /// * `conn` - La connexion à la base de données
    fn create_indexes(&self, conn: &Connection) -> AppResult<()> {
        // Index pour les recherches d'utilisateurs par nom d'utilisateur
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
            [],
        )?;

        // Index pour les recherches d'utilisateurs par email
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            [],
        )?;

        // Index pour les recherches de bandes par ferme
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_bandes_ferme_id ON bandes(ferme_id)",
            [],
        )?;

        // Index pour les recherches de bandes par date
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_bandes_date_entree ON bandes(date_entree)",
            [],
        )?;

        // Index pour les recherches de batiments par bande
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_batiments_bande_id ON batiments(bande_id)",
            [],
        )?;

        // Index pour les recherches de batiments par personnel
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_batiments_personnel_id ON batiments(personnel_id)",
            [],
        )?;

        // Index pour les recherches de semaines par batiment
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_semaines_batiment_id ON semaines(batiment_id)",
            [],
        )?;

        // Index pour les recherches de suivi quotidien par semaine
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_suivi_quotidien_semaine_id ON suivi_quotidien(semaine_id)",
            [],
        )?;

        // Index pour les recherches de suivi quotidien par âge
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_suivi_quotidien_age ON suivi_quotidien(age)",
            [],
        )?;

        // Index pour les recherches de soins
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_suivi_quotidien_soins_id ON suivi_quotidien(soins_id)",
            [],
        )?;

        Ok(())
    }

}
