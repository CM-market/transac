use dotenvy::dotenv;
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub database_url: String,
    pub pow_difficulty: u32,
    pub pow_timeout_minutes: i64,
    pub server_url: String,
}

impl Config {
    /// Loads configuration from environment variables, using dotenvy to load from .env if present.
    pub fn from_env() -> anyhow::Result<Self> {
        dotenv().ok();
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL must be set in environment"))?;

        let pow_difficulty = env::var("POW_DIFFICULTY")
            .unwrap_or_else(|_| "4".to_string())
            .parse::<u32>()?;

        let pow_timeout_minutes = env::var("POW_TIMEOUT_MINUTES")
            .unwrap_or_else(|_| "10".to_string())
            .parse::<i64>()?;

        let server_url =
            env::var("SERVER_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());

        Ok(Config {
            database_url,
            pow_difficulty,
            pow_timeout_minutes,
            server_url,
        })
    }
}
