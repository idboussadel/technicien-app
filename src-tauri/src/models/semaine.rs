use serde::{Deserialize, Serialize};

/// Représente une semaine de suivi dans une bande
/// 
/// Chaque bande peut avoir 5 à 9 semaines de suivi,
/// chaque semaine contenant 7 jours de données quotidiennes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Semaine {
    pub id: Option<i64>,
    pub bande_id: i64,
    pub numero_semaine: i32,
    pub poids: Option<f64>, // Poids moyen des poussins en grammes
}

/// Structure pour créer une nouvelle semaine
/// 
/// Utilisée lors de la création d'une semaine sans ID
/// car l'ID est généré automatiquement par la base de données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSemaine {
    pub bande_id: i64,
    pub numero_semaine: i32,
    pub poids: Option<f64>,
}

/// Structure pour mettre à jour une semaine existante
/// 
/// Permet de modifier les informations d'une semaine
/// en spécifiant son ID et les nouvelles données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSemaine {
    pub id: i64,
    pub bande_id: i64,
    pub numero_semaine: i32,
    pub poids: Option<f64>,
}
