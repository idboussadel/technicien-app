/// Service layer for business logic
/// 
/// This module contains all the service implementations that handle
/// business logic and coordinate between repositories and commands.

pub mod ferme_service;
pub mod personnel_service;
pub mod soin_service;
pub mod bande_service;
pub mod auth_service;
pub mod maladie_service;

// Re-export all services for easy access
pub use ferme_service::*;
pub use personnel_service::*;
pub use soin_service::*;
pub use bande_service::*;
pub use auth_service::*;
pub use maladie_service::*;
