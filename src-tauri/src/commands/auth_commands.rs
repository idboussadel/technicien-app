use crate::database::DatabaseManager;
use crate::models::{CreateUser, LoginUser, AuthResponse, UserPublic};
use crate::services::AuthService;
use std::sync::Arc;
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateProfileData {
    pub user_id: i64,
    pub username: String,
    pub email: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdatePasswordData {
    pub user_id: i64,
    pub current_password: String,
    pub new_password: String,
}

/// Enregistre un nouvel utilisateur
/// 
/// # Arguments
/// * `user_data` - Les données de l'utilisateur à créer
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// La réponse d'authentification avec l'utilisateur et le token ou une erreur
#[tauri::command]
pub async fn register_user(
    user_data: CreateUser,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<AuthResponse, String> {
    let service = AuthService::new(db.inner().clone());
    service.register(user_data).await.map_err(|e| e.to_string())
}

/// Connecte un utilisateur
/// 
/// # Arguments
/// * `login_data` - Les données de connexion
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// La réponse d'authentification avec l'utilisateur et le token ou une erreur
#[tauri::command]
pub async fn login_user(
    login_data: LoginUser,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<AuthResponse, String> {
    let service = AuthService::new(db.inner().clone());
    service.login(login_data).await.map_err(|e| e.to_string())
}

/// Déconnecte un utilisateur
/// 
/// # Arguments
/// * `token` - Le token de l'utilisateur à déconnecter
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// Un succès vide ou une erreur
#[tauri::command]
pub async fn logout_user(
    token: String,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let service = AuthService::new(db.inner().clone());
    service.logout(&token).await.map_err(|e| e.to_string())
}

/// Vérifie la validité d'un token
/// 
/// # Arguments
/// * `token` - Le token à vérifier
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// L'utilisateur correspondant au token ou None si invalide
#[tauri::command]
pub async fn verify_token(
    token: String,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<Option<UserPublic>, String> {
    let service = AuthService::new(db.inner().clone());
    service.verify_token(&token).await.map_err(|e| e.to_string())
}

/// Met à jour le profil utilisateur
/// 
/// # Arguments
/// * `profile_data` - Les nouvelles données du profil
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// L'utilisateur mis à jour ou une erreur
#[tauri::command]
pub async fn update_user_profile(
    profile_data: UpdateProfileData,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<UserPublic, String> {
    let service = AuthService::new(db.inner().clone());
    service.update_profile(profile_data).await.map_err(|e| e.to_string())
}

/// Met à jour le mot de passe utilisateur
/// 
/// # Arguments
/// * `password_data` - Les données du mot de passe
/// * `db` - Le gestionnaire de base de données (injecté par Tauri)
/// 
/// # Returns
/// Un succès vide ou une erreur
#[tauri::command]
pub async fn update_user_password(
    password_data: UpdatePasswordData,
    db: State<'_, Arc<DatabaseManager>>,
) -> Result<(), String> {
    let service = AuthService::new(db.inner().clone());
    service.update_password(password_data).await.map_err(|e| e.to_string())
}
