use thiserror::Error;

/// Erreurs personnalisées pour l'application de gestion de ferme
/// 
/// Ce système d'erreurs fournit des messages d'erreur structurés
/// et typés pour une meilleure gestion des erreurs dans l'application.
#[derive(Debug, Error)]
pub enum AppError {
    /// Erreurs liées à la base de données SQLite
    #[error("Erreur de base de données: {0}")]
    Database(#[from] rusqlite::Error),

    /// Erreurs de sérialisation/désérialisation JSON
    #[error("Erreur de sérialisation: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Erreurs de pool de connexions
    #[error("Erreur de pool de connexions: {0}")]
    ConnectionPool(#[from] r2d2::Error),

    /// Erreur quand une entité n'est pas trouvée
    #[error("Entité non trouvée: {entity} avec l'ID {id}")]
    NotFound { entity: String, id: i64 },

    /// Erreur de validation des données d'entrée
    #[error("{message}")]
    ValidationError { field: String, message: String },

    /// Erreur de contrainte de base de données (clés étrangères, etc.)
    #[error("{constraint}")]
    ConstraintViolation { constraint: String },

    /// Erreur de logique métier
    #[error("{message}")]
    BusinessLogic { message: String },

    /// Erreur d'E/O générique
    #[error("Erreur d'entrée/sortie: {0}")]
    Io(#[from] std::io::Error),
}

/// Type de résultat personnalisé pour l'application
/// 
/// Simplifie l'usage des résultats avec notre type d'erreur personnalisé
pub type AppResult<T> = Result<T, AppError>;

impl AppError {
    /// Crée une erreur "entité non trouvée"
    /// 
    /// # Arguments
    /// * `entity` - Le nom de l'entité (ex: "Ferme", "Personnel")
    /// * `id` - L'ID de l'entité non trouvée
    pub fn not_found(entity: &str, id: i64) -> Self {
        AppError::NotFound {
            entity: entity.to_string(),
            id,
        }
    }

    /// Crée une erreur de validation
    /// 
    /// # Arguments
    /// * `field` - Le champ qui a échoué la validation
    /// * `message` - Le message d'erreur descriptif
    pub fn validation_error(field: &str, message: &str) -> Self {
        AppError::ValidationError {
            field: field.to_string(),
            message: message.to_string(),
        }
    }

    /// Crée une erreur de logique métier
    /// 
    /// # Arguments
    /// * `message` - Le message d'erreur descriptif
    pub fn business_logic(message: &str) -> Self {
        AppError::BusinessLogic {
            message: message.to_string(),
        }
    }

    /// Crée une erreur de contrainte
    /// 
    /// # Arguments
    /// * `constraint` - La contrainte violée
    pub fn constraint_violation(constraint: &str) -> Self {
        AppError::ConstraintViolation {
            constraint: constraint.to_string(),
        }
    }
}

/// Convertit AppError en String pour les commandes Tauri
/// 
/// Tauri nécessite que les erreurs soient converties en String
/// pour être transmises au frontend.
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}
