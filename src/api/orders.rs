use crate::db::notifications::Notification;
use crate::db::orders::Order;
use crate::db::profiles::Profile;
use crate::db::stores::Store;
use crate::metrics::extract_valid_relay_id;
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[allow(dead_code)]
#[derive(Deserialize, ToSchema)]
pub struct CreateOrderRequest {
    /// Product being ordered.
    #[schema(value_type = String, format = "uuid")]
    pub product_id: Uuid,
    /// Number of units to order.
    pub quantity: i32,
}

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct CreateOrderResponse {
    #[schema(value_type = String, format = "uuid")]
    pub order_id: Uuid,
    #[schema(value_type = String, format = "uuid")]
    pub product_id: Uuid,
    pub product_name: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub total: f64,
    #[schema(value_type = String, format = "uuid")]
    pub store_id: Uuid,
}

/// Place an order on behalf of the authenticated buyer and notify the seller.
#[utoipa::path(
    post,
    path = "/api/v1/orders",
    tag = "Orders",
    request_body = CreateOrderRequest,
    responses(
        (status = 201, description = "Order placed; seller notified", body = CreateOrderResponse),
        (status = 400, description = "Bad request - invalid quantity or insufficient stock"),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 404, description = "Product not found"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn create_order(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Json(request): Json<CreateOrderRequest>,
) -> impl IntoResponse {
    let Some(buyer_relay_id) = extract_valid_relay_id(&headers) else {
        return (StatusCode::UNAUTHORIZED, "Missing or invalid bearer token.").into_response();
    };

    match Order::create(&db, request.product_id, &buyer_relay_id, request.quantity).await {
        Ok(order) => {
            notify_seller(&db, &order, &buyer_relay_id).await;
            (
                StatusCode::CREATED,
                Json(CreateOrderResponse {
                    order_id: order.id,
                    product_id: order.product_id,
                    product_name: order.product_name,
                    quantity: order.quantity,
                    unit_price: order.unit_price,
                    total: order.total,
                    store_id: order.store_id,
                }),
            )
                .into_response()
        }
        Err(err) => {
            let status = if err.contains("not found") {
                StatusCode::NOT_FOUND
            } else if err.contains("Quantity") || err.contains("stock") {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, err).into_response()
        }
    }
}

/// Persist a notification to the seller with buyer info + product details.
///
/// This is non-fatal: failures are logged so an order is never dropped because
/// of a notification delivery problem.
async fn notify_seller(
    db: &DatabaseConnection,
    order: &crate::entity::order::Model,
    buyer_relay_id: &str,
) {
    let (buyer_name, buyer_phone) = match Profile::get_by_device(db, buyer_relay_id).await {
        Ok(Some(profile)) => (profile.name, profile.phone.unwrap_or_default()),
        _ => ("Buyer".to_string(), String::new()),
    };

    let store_name = Store::get(db, order.store_id)
        .await
        .ok()
        .map(|s| s.name)
        .unwrap_or_else(|| "your store".to_string());

    let title = "New order".to_string();
    let message = format!(
        "{} ordered {} x {} of {} ({}).",
        buyer_name,
        order.quantity,
        order.product_name,
        format_price(order.unit_price),
        store_name
    );

    let payload = serde_json::json!({
        "order_id": order.id,
        "product_id": order.product_id,
        "store_id": order.store_id,
        "buyer": {
            "device_id": buyer_relay_id,
            "name": buyer_name,
            "phone": buyer_phone,
        },
        "product": {
            "name": order.product_name,
            "unit_price": order.unit_price,
            "quantity": order.quantity,
            "total": order.total,
        },
    });

    if let Err(e) =
        Notification::create(db, &order.seller_device_id, &title, &message, payload).await
    {
        tracing::error!(
            "Order {} placed but failed to notify seller {}: {:?}",
            order.id,
            order.seller_device_id,
            e
        );
    }
}

fn format_price(price: f64) -> String {
    format!("{price:.0} XAF")
}

#[allow(dead_code)]
pub fn router(db: DatabaseConnection) -> Router<()> {
    Router::new()
        .route("/api/v1/orders", post(create_order))
        .with_state(db)
}
