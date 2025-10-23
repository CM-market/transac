use crate::db::stores::Store;
use crate::entity::store::Model as StoreModel;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[allow(dead_code)]
#[derive(Deserialize, ToSchema)]
pub struct CreateStoreRequest {
    pub name: String,
    pub description: Option<String>,
    pub logo_url: Option<String>,
    pub location: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub contact_whatsapp: Option<String>,
    pub owner_device_id: Option<String>,
}

#[allow(dead_code)]
#[derive(Deserialize, ToSchema)]
pub struct UpdateStoreRequest {
    pub name: String,
    pub description: Option<String>,
    pub logo_url: Option<String>,
    pub location: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub contact_whatsapp: Option<String>,
}

#[allow(dead_code)]
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
    State(db): State<DatabaseConnection>,
    Json(request): Json<CreateStoreRequest>,
) -> impl IntoResponse {
    match Store::create(
        &db,
        &request.name,
        request.description.as_deref(),
        request.logo_url.as_deref(),
        request.location.as_deref(),
        request.contact_phone.as_deref(),
        request.contact_email.as_deref(),
        request.contact_whatsapp.as_deref(),
        request.owner_device_id.as_deref(),
    )
    .await
    {
        Ok(store) => (StatusCode::CREATED, Json(StoreResponse { store })).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
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
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Store::get(&db, id).await {
        Ok(store) => (StatusCode::OK, Json(StoreResponse { store })).into_response(),
        Err(err) => (StatusCode::NOT_FOUND, err).into_response(),
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
pub async fn list_stores(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match Store::list(&db).await {
        Ok(stores) => (StatusCode::OK, Json(StoresListResponse { stores })).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
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
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateStoreRequest>,
) -> impl IntoResponse {
    match Store::update(
        &db,
        id,
        &request.name,
        request.description.as_deref(),
        request.logo_url.as_deref(),
        request.location.as_deref(),
        request.contact_phone.as_deref(),
        request.contact_email.as_deref(),
        request.contact_whatsapp.as_deref(),
    )
    .await
    {
        Ok(store) => (StatusCode::OK, Json(StoreResponse { store })).into_response(),
        Err(err) => (StatusCode::NOT_FOUND, err).into_response(),
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
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Store::delete(&db, id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => (StatusCode::NOT_FOUND, err).into_response(),
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
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // First verify the store exists
    match Store::get(&db, id).await {
        Ok(store) => {
            let store_id = id.to_string();
            let base_url = "https://transac.site"; // This should come from config
            let share_url = format!("{}/store/{}", base_url, store_id);
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
        Err(err) => (StatusCode::NOT_FOUND, err).into_response(),
    }
}

#[allow(dead_code)]
pub fn router(db: DatabaseConnection) -> Router<()> {
    Router::new()
        .route("/stores", post(create_store))
        .route("/stores", get(list_stores))
        .route("/stores/:id", get(get_store))
        .route("/stores/:id", put(update_store))
        .route("/stores/:id", delete(delete_store))
        .route("/stores/:id/share", get(get_store_share_links))
        .with_state(db)
}
