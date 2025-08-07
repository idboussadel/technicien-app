use serde::{Deserialize, Serialize};

/// Représente un bâtiment dans une bande
/// 
/// Un bâtiment contient un type spécifique d'animaux avec une quantité donnée
/// et est sous la responsabilité d'un membre du personnel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Batiment {
    pub id: Option<i64>,
    pub bande_id: i64,
    pub numero_batiment: String,
    pub type_poussin: String,
    pub personnel_id: i64,
    pub quantite: i32,
}

/// Structure pour créer un nouveau bâtiment
/// 
/// Utilisée lors de la création d'un bâtiment sans ID
/// car l'ID est généré automatiquement par la base de données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBatiment {
    pub bande_id: i64,
    pub numero_batiment: String,
    pub type_poussin: String,
    pub personnel_id: i64,
    pub quantite: i32,
}

/// Structure pour mettre à jour un bâtiment existant
/// 
/// Permet de modifier les informations d'un bâtiment
/// en spécifiant son ID et les nouvelles données.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBatiment {
    pub id: i64,
    pub bande_id: i64,
    pub numero_batiment: String,
    pub type_poussin: String,
    pub personnel_id: i64,
    pub quantite: i32,
}

/// Vue étendue d'un bâtiment avec les informations du personnel
/// 
/// Inclut le nom du personnel responsable pour un affichage complet
/// sans nécessiter de requêtes supplémentaires côté frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatimentWithDetails {
    pub id: Option<i64>,
    pub bande_id: i64,
    pub numero_batiment: String,
    pub type_poussin: String,
    pub personnel_id: i64,
    pub personnel_nom: String,
    pub quantite: i32,
}
