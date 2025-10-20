pub mod products;
pub mod revocation;
mod stores;

use crate::config::Config;
use sea_orm::{Database, DatabaseConnection};
use std::time::Duration;
use tokio::time::sleep;

pub async fn create_connection(config: &Config) -> anyhow::Result<DatabaseConnection> {
    let max_attempts = 20u32;
    let mut attempt = 0u32;
    loop {
        match Database::connect(&config.database_url).await {
            Ok(conn) => return Ok(conn),
            Err(e) => {
                attempt += 1;
                if attempt >= max_attempts {
                    return Err(anyhow::anyhow!(
                        "Failed to create DatabaseConnection after {attempt} attempts: {e}"
                    ));
                }
                tracing::warn!(
                    attempt = attempt,
                    max_attempts = max_attempts,
                    error = %e,
                    "Database not ready, retrying..."
                );
                sleep(Duration::from_secs(3)).await;
            }
        }
    }
}
