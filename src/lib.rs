pub mod api;
pub mod auth;
pub mod config;
pub mod context;
pub mod crypto;
pub mod db;
pub mod entity;
pub mod error;
pub mod events;
pub mod migrator;
pub mod openapi;
pub mod request_middleware;

use axum::{response::IntoResponse, Json};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    pub message: &'static str,
}

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/healthz",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse)
    ),
    tag = "System"
)]
pub async fn healthz() -> impl IntoResponse {
    tracing::debug!("Health check requested");
    Json(HealthResponse { message: "ok" })
}
