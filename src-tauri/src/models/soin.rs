use serde::{Deserialize, Serialize};

/// Représente un soin dans le système
/// 
/// Les soins sont une base de données centrale de tous les
/// traitements/soins disponibles avec leurs unités par défaut.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Soin {
    pub id: Option<i64>,
    pub nom: String,
    pub unite_defaut: String, // Unité par défaut (l, kg, etc.)
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
