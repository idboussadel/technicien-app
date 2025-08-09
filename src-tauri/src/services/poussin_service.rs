// Placeholder for poussin service - will be implemented next
use crate::database::DatabaseManager;
use crate::error::AppResult;
use crate::models::{Poussin, CreatePoussin, UpdatePoussin};
use std::sync::Arc;

pub struct PoussinService {
    _db: Arc<DatabaseManager>,
}

impl PoussinService {
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { _db: db }
    }

    pub async fn create_poussin(&self, _poussin: CreatePoussin) -> AppResult<Poussin> {
        todo!("Implementation will follow")
    }

    pub async fn get_all_poussins(&self) -> AppResult<Vec<Poussin>> {
        todo!("Implementation will follow")
    }
}
