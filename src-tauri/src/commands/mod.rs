/// Tauri commands for the farm management application
/// 
/// This module contains all the Tauri command handlers that expose
/// the application's functionality to the frontend React application.

pub mod ferme_commands;
pub mod personnel_commands;
pub mod soin_commands;
pub mod auth_commands;
pub mod bande_commands;
pub mod batiment_commands;
pub mod alimentation_commands;
pub mod maladie_commands;
pub mod poussin_commands;
pub mod semaine_commands;
pub mod suivi_quotidien_commands;
pub mod updater_commands;

// Re-export all commands for easy access
pub use ferme_commands::*;
pub use personnel_commands::*;
pub use soin_commands::*;
pub use auth_commands::*;
pub use bande_commands::*;
pub use batiment_commands::*;
pub use alimentation_commands::*;
pub use maladie_commands::*;
pub use poussin_commands::*;
pub use semaine_commands::*;
pub use suivi_quotidien_commands::*;
pub use updater_commands::*;
