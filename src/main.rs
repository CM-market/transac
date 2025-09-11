use axum::{
    routing::get,
    Router,
    Json,
    response::IntoResponse,
};
use serde::Serialize;
use tracing_subscriber::filter::EnvFilter;

mod config;
mod db;

use config::Config;
use db::create_pool;

#[derive(Serialize)]
struct HealthResponse {
    message: &'static str,
}

async fn healthz() -> impl IntoResponse {
    Json(HealthResponse { message: "ok" })
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    // Load configuration
    let config = Config::from_env()?;

    // Initialize database pool
    let pool = create_pool(&config).await?;

    let app = Router::new()
        .route("/healthz", get(healthz))
        // Add more routes/modules here
        .with_state(pool);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
