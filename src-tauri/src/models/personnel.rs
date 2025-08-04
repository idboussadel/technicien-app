use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Représente un membre du personnel dans le système
/// 
/// Le personnel peut être assigné à gérer une ou plusieurs bandes
/// et leurs affectations peuvent changer au fil du temps.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Personnel {
    pub id: Option<i64>,
    pub nom: String,
    pub telephone: String,
    pub created_at: DateTime<Utc>,
}

/// Structure pour créer un nouveau membre du personnel
/// 
/// Utilisée lors de l'ajout d'un nouveau membre sans ID
/// car l'ID est généré automatiquement par la base de données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePersonnel {
    pub nom: String,
    pub telephone: String,
}

/// Structure pour mettre à jour un membre du personnel existant
/// 
/// Permet de modifier les informations d'un membre du personnel
/// en spécifiant son ID et les nouvelles données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePersonnel {
    pub id: i64,
    pub nom: String,
    pub telephone: String,
}

/// Structure pour les résultats paginés du personnel
/// 
/// Contient les données de pagination et la liste des résultats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedPersonnel {
    pub data: Vec<Personnel>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_prev: bool,
}
