//! Integration tests for the store reviews API (US20 / T-012).
//!
//! These require a live PostgreSQL database reachable at `DATABASE_URL` and are
//! therefore `#[ignore]`d by default, matching the repo's existing convention
//! (see `tests/healthz.rs`). Run explicitly when a database is available:
//!
//! ```text
//! DATABASE_URL=postgres://user:pass@localhost:5432/transac_db \
//!   cargo test --test reviews_api -- --ignored --nocapture
//! ```

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use sea_orm::{ColumnTrait, Database, EntityTrait, PaginatorTrait, QueryFilter};
use tower::ServiceExt;
use uuid::Uuid;

use sea_orm_migration::MigratorTrait;
use transac::api::reviews::router as reviews_router;
use transac::entity::review;
use transac::entity::store;
use transac::migrator::Migrator;

async fn test_db() -> Option<sea_orm::DatabaseConnection> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let db = Database::connect(&url).await.ok()?;
    // Ensure schema is up to date.
    Migrator::up(&db, None).await.ok()?;
    Some(db)
}

fn app(db: sea_orm::DatabaseConnection) -> Router {
    reviews_router(db)
}

async fn create_test_store(db: &sea_orm::DatabaseConnection, name: &str) -> Uuid {
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

use sea_orm::{ActiveModelTrait, Set};

/// Submitting a review updates the store's aggregate rating.
#[tokio::test]
#[ignore]
async fn submit_review_updates_store_rating() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = create_test_store(&db, "Badge Store").await;

    let app = app(db.clone());

    // Submit two reviews: 4 and 5 -> weighted average 4.5
    for rating in [4, 5] {
        let body = serde_json::json!({
            "rating": rating,
            "comment": "nice store",
            "buyer_device_id": "buyer-1"
        });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/v1/stores/{store_id}/reviews"))
                    .header("content-type", "application/json")
                    .body(Body::from(body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            response.status(),
            StatusCode::CREATED,
            "submit review failed"
        );
    }

    // The store's rating should now be the average 4.5.
    let store = store::Entity::find_by_id(store_id)
        .one(&db)
        .await
        .expect("failed to load store")
        .expect("store not found");
    assert_eq!(store.rating, Some(4.5));

    // And both reviews should be listed.
    let count = review::Entity::find()
        .filter(review::Column::StoreId.eq(store_id))
        .count(&db)
        .await
        .expect("failed to count reviews");
    assert_eq!(count, 2);
}

/// Listing reviews returns the submitted ones.
#[tokio::test]
#[ignore]
async fn list_reviews_returns_submitted() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = create_test_store(&db, "Review Store").await;

    let app = app(db.clone());
    let body = serde_json::json!({
        "rating": 5,
        "comment": "great",
        "buyer_device_id": "buyer-2"
    });
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/stores/{store_id}/reviews"))
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/stores/{store_id}/reviews"))
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
    let reviews = payload["reviews"]
        .as_array()
        .expect("reviews must be an array");
    assert_eq!(reviews.len(), 1);
    assert_eq!(reviews[0]["rating"], 5);
    assert_eq!(reviews[0]["comment"], "great");
}
