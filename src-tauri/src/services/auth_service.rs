use crate::database::DatabaseManager;
use crate::models::{User, CreateUser, LoginUser, UserPublic, AuthResponse};
use crate::repositories::{UserRepository, UserRepositoryTrait};
use crate::commands::auth_commands::{UpdateProfileData, UpdatePasswordData};
use crate::error::AppError;
use std::sync::Arc;
use uuid::Uuid;
use std::collections::HashMap;
use std::sync::Mutex;

/// Service pour la gestion de l'authentification
pub struct AuthService {
    db_manager: Arc<DatabaseManager>,
    // Stockage simple en mémoire des tokens (pour une vraie app, utiliser Redis ou JWT)
    active_tokens: Arc<Mutex<HashMap<String, i64>>>, // token -> user_id
}

impl AuthService {
    pub fn new(db_manager: Arc<DatabaseManager>) -> Self {
        Self {
            db_manager,
            active_tokens: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Enregistre un nouvel utilisateur avec un code de registration
    pub async fn register(&self, user_data: CreateUser) -> Result<AuthResponse, AppError> {
        // Vérifie le code de registration (code secret hardcodé pour simplifier)
        const SECRET_CODE: &str = "FERME2024";
        if user_data.registration_code != SECRET_CODE {
            return Err(AppError::validation_error("registration_code", "Code d'enregistrement invalide"));
        }

        let conn = self.db_manager.get_connection()?;
        let repository = UserRepository::new(&conn);

        // Vérifie si l'utilisateur existe déjà
        if repository.user_exists(&user_data.username, &user_data.email)? {
            return Err(AppError::validation_error("user", "Un utilisateur avec ce nom d'utilisateur ou cet email existe déjà"));
        }

        // Valide les données
        self.validate_user_data(&user_data)?;

        // Crée l'utilisateur
        let user = repository.create_user(user_data)?;

        // Génère un token
        let token = self.generate_token(&user)?;

        Ok(AuthResponse {
            user: user.into(),
            token,
        })
    }

    /// Authentifie un utilisateur
    pub async fn login(&self, login_data: LoginUser) -> Result<AuthResponse, AppError> {
        let conn = self.db_manager.get_connection()?;
        let repository = UserRepository::new(&conn);

        // Authentifie l'utilisateur
        match repository.authenticate_user(login_data)? {
            Some(user) => {
                let token = self.generate_token(&user)?;
                Ok(AuthResponse {
                    user: user.into(),
                    token,
                })
            }
            None => Err(AppError::validation_error("credentials", "Nom d'utilisateur ou mot de passe incorrect")),
        }
    }

    /// Déconnecte un utilisateur
    pub async fn logout(&self, token: &str) -> Result<(), AppError> {
        let mut tokens = self.active_tokens.lock()
            .map_err(|_| AppError::business_logic("Failed to lock tokens"))?;
        
        tokens.remove(token);
        Ok(())
    }

    /// Vérifie si un token est valide
    pub async fn verify_token(&self, token: &str) -> Result<Option<UserPublic>, AppError> {
        let tokens = self.active_tokens.lock()
            .map_err(|_| AppError::business_logic("Failed to lock tokens"))?;

        if let Some(&user_id) = tokens.get(token) {
            let conn = self.db_manager.get_connection()?;
            let repository = UserRepository::new(&conn);
            
            if let Some(user) = repository.get_user_by_id(user_id)? {
                return Ok(Some(user.into()));
            }
        }

        Ok(None)
    }

    /// Met à jour le profil utilisateur
    pub async fn update_profile(&self, profile_data: UpdateProfileData) -> Result<UserPublic, AppError> {
        let conn = self.db_manager.get_connection()?;
        let repository = UserRepository::new(&conn);

        // Valide les données du profil
        self.validate_profile_data(&profile_data)?;

        // Met à jour l'utilisateur
        let updated_user = repository.update_user_profile(profile_data)?;

        Ok(updated_user.into())
    }

    /// Met à jour le mot de passe utilisateur
    pub async fn update_password(&self, password_data: UpdatePasswordData) -> Result<(), AppError> {
        let conn = self.db_manager.get_connection()?;
        let repository = UserRepository::new(&conn);

        // Valide le nouveau mot de passe
        if password_data.new_password.len() < 6 {
            return Err(AppError::validation_error("new_password", "Le nouveau mot de passe doit contenir au moins 6 caractères"));
        }

        if password_data.new_password.len() > 255 {
            return Err(AppError::validation_error("new_password", "Le nouveau mot de passe ne peut pas dépasser 255 caractères"));
        }

        // Met à jour le mot de passe
        repository.update_user_password(password_data)?;

        Ok(())
    }

    /// Génère un token pour un utilisateur
    fn generate_token(&self, user: &User) -> Result<String, AppError> {
        let token = Uuid::new_v4().to_string();
        
        let mut tokens = self.active_tokens.lock()
            .map_err(|_| AppError::business_logic("Failed to lock tokens"))?;
        
        tokens.insert(token.clone(), user.id);
        Ok(token)
    }

    /// Valide les données utilisateur
    fn validate_user_data(&self, user_data: &CreateUser) -> Result<(), AppError> {
        // Validation du nom d'utilisateur
        if user_data.username.len() < 3 {
            return Err(AppError::validation_error("username", "Le nom d'utilisateur doit contenir au moins 3 caractères"));
        }

        if user_data.username.len() > 50 {
            return Err(AppError::validation_error("username", "Le nom d'utilisateur ne peut pas dépasser 50 caractères"));
        }

        // Validation de l'email
        if !user_data.email.contains('@') {
            return Err(AppError::validation_error("email", "L'email doit être valide"));
        }

        if user_data.email.len() > 255 {
            return Err(AppError::validation_error("email", "L'email ne peut pas dépasser 255 caractères"));
        }

        // Validation du mot de passe
        if user_data.password.len() < 6 {
            return Err(AppError::validation_error("password", "Le mot de passe doit contenir au moins 6 caractères"));
        }

        if user_data.password.len() > 255 {
            return Err(AppError::validation_error("password", "Le mot de passe ne peut pas dépasser 255 caractères"));
        }

        Ok(())
    }

    /// Valide les données du profil
    fn validate_profile_data(&self, profile_data: &UpdateProfileData) -> Result<(), AppError> {
        // Validation du nom d'utilisateur
        if profile_data.username.len() < 3 {
            return Err(AppError::validation_error("username", "Le nom d'utilisateur doit contenir au moins 3 caractères"));
        }

        if profile_data.username.len() > 50 {
            return Err(AppError::validation_error("username", "Le nom d'utilisateur ne peut pas dépasser 50 caractères"));
        }

        // Validation de l'email
        if !profile_data.email.contains('@') {
            return Err(AppError::validation_error("email", "L'email doit être valide"));
        }

        if profile_data.email.len() > 255 {
            return Err(AppError::validation_error("email", "L'email ne peut pas dépasser 255 caractères"));
        }

        Ok(())
    }
}
