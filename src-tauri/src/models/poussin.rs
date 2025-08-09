use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Représente un poussin dans le système
/// 
/// Structure simple pour gérer les poussins avec nom et date de création
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Poussin {
    pub id: Option<i64>,
    pub nom: String,
    pub created_at: DateTime<Utc>,
}

/// Structure pour créer un nouveau poussin
/// 
/// Utilisée lors de l'ajout d'un nouveau poussin sans ID
/// car l'ID est généré automatiquement par la base de données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePoussin {
    pub nom: String,
}

/// Structure pour mettre à jour un poussin existant
/// 
/// Permet de modifier les informations d'un poussin
/// en spécifiant son ID et les nouvelles données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePoussin {
    pub id: i64,
    pub nom: String,
}

/// Structure pour les résultats paginés des poussins
/// 
/// Contient les données de pagination et la liste des résultats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedPoussin {
    pub data: Vec<Poussin>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_prev: bool,
}
