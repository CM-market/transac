use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use tower::ServiceExt;

fn pwa_app() -> Router {
    transac::api::pwa::router()
}

#[tokio::test]
async fn manifest_returns_200_and_json_content_type() {
    let app = pwa_app();
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/manifest.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get("content-type")
        .expect("missing content-type header")
        .to_str()
        .unwrap();
    assert!(content_type.contains("application/json"));
}

#[tokio::test]
async fn service_worker_returns_200_and_js_content_type() {
    let app = pwa_app();
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/sw.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get("content-type")
        .expect("missing content-type header")
        .to_str()
        .unwrap();
    assert!(content_type.contains("application/javascript"));
}

#[tokio::test]
async fn offline_returns_200_and_html_content_type() {
    let app = pwa_app();
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/offline")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get("content-type")
        .expect("missing content-type header")
        .to_str()
        .unwrap();
    assert!(content_type.contains("text/html"));
}

#[tokio::test]
async fn manifest_contains_valid_pwa_fields() {
    let app = pwa_app();
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/manifest.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let manifest: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert!(manifest.get("name").is_some());
    assert!(manifest.get("short_name").is_some());
    assert!(manifest.get("display").is_some());
    assert!(manifest.get("icons").is_some());
}

#[tokio::test]
async fn service_worker_has_cache_control_header() {
    let app = pwa_app();
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/sw.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let cache_control = response.headers().get("cache-control");
    assert!(cache_control.is_some());
}

#[tokio::test]
async fn service_worker_has_sw_allowed_header() {
    let app = pwa_app();
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/sw.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let sw_allowed = response.headers().get("service-worker-allowed");
    assert!(sw_allowed.is_some());
}
