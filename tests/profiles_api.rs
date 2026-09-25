//! Integration tests for the profile management API (US18 / T-011).
//!
//! These require a live PostgreSQL database reachable at `DATABASE_URL` and are
//! therefore `#[ignore]`d by default, matching the repo's existing convention
//! (see `tests/reviews_api.rs`). Run explicitly when a database is available:
//!
//! ```text
//! DATABASE_URL=postgres://user:pass@localhost:5432/transac_db \
//!   cargo test --test profiles_api -- --ignored --nocapture
//! ```

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use sea_orm::Database;
use tower::ServiceExt;
use uuid::Uuid;

use sea_orm_migration::MigratorTrait;
use transac::api::profiles::router as profiles_router;
use transac::auth::JwtService;
use transac::migrator::Migrator;

async fn test_db() -> Option<sea_orm::DatabaseConnection> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let db = Database::connect(&url).await.ok()?;
    // Ensure schema is up to date.
    Migrator::up(&db, None).await.ok()?;
    Some(db)
}

fn app(db: sea_orm::DatabaseConnection) -> Router {
    profiles_router(db)
}

/// Build a bearer token for a given relay_id (the JWT subject).
fn bearer_token(relay_id: &str) -> String {
    let jwt = JwtService::new().expect("failed to init JWT service");
    let token = jwt
        .generate_token_with_role(
            relay_id.to_owned(),
            "test-public-key".to_owned(),
            "buyer".to_owned(),
        )
        .expect("failed to generate token");
    format!("Bearer {token}")
}

async fn parse_json<T: serde::de::DeserializeOwned>(response: axum::response::Response) -> T {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

/// PUT creates a profile and GET returns the same saved values (persistence).
#[tokio::test]
#[ignore]
async fn create_and_get_profile_roundtrip() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db.clone());
    let relay_id = format!("user-{}", Uuid::new_v4());
    let token = bearer_token(&relay_id);

    // PUT creates the profile.
    let put_resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/profiles/me")
                .header("content-type", "application/json")
                .header("authorization", &token)
                .body(Body::from(
                    serde_json::json!({
                        "name": "Alice Nganou",
                        "phone": "+237612345678",
                        "location": "Douala"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(put_resp.status(), StatusCode::CREATED);

    let created: serde_json::Value = parse_json(put_resp).await;
    assert_eq!(created["profile"]["name"], "Alice Nganou");
    assert_eq!(created["profile"]["phone"], "+237612345678");
    assert_eq!(created["profile"]["location"], "Douala");
    assert_eq!(created["profile"]["device_id"], relay_id);

    // GET returns the saved profile (immediate reflect / persistence).
    let get_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/profiles/me")
                .header("authorization", &token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get_resp.status(), StatusCode::OK);
    let got: serde_json::Value = parse_json(get_resp).await;
    assert_eq!(got["profile"]["name"], "Alice Nganou");
    assert_eq!(got["profile"]["phone"], "+237612345678");
}

/// PUT updates an existing profile and the change persists.
#[tokio::test]
#[ignore]
async fn update_profile_persists_changes() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db.clone());
    let relay_id = format!("user-{}", Uuid::new_v4());
    let token = bearer_token(&relay_id);

    // Create initial profile.
    let first = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/profiles/me")
                .header("content-type", "application/json")
                .header("authorization", &token)
                .body(Body::from(
                    serde_json::json!({ "name": "Old Name", "phone": null, "location": null })
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    // Update name/phone/location.
    let second = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/profiles/me")
                .header("content-type", "application/json")
                .header("authorization", &token)
                .body(Body::from(
                    serde_json::json!({
                        "name": "New Name",
                        "phone": "+237650987654",
                        "location": "Yaoundé"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(second.status(), StatusCode::OK);
    let updated: serde_json::Value = parse_json(second).await;
    assert_eq!(updated["profile"]["name"], "New Name");
    assert_eq!(updated["profile"]["phone"], "+237650987654");

    // GET confirms the persisted change.
    let get_resp = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/profiles/me")
                .header("authorization", &token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let got: serde_json::Value = parse_json(get_resp).await;
    assert_eq!(got["profile"]["name"], "New Name");
    assert_eq!(got["profile"]["phone"], "+237650987654");
    assert_eq!(got["profile"]["location"], "Yaoundé");
}

/// Invalid Cameroon phone returns a 400 with an error message.
#[tokio::test]
#[ignore]
async fn invalid_phone_returns_bad_request() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db.clone());
    let token = bearer_token(&format!("user-{}", Uuid::new_v4()));

    let resp = app
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/profiles/me")
                .header("content-type", "application/json")
                .header("authorization", &token)
                .body(Body::from(
                    serde_json::json!({
                        "name": "Bad Phone",
                        "phone": "+33612345678",
                        "location": null
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let text = String::from_utf8_lossy(&body).to_string();
    assert!(
        text.contains("Cameroon"),
        "expected Cameroon validation message, got: {text}"
    );
}

/// Empty name returns a 400 with an error message.
#[tokio::test]
#[ignore]
async fn empty_name_returns_bad_request() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db.clone());
    let token = bearer_token(&format!("user-{}", Uuid::new_v4()));

    let resp = app
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/v1/profiles/me")
                .header("content-type", "application/json")
                .header("authorization", &token)
                .body(Body::from(
                    serde_json::json!({ "name": "   ", "phone": null, "location": null })
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let text = String::from_utf8_lossy(&body).to_string();
    assert!(
        text.contains("Name is required"),
        "expected name error, got: {text}"
    );
}

/// GET with no existing profile returns 404.
#[tokio::test]
#[ignore]
async fn get_without_profile_returns_not_found() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db.clone());
    let token = bearer_token(&format!("user-{}", Uuid::new_v4()));

    let resp = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/profiles/me")
                .header("authorization", &token)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// Missing/invalid bearer token returns 401.
#[tokio::test]
#[ignore]
async fn unauthorized_returns_401() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db.clone());

    let resp = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/profiles/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}
