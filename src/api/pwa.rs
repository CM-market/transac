use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use std::include_str;

/// PWA manifest endpoint - returns the web app manifest JSON
#[utoipa::path(
    get,
    path = "/api/v1/manifest.json",
    responses(
        (status = 200, description = "PWA manifest", body = String, content_type = "application/json")
    ),
    tag = "PWA"
)]
pub async fn manifest() -> impl IntoResponse {
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Cache-Control", "public, max-age=3600")
        .body(include_str!("../../assets/manifest.json").to_string())
        .unwrap()
}

/// Service worker endpoint - returns the service worker JavaScript
#[utoipa::path(
    get,
    path = "/api/v1/sw.js",
    responses(
        (status = 200, description = "Service worker script", body = String, content_type = "application/javascript")
    ),
    tag = "PWA"
)]
pub async fn service_worker() -> impl IntoResponse {
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/javascript")
        .header("Cache-Control", "public, max-age=3600")
        .header("Service-Worker-Allowed", "/")
        .body(include_str!("../../assets/sw.js").to_string())
        .unwrap()
}

/// Offline page endpoint - returns the offline fallback HTML
#[utoipa::path(
    get,
    path = "/api/v1/offline",
    responses(
        (status = 200, description = "Offline fallback page", body = String, content_type = "text/html")
    ),
    tag = "PWA"
)]
pub async fn offline() -> impl IntoResponse {
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/html")
        .header("Cache-Control", "public, max-age=3600")
        .body(include_str!("../../assets/offline.html").to_string())
        .unwrap()
}

pub fn router() -> Router<()> {
    Router::new()
        .route("/api/v1/manifest.json", get(manifest))
        .route("/api/v1/sw.js", get(service_worker))
        .route("/api/v1/offline", get(offline))
}
