use serde::{Deserialize, Serialize};

/// Alimentation history record - tracks quantity changes over time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlimentationHistory {
    pub id: Option<i64>,
    pub bande_id: i64,
    pub quantite: f64, // Can be positive (addition) or negative (subtraction)
    pub created_at: String, // ISO format datetime string
}

/// Data for creating a new alimentation history record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAlimentationHistory {
    pub bande_id: i64,
    pub quantite: f64, // Can be positive or negative
    pub created_at: String, // ISO format datetime string
}

/// Data for updating an alimentation history record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAlimentationHistory {
    pub bande_id: i64,
    pub quantite: f64, // Can be positive or negative
}
