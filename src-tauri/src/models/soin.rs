use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Représente un soin (médicament) dans le système
/// 
/// Les soins sont une base de données centrale de tous les
/// traitements/soins disponibles avec leurs unités par défaut.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Soin {
    pub id: Option<i64>,
    pub nom: String,
    pub unite_defaut: String, // Unité par défaut (l, kg, etc.)
    pub created_at: DateTime<Utc>,
}

/// Structure pour créer un nouveau soin
/// 
/// Utilisée lors de la création d'un soin sans ID
/// car l'ID est généré automatiquement par la base de données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSoin {
    pub nom: String,
    pub unite_defaut: String,
}

/// Structure pour mettre à jour un soin existant
/// 
/// Permet de modifier les informations d'un soin
/// en spécifiant son ID et les nouvelles données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSoin {
    pub id: i64,
    pub nom: String,
    pub unite_defaut: String,
}

/// Structure pour les résultats paginés des soins
/// 
/// Contient les données de pagination et la liste des résultats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedSoin {
    pub data: Vec<Soin>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_prev: bool,
}
