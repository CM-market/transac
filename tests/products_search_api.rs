//! Integration tests for the product search/filter API (US6 / T-005).
//!
//! These require a live PostgreSQL database reachable at `DATABASE_URL` and are
//! therefore `#[ignore]`d by default, matching the repo's existing convention
//! (see `tests/notifications_api.rs`). Run explicitly when a database is
//! available:
//!
//! ```text
//! DATABASE_URL=postgres://user:pass@localhost:5432/transac_db \
//!   cargo test --test products_search_api -- --ignored --nocapture
//! ```

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use sea_orm::{ActiveModelTrait, Database, Set};
use tower::ServiceExt;
use uuid::Uuid;

use sea_orm_migration::MigratorTrait;
use transac::api::products::router as products_router;
use transac::entity::product::ActiveModel as ProductActiveModel;
use transac::entity::store::ActiveModel as StoreActiveModel;
use transac::migrator::Migrator;

async fn test_db() -> Option<sea_orm::DatabaseConnection> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let db = Database::connect(&url).await.ok()?;
    Migrator::up(&db, None).await.ok()?;
    Some(db)
}

fn app(db: sea_orm::DatabaseConnection) -> Router {
    products_router(db)
}

async fn seed_store(db: &sea_orm::DatabaseConnection, name: &str, location: &str) -> Uuid {
    let store = StoreActiveModel {
        id: Set(Uuid::new_v4()),
        name: Set(name.to_owned()),
        description: Set(None),
        logo_url: Set(None),
        location: Set(Some(location.to_owned())),
        contact_phone: Set(None),
        contact_email: Set(None),
        contact_whatsapp: Set(None),
        owner_device_id: Set(Some("search-test-device".to_owned())),
        is_verified: Set(false),
        rating: Set(None),
        total_products: Set(0),
        created_at: Set(chrono::Utc::now()),
        updated_at: Set(chrono::Utc::now()),
    }
    .insert(db)
    .await
    .expect("seed store");
    store.id
}

async fn seed_product(
    db: &sea_orm::DatabaseConnection,
    store_id: Uuid,
    name: &str,
    category: &str,
    price: f64,
) -> Uuid {
    let product = ProductActiveModel {
        id: Set(Uuid::new_v4()),
        store_id: Set(store_id),
        sku: Set(None),
        name: Set(name.to_owned()),
        description: Set(Some(format!("Description for {name}"))),
        category: Set(Some(category.to_owned())),
        price: Set(price),
        quantity_available: Set(10),
        image_id: Set(None),
        created_at: Set(chrono::Utc::now()),
    }
    .insert(db)
    .await
    .expect("seed product");
    product.id
}

/// Search with no filters returns all seeded products (paginated).
#[tokio::test]
#[ignore]
async fn search_returns_all_without_filters() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = seed_store(&db, "Seeds R Us", "Douala").await;
    seed_product(&db, store_id, "Organic Rice", "Food", 2500.0).await;
    seed_product(&db, store_id, "Solar Panel", "Electronics", 85000.0).await;

    let response = app(db)
        .oneshot(
            Request::builder()
                .uri("/api/v1/products/search")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 2);
    assert_eq!(json["page"], 1);
    assert!(json["items"].is_array());
}

/// Filter by category returns only products in that category.
#[tokio::test]
#[ignore]
async fn filter_by_category_returns_subset() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = seed_store(&db, "Category Store", "Yaoundé").await;
    seed_product(&db, store_id, "Rice 25kg", "Food", 15000.0).await;
    seed_product(&db, store_id, "Laptop", "Electronics", 450000.0).await;

    let response = app(db)
        .oneshot(
            Request::builder()
                .uri("/api/v1/products/search?category=Food")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 1);
    assert_eq!(json["items"][0]["name"], "Rice 25kg");
}

/// Filter by price range returns only in-range products.
#[tokio::test]
#[ignore]
async fn filter_by_price_range_returns_subset() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = seed_store(&db, "Price Store", "Douala").await;
    seed_product(&db, store_id, "Cheap", "Misc", 1000.0).await;
    seed_product(&db, store_id, "Mid", "Misc", 5000.0).await;
    seed_product(&db, store_id, "Expensive", "Misc", 20000.0).await;

    let response = app(db)
        .oneshot(
            Request::builder()
                .uri("/api/v1/products/search?min_price=2000&max_price=10000")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 1);
    assert_eq!(json["items"][0]["name"], "Mid");
}

/// Filter by store location matches products whose store is in that location.
#[tokio::test]
#[ignore]
async fn filter_by_location_returns_subset() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let douala = seed_store(&db, "Douala Store", "Douala").await;
    let yaounde = seed_store(&db, "Yaoundé Store", "Yaoundé").await;
    seed_product(&db, douala, "Douala Product", "Misc", 100.0).await;
    seed_product(&db, yaounde, "Yaoundé Product", "Misc", 100.0).await;

    let response = app(db)
        .oneshot(
            Request::builder()
                .uri("/api/v1/products/search?location=Douala")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 1);
    assert_eq!(json["items"][0]["name"], "Douala Product");
}

/// Keyword search matches product name.
#[tokio::test]
#[ignore]
async fn keyword_search_matches_name() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = seed_store(&db, "Keyword Store", "Bafoussam").await;
    seed_product(&db, store_id, "Golden Maize", "Food", 2000.0).await;
    seed_product(&db, store_id, "Iron Rod", "Construction", 5000.0).await;

    let response = app(db)
        .oneshot(
            Request::builder()
                .uri("/api/v1/products/search?q=maize")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 1);
    assert_eq!(json["items"][0]["name"], "Golden Maize");
}

/// Combining multiple filters returns the correct subset.
#[tokio::test]
#[ignore]
async fn combining_filters_returns_correct_subset() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let douala = seed_store(&db, "Douala Seller", "Douala").await;
    let yaounde = seed_store(&db, "Yaoundé Seller", "Yaoundé").await;
    // Douala, Electronics, within price range -> should match
    seed_product(&db, douala, "TV 42", "Electronics", 150000.0).await;
    // Douala, Electronics, outside price range -> should NOT match
    seed_product(&db, douala, "TV 60", "Electronics", 500000.0).await;
    // Douala, different category -> should NOT match
    seed_product(&db, douala, "Rice", "Food", 100000.0).await;
    // Yaoundé, Electronics, within price range -> should NOT match
    seed_product(&db, yaounde, "Radio", "Electronics", 80000.0).await;

    let response = app(db)
        .oneshot(
            Request::builder()
                .uri(
                    "/api/v1/products/search?location=Douala&category=Electronics&min_price=50000&max_price=200000",
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 1);
    assert_eq!(json["items"][0]["name"], "TV 42");
}

/// Pagination returns only the requested page slice.
#[tokio::test]
#[ignore]
async fn pagination_returns_requested_page() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let store_id = seed_store(&db, "Pagination Store", "Bamenda").await;
    seed_product(&db, store_id, "Item 1", "Misc", 10.0).await;
    seed_product(&db, store_id, "Item 2", "Misc", 20.0).await;
    seed_product(&db, store_id, "Item 3", "Misc", 30.0).await;

    let response = app(db)
        .oneshot(
            Request::builder()
                .uri("/api/v1/products/search?page_size=2&page=2")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 3);
    assert_eq!(json["total_pages"], 2);
    assert_eq!(json["page"], 2);
    let items = json["items"].as_array().unwrap();
    assert_eq!(items.len(), 1);
}
