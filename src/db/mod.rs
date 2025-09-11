mod stores;

use sea_orm::{Database, DatabaseConnection};
use crate::config::Config;

pub async fn create_connection(config: &Config) -> anyhow::Result<DatabaseConnection> {
    let db = Database::connect(&config.database_url)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to create DatabaseConnection: {e}"))?;
    Ok(db)
}