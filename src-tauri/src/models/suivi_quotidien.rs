use serde::{Deserialize, Serialize};

/// Représente le suivi quotidien d'une semaine
/// 
/// Chaque entrée représente une journée de suivi avec
/// toutes les métriques importantes pour le suivi des animaux.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuiviQuotidien {
    pub id: Option<i64>,
    pub semaine_id: i64,
    pub age: i32, // Âge en jours depuis l'éclosion
    pub deces_par_jour: Option<i32>,
    pub deces_total: Option<i32>,
    pub alimentation_par_jour: Option<f64>, // En kg ou autre unité
    pub alimentation_total: Option<f64>,
    pub soins_id: Option<i64>,
    pub soins_quantite: Option<String>, // Quantité avec unité (ex: "5l", "2kg")
    pub analyses: Option<String>,
    pub remarques: Option<String>,
}

/// Structure pour créer un nouveau suivi quotidien
/// 
/// Utilisée lors de la création d'un suivi sans ID
/// car l'ID est généré automatiquement par la base de données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSuiviQuotidien {
    pub semaine_id: i64,
    pub age: i32,
    pub deces_par_jour: Option<i32>,
    pub deces_total: Option<i32>,
    pub alimentation_par_jour: Option<f64>,
    pub alimentation_total: Option<f64>,
    pub soins_id: Option<i64>,
    pub soins_quantite: Option<String>,
    pub analyses: Option<String>,
    pub remarques: Option<String>,
}

/// Structure pour mettre à jour un suivi quotidien existant
/// 
/// Permet de modifier les informations d'un suivi quotidien
/// en spécifiant son ID et les nouvelles données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSuiviQuotidien {
    pub id: i64,
    pub semaine_id: i64,
    pub age: i32,
    pub deces_par_jour: Option<i32>,
    pub deces_total: Option<i32>,
    pub alimentation_par_jour: Option<f64>,
    pub alimentation_total: Option<f64>,
    pub soins_id: Option<i64>,
    pub soins_quantite: Option<String>,
    pub analyses: Option<String>,
    pub remarques: Option<String>,
}

/// Vue étendue du suivi quotidien avec les informations des soins
/// 
/// Inclut le nom des soins pour un affichage complet
/// sans nécessiter de requêtes supplémentaires côté frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuiviQuotidienWithDetails {
    pub id: Option<i64>,
    pub semaine_id: i64,
    pub age: i32,
    pub deces_par_jour: Option<i32>,
    pub deces_total: Option<i32>,
    pub alimentation_par_jour: Option<f64>,
    pub alimentation_total: Option<f64>,
    pub soins_id: Option<i64>,
    pub soins_nom: Option<String>,
    pub soins_quantite: Option<String>,
    pub analyses: Option<String>,
    pub remarques: Option<String>,
}
