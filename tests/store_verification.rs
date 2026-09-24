//! Integration tests for the store verification (admin approval) workflow (T-012).
//!
//! Requires a live PostgreSQL at `DATABASE_URL`; `#[ignore]`d by default. Run with:
//!
//! ```text
//! DATABASE_URL=postgres://user:pass@localhost:5432/transac_db \
//!   cargo test --test store_verification -- --ignored --nocapture
//! ```

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use sea_orm::{ActiveModelTrait, Database, EntityTrait, Set};
use sea_orm_migration::MigratorTrait;
use tower::ServiceExt;
use uuid::Uuid;

use transac::api::stores::router as stores_router;
use transac::entity::store;
use transac::migrator::Migrator;

async fn test_db() -> Option<sea_orm::DatabaseConnection> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let db = Database::connect(&url).await.ok()?;
    Migrator::up(&db, None).await.ok()?;
    Some(db)
}

fn app(db: sea_orm::DatabaseConnection) -> Router {
    stores_router(db)
}

async fn create_unverified_store(db: &sea_orm::DatabaseConnection, name: &str) -> Uuid {
    let store = store::ActiveModel {
        id: Set(Uuid::new_v4()),
        name: Set(name.to_owned()),
        description: Set(None),
        logo_url: Set(None),
        location: Set(None),
        contact_phone: Set(None),
        contact_email: Set(None),
        contact_whatsapp: Set(None),
        owner_device_id: Set(None),
        is_verified: Set(false),
        rating: Set(None),
        total_products: Set(0),
        created_at: Set(chrono::Utc::now()),
        updated_at: Set(chrono::Utc::now()),
    }
    .insert(db)
    .await
    .expect("failed to insert test store");
    store.id
}

/// Approving verification marks the store as verified.
#[tokio::test]
#[ignore]
async fn verification_approval_marks_store_verified() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = create_unverified_store(&db, "Eligible Store").await;
    let app = app(db.clone());

    let body = serde_json::json!({ "approved": true });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/stores/{store_id}/verification"))
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "approval should return 200"
    );

    let store_row = store::Entity::find_by_id(store_id)
        .one(&db)
        .await
        .expect("failed to load store")
        .expect("store not found");
    assert!(
        store_row.is_verified,
        "store should be verified after approval"
    );
}

/// Revoking verification marks the store as unverified.
#[tokio::test]
#[ignore]
async fn verification_revocation_marks_store_unverified() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = create_unverified_store(&db, "Revocable Store").await;
    let app = app(db.clone());

    // First approve, then revoke.
    for approved in [true, false] {
        let body = serde_json::json!({ "approved": approved });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("PUT")
                    .uri(format!("/api/v1/stores/{store_id}/verification"))
                    .header("content-type", "application/json")
                    .body(Body::from(body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    let store_row = store::Entity::find_by_id(store_id)
        .one(&db)
        .await
        .expect("failed to load store")
        .expect("store not found");
    assert!(
        !store_row.is_verified,
        "store should be unverified after revocation"
    );
}

/// Verification of a non-existent store returns 404.
#[tokio::test]
#[ignore]
async fn verification_unknown_store_returns_404() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db.clone());
    let missing = Uuid::new_v4();

    let body = serde_json::json!({ "approved": true });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/v1/stores/{missing}/verification"))
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
