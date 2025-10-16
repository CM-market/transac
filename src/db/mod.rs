pub mod products;
pub mod reviews;
pub mod users;

use crate::config::Config;
use sea_orm::{Database, DatabaseConnection};

pub async fn create_connection(config: &Config) -> anyhow::Result<DatabaseConnection> {
    let db = Database::connect(&config.database_url)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create DatabaseConnection: {e}"))?;
    Ok(db)
}
