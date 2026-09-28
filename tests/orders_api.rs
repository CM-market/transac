//! Integration tests for the buyer order placement API + seller notification
//! (US15 / T-010).
//!
//! These require a live PostgreSQL database reachable at `DATABASE_URL` and are
//! therefore `#[ignore]`d by default, matching the repo's existing convention.
//! Run explicitly when a database is available:
//!
//! ```text
//! DATABASE_URL=postgres://user:pass@localhost:5432/transac_db \
//!   cargo test --test orders_api -- --ignored --nocapture
//! ```

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, EntityTrait, PaginatorTrait, QueryFilter, Set,
};
use tower::ServiceExt;
use uuid::Uuid;

use sea_orm_migration::MigratorTrait;
use transac::api::orders::router as orders_router;
use transac::auth::JwtService;
use transac::entity::{notification, order, product, profile, store};
use transac::migrator::Migrator;

async fn test_db() -> Option<sea_orm::DatabaseConnection> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let db = Database::connect(&url).await.ok()?;
    Migrator::up(&db, None).await.ok()?;
    Some(db)
}

fn app(db: sea_orm::DatabaseConnection) -> Router {
    orders_router(db)
}

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

async fn create_test_store(db: &sea_orm::DatabaseConnection, owner: &str) -> Uuid {
    let now = chrono::Utc::now();
    let store = store::ActiveModel {
        id: Set(Uuid::new_v4()),
        name: Set("Test Store".to_owned()),
        description: Set(None),
        logo_url: Set(None),
        location: Set(None),
        contact_phone: Set(None),
        contact_email: Set(None),
        contact_whatsapp: Set(None),
        owner_device_id: Set(Some(owner.to_owned())),
        is_verified: Set(false),
        rating: Set(None),
        total_products: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(db)
    .await
    .expect("failed to insert test store");
    store.id
}

async fn create_test_product(db: &sea_orm::DatabaseConnection, store_id: Uuid) -> Uuid {
    let product = product::ActiveModel {
        id: Set(Uuid::new_v4()),
        store_id: Set(store_id),
        sku: Set(None),
        name: Set("Widget".to_owned()),
        description: Set(None),
        category: Set(None),
        price: Set(1000.0),
        quantity_available: Set(10),
        image_id: Set(None),
        created_at: Set(chrono::Utc::now()),
    }
    .insert(db)
    .await
    .expect("failed to insert test product");
    product.id
}

async fn create_test_profile(db: &sea_orm::DatabaseConnection, device_id: &str) {
    let now = chrono::Utc::now();
    let _ = profile::ActiveModel {
        id: Set(Uuid::new_v4()),
        device_id: Set(device_id.to_owned()),
        name: Set("Alice Buyer".to_owned()),
        phone: Set(Some("+237612345678".to_owned())),
        location: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(db)
    .await
    .expect("failed to insert test profile");
}

/// Placing an order creates a notification for the seller with buyer + product
/// details, and decrements product stock.
#[tokio::test]
#[ignore]
async fn place_order_notifies_seller() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };

    let seller = "order-seller-1";
    let buyer = "order-buyer-1";
    let store_id = create_test_store(&db, seller).await;
    let product_id = create_test_product(&db, store_id).await;
    create_test_profile(&db, buyer).await;

    let app = app(db.clone());
    let token = bearer_token(buyer);

    let body = serde_json::json!({
        "product_id": product_id,
        "quantity": 2
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/orders")
                .header("content-type", "application/json")
                .header("authorization", &token)
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "order creation failed"
    );

    // An order row exists for the seller.
    let order_count = order::Entity::find()
        .filter(order::Column::SellerDeviceId.eq(seller.to_owned()))
        .count(&db)
        .await
        .expect("failed to count orders");
    assert_eq!(order_count, 1);

    // A notification was persisted for the seller with buyer + product info.
    let notif = notification::Entity::find()
        .filter(notification::Column::SellerDeviceId.eq(seller.to_owned()))
        .one(&db)
        .await
        .expect("failed to load notification")
        .expect("notification not created");

    assert_eq!(notif.title, "New order");
    let payload = notif.payload;
    assert_eq!(payload["buyer"]["name"], "Alice Buyer");
    assert_eq!(payload["buyer"]["phone"], "+237612345678");
    assert_eq!(payload["product"]["name"], "Widget");
    assert_eq!(payload["product"]["quantity"], 2);
    assert_eq!(payload["product"]["total"], 2000.0);

    // Product stock decremented from 10 to 8.
    let product = product::Entity::find_by_id(product_id)
        .one(&db)
        .await
        .expect("failed to load product")
        .expect("product not found");
    assert_eq!(product.quantity_available, 8);
}

/// Placing an order for more units than are in stock is rejected.
#[tokio::test]
#[ignore]
async fn place_order_rejects_insufficient_stock() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let seller = "order-seller-2";
    let buyer = "order-buyer-2";
    let store_id = create_test_store(&db, seller).await;
    let product_id = create_test_product(&db, store_id).await;

    let app = app(db.clone());
    let token = bearer_token(buyer);

    let body = serde_json::json!({
        "product_id": product_id,
        "quantity": 999
    });
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/orders")
                .header("content-type", "application/json")
                .header("authorization", &token)
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

/// Placing an order without a bearer token returns 401.
#[tokio::test]
#[ignore]
async fn place_order_requires_auth() {
    let Some(db) = test_db().await else {
        eprintln!("DATABASE_URL not available; skipping DB test");
        return;
    };
    let app = app(db);
    let body = serde_json::json!({"product_id": Uuid::new_v4(), "quantity": 1});
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/orders")
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
