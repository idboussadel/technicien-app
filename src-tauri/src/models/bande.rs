use serde::{Deserialize, Serialize};
use chrono::NaiveDate;
use crate::models::BatimentWithDetails;

/// Représente une bande d'animaux dans le système
/// 
/// Une bande est l'unité principale de gestion qui peut contenir
/// plusieurs bâtiments, chacun faisant l'objet d'un suivi séparé.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bande {
    pub id: Option<i64>,
    pub date_entree: NaiveDate,
    pub ferme_id: i64,
    pub notes: Option<String>,
}

/// Structure pour créer une nouvelle bande
/// 
/// Utilisée lors de la création d'une bande sans ID
/// car l'ID est généré automatiquement par la base de données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBande {
    pub date_entree: NaiveDate,
    pub ferme_id: i64,
    pub notes: Option<String>,
}

/// Structure pour mettre à jour une bande existante
/// 
/// Permet de modifier les informations d'une bande
/// en spécifiant son ID et les nouvelles données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBande {
    pub id: i64,
    pub date_entree: NaiveDate,
    pub ferme_id: i64,
    pub notes: Option<String>,
}

/// Vue étendue d'une bande avec les informations des entités liées
/// 
/// Inclut les noms de la ferme, la liste des bâtiments et le contour d'alimentation
/// pour un affichage complet sans requêtes supplémentaires côté frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BandeWithDetails {
    pub id: Option<i64>,
    pub date_entree: NaiveDate,
    pub ferme_id: i64,
    pub ferme_nom: String,
    pub notes: Option<String>,
    pub batiments: Vec<BatimentWithDetails>,
    pub alimentation_contour: f64,  // Total accumulation d'alimentation en kg
}
