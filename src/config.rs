use serde::Deserialize;
use dotenvy::dotenv;
use std::env;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub database_url: String,
}

impl Config {
    /// Loads configuration from environment variables, using dotenvy to load from .env if present.
    pub fn from_env() -> anyhow::Result<Self> {
        dotenv().ok();
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL must be set in environment"))?;
        Ok(Config { database_url })
    }
}