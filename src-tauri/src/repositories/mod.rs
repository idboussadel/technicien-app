/// Repository pattern implementations for data access
/// 
/// This module contains all repository traits and implementations
/// following the clean architecture principles specified in the instructions.

pub mod ferme_repository;
pub mod personnel_repository;
pub mod bande_repository;
pub mod batiment_repository;
pub mod semaine_repository;
pub mod suivi_quotidien_repository;
pub mod soin_repository;
pub mod user_repository;
pub mod alimentation_repository;
pub mod maladie_repository;

// Re-export all repositories for easy access
pub use ferme_repository::*;
pub use personnel_repository::*;
pub use bande_repository::*;
pub use batiment_repository::*;
pub use semaine_repository::*;
pub use suivi_quotidien_repository::*;
pub use soin_repository::*;
pub use user_repository::*;
pub use alimentation_repository::*;
pub use maladie_repository::*;
