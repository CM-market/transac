use sqlx::{postgres::PgPoolOptions, PgPool};
use crate::config::Config;

// pub async fn create_pool(config: &Config) -> anyhow::Result<PgPool> {
//     let pool = PgPoolOptions::new()
//         .max_connections(5)
//         .connect(&config.database_url)
//         .await
//         .map_err(|e| anyhow::anyhow!("Failed to create PgPool: {e}"))?;
//     Ok(pool)
// }