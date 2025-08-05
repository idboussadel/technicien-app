use serde::{Deserialize, Serialize};

/// Modèle représentant un utilisateur dans le système
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Structure pour créer un nouvel utilisateur
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUser {
    pub username: String,
    pub email: String,
    pub password: String,
    pub registration_code: String,
}

/// Structure pour la connexion d'un utilisateur
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginUser {
    pub username: String,
    pub password: String,
}

/// Structure pour la réponse d'authentification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub user: UserPublic,
    pub token: String,
}

/// Structure publique de l'utilisateur (sans mot de passe)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPublic {
    pub id: i64,
    pub username: String,
    pub email: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        UserPublic {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }
    }
}
