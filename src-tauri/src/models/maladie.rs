use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Maladie {
    pub id: i64,
    pub nom: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMaladie {
    pub nom: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMaladie {
    pub id: i64,
    pub nom: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedMaladies {
    pub data: Vec<Maladie>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_prev: bool,
}
