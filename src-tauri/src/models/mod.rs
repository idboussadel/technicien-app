/// Database models for the farm management application
/// 
/// This module contains all the data structures that represent
/// the database entities in our farm management system.

pub mod ferme;
pub mod personnel;
pub mod bande;
pub mod batiment;
pub mod semaine;
pub mod suivi_quotidien;
pub mod soin;
pub mod user;

// Re-export all models for easy access
pub use ferme::*;
pub use personnel::*;
pub use bande::*;
pub use batiment::*;
pub use semaine::*;
pub use suivi_quotidien::*;
pub use soin::*;
pub use user::*;
