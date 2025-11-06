use crate::context::ApiContext;
use crate::db::stores::Store;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

pub type StoreModel = crate::entity::store::Model;

#[allow(dead_code)]
#[derive(Deserialize, ToSchema)]
pub struct CreateStoreRequest {
    pub name: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub contact_phone: Option<String>,
}

#[allow(dead_code)]
#[derive(Deserialize, ToSchema)]
pub struct UpdateStoreRequest {
    pub name: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub contact_phone: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct StoreResponse {
    pub store: StoreModel,
}

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct StoresListResponse {
    pub stores: Vec<StoreModel>,
}

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct StoreShareResponse {
    pub store_id: String,
    pub share_url: String,
    pub whatsapp_share_url: String,
}

/// Create a new store
#[utoipa::path(
    post,
    path = "/stores",
    tag = "Stores",
    request_body = CreateStoreRequest,
    responses(
        (status = 201, description = "Store created successfully", body = StoreResponse),
        (status = 400, description = "Bad request - invalid input"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn create_store(
    State(ctx): State<ApiContext>,
    headers: HeaderMap,
    Json(request): Json<CreateStoreRequest>,
) -> impl IntoResponse {
    let claims = if let Some(token) = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
    {
        match ctx.jwt_service.validate_token(token) {
            Ok(claims) => claims,
            Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid token").into_response(),
        }
    } else {
        return (StatusCode::UNAUTHORIZED, "Missing token").into_response();
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, "Invalid user ID in token").into_response();
        }
    };

    match Store::create(
        &ctx.pool,
        &request.name,
        request.description.as_deref(),
        request.location.as_deref(),
        request.contact_phone.as_deref(),
        user_id,
    )
    .await
    {
        Ok(store) => (
            StatusCode::CREATED,
            Json(StoreResponse {
                store: store.into(),
            }),
        )
            .into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).into_response(),
    }
}

/// Get a store by ID
#[utoipa::path(
    get,
    path = "/stores/{id}",
    tag = "Stores",
    params(
        ("id" = String, Path, description = "Store ID", format = "uuid")
    ),
    responses(
        (status = 200, description = "Store found", body = StoreResponse),
        (status = 404, description = "Store not found"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn get_store(
    State(ctx): State<ApiContext>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Store::get(&ctx.pool, id).await {
        Ok(store) => (
            StatusCode::OK,
            Json(StoreResponse {
                store: store.into(),
            }),
        )
            .into_response(),
        Err(err) => (StatusCode::NOT_FOUND, err.to_string()).into_response(),
    }
}

/// List all stores
#[utoipa::path(
    get,
    path = "/stores",
    tag = "Stores",
    responses(
        (status = 200, description = "List of stores", body = StoresListResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn list_stores(State(ctx): State<ApiContext>) -> impl IntoResponse {
    match Store::list(&ctx.pool).await {
        Ok(stores) => (
            StatusCode::OK,
            Json(StoresListResponse {
                stores: stores.into_iter().map(Into::into).collect(),
            }),
        )
            .into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).into_response(),
    }
}

/// Update a store
#[utoipa::path(
    put,
    path = "/stores/{id}",
    tag = "Stores",
    params(
        ("id" = String, Path, description = "Store ID", format = "uuid")
    ),
    request_body = UpdateStoreRequest,
    responses(
        (status = 200, description = "Store updated successfully", body = StoreResponse),
        (status = 404, description = "Store not found"),
        (status = 400, description = "Bad request - invalid input"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn update_store(
    State(ctx): State<ApiContext>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateStoreRequest>,
) -> impl IntoResponse {
    match Store::update(
        &ctx.pool,
        id,
        &request.name,
        request.description.as_deref(),
        request.location.as_deref(),
        request.contact_phone.as_deref(),
    )
    .await
    {
        Ok(store) => (
            StatusCode::OK,
            Json(StoreResponse {
                store: store.into(),
            }),
        )
            .into_response(),
        Err(err) => (StatusCode::NOT_FOUND, err.to_string()).into_response(),
    }
}

/// Delete a store
#[utoipa::path(
    delete,
    path = "/stores/{id}",
    tag = "Stores",
    params(
        ("id" = String, Path, description = "Store ID", format = "uuid")
    ),
    responses(
        (status = 204, description = "Store deleted successfully"),
        (status = 404, description = "Store not found"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn delete_store(
    State(ctx): State<ApiContext>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Store::delete(&ctx.pool, id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => (StatusCode::NOT_FOUND, err.to_string()).into_response(),
    }
}

/// Generate store sharing links
#[utoipa::path(
    get,
    path = "/stores/{id}/share",
    tag = "Stores",
    params(
        ("id" = String, Path, description = "Store ID", format = "uuid")
    ),
    responses(
        (status = 200, description = "Store sharing links generated", body = StoreShareResponse),
        (status = 404, description = "Store not found"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn get_store_share_links(
    State(ctx): State<ApiContext>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // First verify the store exists
    match Store::get(&ctx.pool, id).await {
        Ok(store) => {
            let store_id = id.to_string();
            let base_url = "https://transac.site"; // This should come from config
            let share_url = format!("{base_url}/store/{store_id}");
            let whatsapp_message = format!(
                "Check out my store '{}' on Transac: {}",
                store.name, share_url
            );
            let whatsapp_share_url = format!(
                "https://wa.me/?text={}",
                urlencoding::encode(&whatsapp_message)
            );

            (
                StatusCode::OK,
                Json(StoreShareResponse {
                    store_id,
                    share_url,
                    whatsapp_share_url,
                }),
            )
                .into_response()
        }
        Err(err) => (StatusCode::NOT_FOUND, err.to_string()).into_response(),
    }
}

#[allow(dead_code)]
pub fn router() -> Router<ApiContext> {
    Router::new()
        .route("/stores", post(create_store).get(list_stores))
        .route(
            "/stores/:id",
            get(get_store).put(update_store).delete(delete_store),
        )
        .route("/stores/:id/share", get(get_store_share_links))
}
