use serde::{Deserialize, Serialize};

/// Représente une ferme dans le système de gestion
/// 
/// Une ferme peut contenir plusieurs bandes d'animaux
/// et sert comme unité d'organisation principale.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ferme {
    pub id: Option<i64>,
    pub nom: String,
}

/// Structure pour créer une nouvelle ferme
/// 
/// Utilisée lors de la création d'une ferme sans ID
/// car l'ID est généré automatiquement par la base de données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFerme {
    pub nom: String,
}

/// Structure pour mettre à jour une ferme existante
/// 
/// Permet de modifier les informations d'une ferme
/// en spécifiant son ID et les nouvelles données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFerme {
    pub id: i64,
    pub nom: String,
}
