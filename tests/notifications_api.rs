//! Integration tests for the seller notifications API (US15 / T-010).
//!
//! These require a live PostgreSQL database reachable at `DATABASE_URL` and are
//! therefore `#[ignore]`d by default, matching the repo's existing convention
//! (see `tests/reviews_api.rs`). Run explicitly when a database is available:
//!
//! ```text
//! DATABASE_URL=postgres://user:pass@localhost:5432/transac_db \
//!   cargo test --test notifications_api -- --ignored --nocapture
//! ```

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use sea_orm::{ActiveModelTrait, Database, Set};
use tower::ServiceExt;
use uuid::Uuid;

use sea_orm_migration::MigratorTrait;
use transac::api::notifications::router as notifications_router;
use transac::auth::JwtService;
use transac::entity::notification;
use transac::migrator::Migrator;

async fn test_db() -> Option<sea_orm::DatabaseConnection> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let db = Database::connect(&url).await.ok()?;
    Migrator::up(&db, None).await.ok()?;
    Some(db)
}

fn app(db: sea_orm::DatabaseConnection) -> Router {
    notifications_router(db)
}

fn bearer_token(relay_id: &str) -> String {
    let jwt = JwtService::new().expect("failed to init JWT service");
    let token = jwt
        .generate_token_with_role(
            relay_id.to_owned(),
            "test-public-key".to_owned(),
            "seller".to_owned(),
        )
        .expect("failed to generate token");
    format!("Bearer {token}")
}

/// Insert a notification directly and verify it is listed + marked read via API.
#[tokio::test]
#[ignore]
async fn list_and_mark_read() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let seller = "seller-notif-1";
    let token = bearer_token(seller);

    // Seed a notification directly in the DB.
    let notification = notification::ActiveModel {
        id: Set(Uuid::new_v4()),
        seller_device_id: Set(seller.to_owned()),
        title: Set("New order".to_owned()),
        message: Set("Alice ordered 2 x Widgets.".to_owned()),
        payload: Set(serde_json::json!({"buyer": {"name": "Alice"}})),
        is_read: Set(false),
        created_at: Set(chrono::Utc::now()),
    }
    .insert(&db)
    .await
    .expect("failed to insert test notification");

    let app = app(db.clone());

    // Unread count should be 1.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/notifications/unread_count")
                .header("authorization", &token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(payload["count"], 1);

    // Listing returns the notification, newest first.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/notifications")
                .header("authorization", &token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let notifications = payload["notifications"]
        .as_array()
        .expect("notifications must be an array");
    assert_eq!(notifications.len(), 1);
    assert_eq!(notifications[0]["id"], notification.id.to_string());
    assert_eq!(notifications[0]["is_read"], false);

    // Mark read then unread count is 0.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/api/v1/notifications/{}/read", notification.id))
                .header("authorization", &token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/notifications/unread_count")
                .header("authorization", &token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(payload["count"], 0);
}

/// A seller cannot see or mark another seller's notifications.
#[tokio::test]
#[ignore]
async fn notifications_are_scoped_to_seller() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let seller_a = "seller-notif-A";
    let seller_b = "seller-notif-B";

    // Seed a notification for seller A.
    let notif = notification::ActiveModel {
        id: Set(Uuid::new_v4()),
        seller_device_id: Set(seller_a.to_owned()),
        title: Set("New order".to_owned()),
        message: Set("Buyer placed an order.".to_owned()),
        payload: Set(serde_json::json!({})),
        is_read: Set(false),
        created_at: Set(chrono::Utc::now()),
    }
    .insert(&db)
    .await
    .expect("failed to insert test notification");

    let app = app(db.clone());

    // Seller B lists: should be empty.
    let token_b = bearer_token(seller_b);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/notifications")
                .header("authorization", &token_b)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(payload["notifications"].as_array().unwrap().len(), 0);

    // Seller B tries to mark A's notification read: 404 (scoped).
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/api/v1/notifications/{}/read", notif.id))
                .header("authorization", &token_b)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

/// Unauthorized requests (no bearer token) return 401.
#[tokio::test]
#[ignore]
async fn list_requires_auth() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/notifications")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
