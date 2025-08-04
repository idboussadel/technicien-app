use crate::database::DatabaseManager;
use crate::error::AppResult;
use crate::models::{Soin, CreateSoin, UpdateSoin};
use std::sync::Arc;

pub struct SoinService {
    _db: Arc<DatabaseManager>,
}

impl SoinService {
    pub fn new(db: Arc<DatabaseManager>) -> Self {
        Self { _db: db }
    }

    pub async fn create_soin(&self, _soin: CreateSoin) -> AppResult<Soin> {
        todo!("Implementation will follow")
    }

    pub async fn get_all_soins(&self) -> AppResult<Vec<Soin>> {
        todo!("Implementation will follow")
    }
}
