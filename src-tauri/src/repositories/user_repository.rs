use crate::models::{User, CreateUser, LoginUser, UserPublic};
use crate::commands::auth_commands::{UpdateProfileData, UpdatePasswordData};
use crate::error::AppError;
use rusqlite::{params, Connection, Result as SqliteResult};
use bcrypt::{hash, verify, DEFAULT_COST};

/// Trait définissant les opérations sur les utilisateurs
pub trait UserRepositoryTrait {
    fn create_user(&self, user: CreateUser) -> Result<User, AppError>;
    fn authenticate_user(&self, login: LoginUser) -> Result<Option<User>, AppError>;
    fn get_user_by_id(&self, id: i64) -> Result<Option<User>, AppError>;
    fn get_user_by_username(&self, username: &str) -> Result<Option<User>, AppError>;
    fn user_exists(&self, username: &str, email: &str) -> Result<bool, AppError>;
    fn update_user_profile(&self, profile_data: UpdateProfileData) -> Result<User, AppError>;
    fn update_user_password(&self, password_data: UpdatePasswordData) -> Result<(), AppError>;
}

/// Implémentation du repository pour les utilisateurs
pub struct UserRepository<'a> {
    conn: &'a Connection,
}

impl<'a> UserRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    /// Hash un mot de passe avec bcrypt
    fn hash_password(&self, password: &str) -> Result<String, AppError> {
        hash(password, DEFAULT_COST)
            .map_err(|e| AppError::business_logic(&format!("Failed to hash password: {}", e)))
    }

    /// Vérifie un mot de passe avec bcrypt
    fn verify_password(&self, password: &str, hash: &str) -> Result<bool, AppError> {
        verify(password, hash)
            .map_err(|e| AppError::business_logic(&format!("Failed to verify password: {}", e)))
    }
}

impl<'a> UserRepositoryTrait for UserRepository<'a> {
    fn create_user(&self, user: CreateUser) -> Result<User, AppError> {
        // Hash le mot de passe
        let password_hash = self.hash_password(&user.password)?;
        
        let sql = r#"
            INSERT INTO users (username, email, password_hash, created_at, updated_at)
            VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))
        "#;

        self.conn
            .execute(sql, params![user.username, user.email, password_hash])
            .map_err(AppError::from)?;

        let user_id = self.conn.last_insert_rowid();

        // Récupère l'utilisateur créé
        self.get_user_by_id(user_id)?
            .ok_or_else(|| AppError::not_found("User", user_id))
    }

    fn authenticate_user(&self, login: LoginUser) -> Result<Option<User>, AppError> {
        let user = match self.get_user_by_username(&login.username)? {
            Some(user) => user,
            None => return Ok(None),
        };

        // Vérifie le mot de passe
        if self.verify_password(&login.password, &user.password_hash)? {
            Ok(Some(user))
        } else {
            Ok(None)
        }
    }

    fn get_user_by_id(&self, id: i64) -> Result<Option<User>, AppError> {
        let sql = r#"
            SELECT id, username, email, password_hash, created_at, updated_at
            FROM users
            WHERE id = ?1
        "#;

        let mut stmt = self.conn.prepare(sql).map_err(AppError::from)?;
        
        let user_iter = stmt.query_map([id], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
                password_hash: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        }).map_err(AppError::from)?;

        for user in user_iter {
            return Ok(Some(user.map_err(AppError::from)?));
        }

        Ok(None)
    }

    fn get_user_by_username(&self, username: &str) -> Result<Option<User>, AppError> {
        let sql = r#"
            SELECT id, username, email, password_hash, created_at, updated_at
            FROM users
            WHERE username = ?1
        "#;

        let mut stmt = self.conn.prepare(sql).map_err(AppError::from)?;
        
        let user_iter = stmt.query_map([username], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
                password_hash: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        }).map_err(AppError::from)?;

        for user in user_iter {
            return Ok(Some(user.map_err(AppError::from)?));
        }

        Ok(None)
    }

    fn user_exists(&self, username: &str, email: &str) -> Result<bool, AppError> {
        let sql = r#"
            SELECT COUNT(*) as count
            FROM users
            WHERE username = ?1 OR email = ?2
        "#;

        let mut stmt = self.conn.prepare(sql).map_err(AppError::from)?;
        let count: i64 = stmt.query_row([username, email], |row| row.get(0))
            .map_err(AppError::from)?;

        Ok(count > 0)
    }

    fn update_user_profile(&self, profile_data: UpdateProfileData) -> Result<User, AppError> {
        let sql = r#"
            UPDATE users 
            SET username = ?1, email = ?2, updated_at = datetime('now')
            WHERE id = ?3
        "#;

        let affected_rows = self.conn
            .execute(sql, params![profile_data.username, profile_data.email, profile_data.user_id])
            .map_err(AppError::from)?;

        if affected_rows == 0 {
            return Err(AppError::not_found("User", profile_data.user_id));
        }

        // Récupère l'utilisateur mis à jour
        self.get_user_by_id(profile_data.user_id)?
            .ok_or_else(|| AppError::not_found("User", profile_data.user_id))
    }

    fn update_user_password(&self, password_data: UpdatePasswordData) -> Result<(), AppError> {
        // D'abord, récupère l'utilisateur pour vérifier le mot de passe actuel
        let user = self.get_user_by_id(password_data.user_id)?
            .ok_or_else(|| AppError::not_found("User", password_data.user_id))?;

        // Vérifie le mot de passe actuel
        if !self.verify_password(&password_data.current_password, &user.password_hash)? {
            return Err(AppError::validation_error("current_password", "Mot de passe actuel incorrect"));
        }

        // Hash le nouveau mot de passe
        let new_password_hash = self.hash_password(&password_data.new_password)?;
        
        // Met à jour le mot de passe pour cet utilisateur
        let sql_update = r#"
            UPDATE users 
            SET password_hash = ?1, updated_at = datetime('now')
            WHERE id = ?2
        "#;

        self.conn
            .execute(sql_update, params![new_password_hash, password_data.user_id])
            .map_err(AppError::from)?;

        Ok(())
    }
}
