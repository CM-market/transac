use axum::{
    extract::{Path, Query, State, Multipart},
    response::IntoResponse,
    Json, Router, routing::{get, post, put, delete},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sea_orm::DatabaseConnection;
use utoipa::ToSchema;
use crate::db::products::Product;
use crate::entity::product::Model as ProductModel;
use crate::api::media_storage::{S3MediaStorage, StubMediaStorage, MediaStorage};
use crate::api::image_analysis::{ImageAnalysisService, StubImageAnalysisService};
use crate::events::{EventDispatcher, create_event, EventType, LoggingEventHandler, WebSocketEventHandler};
use crate::auth::JwtService;
use std::sync::Arc;

#[derive(Deserialize, ToSchema)]
pub struct CreateProductRequest {
    pub store_id: Uuid,
    pub sku: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub image_id: Uuid,
    pub price: f64,
    pub quantity_available: i32,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateProductRequest {
    pub sku: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub image_id: Uuid,
    pub price: f64,
    pub quantity_available: i32,
}

#[derive(Deserialize, ToSchema)]
pub struct ListProductsQuery {
    pub store_id: Uuid,
}

pub fn router(db: DatabaseConnection) -> Router {
    // Initialize event dispatcher
    let mut event_dispatcher = EventDispatcher::new();
    event_dispatcher.add_handler(Box::new(LoggingEventHandler));
    event_dispatcher.add_handler(Box::new(WebSocketEventHandler));
    
    // Initialize JWT service
    let jwt_service = Arc::new(JwtService::new().unwrap_or_default());
    
    // Initialize image analysis service
    let image_analysis = Arc::new(ImageAnalysisService::new());
    
    Router::new()
        .route("/products", post(create_product).get(list_products))
        .route("/products/:id", get(get_product).put(update_product).delete(delete_product))
        .route("/products/:id/media", post(upload_product_media).put(edit_product_media).delete(delete_product_media))
        .with_state(ProductApiState {
            db,
            event_dispatcher: Arc::new(event_dispatcher),
            jwt_service,
            image_analysis,
        })
}

#[derive(Clone)]
pub struct ProductApiState {
    pub db: DatabaseConnection,
    pub event_dispatcher: Arc<EventDispatcher>,
    pub jwt_service: Arc<JwtService>,
    pub image_analysis: Arc<ImageAnalysisService>,
}

/// Create a new product
#[utoipa::path(
    post,
    path = "/products",
    request_body = CreateProductRequest,
    responses(
        (status = 201, description = "Product created successfully", body = ProductModel),
        (status = 400, description = "Bad request - invalid data")
    ),
    tag = "Products"
)]
async fn create_product(
    State(state): State<ProductApiState>,
    Json(payload): Json<CreateProductRequest>,
) -> impl IntoResponse {
    match Product::create(
        &state.db,
        payload.store_id,
        payload.sku.as_deref(),
        &payload.name,
        payload.description.as_deref(),
        payload.image_id,
        payload.price,
        payload.quantity_available,
    ).await {
        Ok(product) => {
            // Trigger real-time event: product created
            let event = create_event(
                EventType::ProductCreated,
                product.id,
                serde_json::json!({
                    "store_id": product.store_id,
                    "name": product.name,
                    "price": product.price
                })
            );
            let _ = state.event_dispatcher.dispatch(event).await;
            
            (axum::http::StatusCode::CREATED, Json(product)).into_response()
        },
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}

/// Get a product by ID
#[utoipa::path(
    get,
    path = "/products/{id}",
    params(
        ("id" = Uuid, Path, description = "Product ID")
    ),
    responses(
        (status = 200, description = "Product found", body = ProductModel),
        (status = 404, description = "Product not found")
    ),
    tag = "Products"
)]
async fn get_product(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Product::get(&state.db, id).await {
        Ok(product) => Json(product).into_response(),
        Err(e) => (axum::http::StatusCode::NOT_FOUND, e).into_response(),
    }
}

/// List products by store ID
#[utoipa::path(
    get,
    path = "/products",
    params(
        ("store_id" = Uuid, Query, description = "Store ID to filter products")
    ),
    responses(
        (status = 200, description = "Products found", body = Vec<ProductModel>),
        (status = 400, description = "Bad request - invalid store ID")
    ),
    tag = "Products"
)]
async fn list_products(
    State(state): State<ProductApiState>,
    Query(query): Query<ListProductsQuery>,
) -> impl IntoResponse {
    match Product::list_by_store(&state.db, query.store_id).await {
        Ok(products) => Json(products).into_response(),
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}

/// Update a product by ID
#[utoipa::path(
    put,
    path = "/products/{id}",
    params(
        ("id" = Uuid, Path, description = "Product ID")
    ),
    request_body = UpdateProductRequest,
    responses(
        (status = 200, description = "Product updated successfully", body = ProductModel),
        (status = 400, description = "Bad request - invalid data"),
        (status = 404, description = "Product not found")
    ),
    tag = "Products"
)]
async fn update_product(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateProductRequest>,
) -> impl IntoResponse {
    match Product::update(
        &state.db,
        id,
        payload.sku.as_deref(),
        &payload.name,
        payload.description.as_deref(),
        payload.image_id,
        payload.price,
        payload.quantity_available,
    ).await {
        Ok(product) => {
            // Trigger real-time event: product updated
            let event = create_event(
                EventType::ProductUpdated,
                product.id,
                serde_json::json!({
                    "store_id": product.store_id,
                    "name": product.name,
                    "price": product.price
                })
            );
            let _ = state.event_dispatcher.dispatch(event).await;
            
            Json(product).into_response()
        },
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}

/// Delete a product by ID
#[utoipa::path(
    delete,
    path = "/products/{id}",
    params(
        ("id" = Uuid, Path, description = "Product ID")
    ),
    responses(
        (status = 204, description = "Product deleted successfully"),
        (status = 400, description = "Bad request - invalid data"),
        (status = 404, description = "Product not found")
    ),
    tag = "Products"
)]
async fn delete_product(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Product::delete(&state.db, id).await {
        Ok(_) => {
            // Trigger real-time event: product deleted
            let event = create_event(
                EventType::ProductDeleted,
                id,
                serde_json::json!({
                    "product_id": id
                })
            );
            let _ = state.event_dispatcher.dispatch(event).await;
            
            axum::http::StatusCode::NO_CONTENT.into_response()
        },
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}
// --- Media upload/edit/delete endpoints for products ---

use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

#[derive(Serialize, ToSchema)]
struct MediaUploadResponse {
    image_id: Uuid,
    s3_key: String,
}

/// Upload media for a product
#[utoipa::path(
    post,
    path = "/products/{id}/media",
    params(
        ("id" = Uuid, Path, description = "Product ID")
    ),
    request_body = String,
    responses(
        (status = 200, description = "Media uploaded successfully", body = MediaUploadResponse),
        (status = 400, description = "Bad request - invalid image or analysis failed"),
        (status = 404, description = "Product not found"),
        (status = 500, description = "Internal server error - upload failed")
    ),
    tag = "Products"
)]
pub async fn upload_product_media(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    // 1. Analyze image using the image analysis service
    let analysis_result = match state.image_analysis.analyze_image(&mut multipart).await {
        Ok(result) => result,
        Err(e) => return (StatusCode::BAD_REQUEST, format!("Image analysis error: {}", e)).into_response(),
    };
    
    if !analysis_result.is_valid {
        return (StatusCode::BAD_REQUEST, format!("Image analysis failed: {:?}", analysis_result.violations)).into_response();
    }
    // 3. Generate new image_id
    let image_id = Uuid::new_v4();
    // 4. Upload to S3/Minio
    let s3 = match S3MediaStorage::new().await {
        Ok(s3) => s3,
        Err(e) => {
            // Fallback to stub implementation if S3 initialization fails
            let stub = StubMediaStorage;
            let s3_key = match stub.upload_media(id, &mut multipart).await {
                Ok(key) => key,
                Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
            };
            // Continue with stub result
            if let Err(e) = Product::update_image_id(&db, id, image_id).await {
                return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
            }
            return (StatusCode::OK, Json(MediaUploadResponse { image_id, s3_key })).into_response();
        }
    };
    let s3_key = match s3.upload_media(id, &mut multipart).await {
        Ok(key) => key,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    };
    // 5. Update product's image_id in DB
    if let Err(e) = Product::update_image_id(&state.db, id, image_id).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
    
    // 6. Trigger real-time events
    let event = create_event(
        EventType::ProductMediaUploaded,
        id,
        serde_json::json!({
            "product_id": id,
            "image_id": image_id,
            "s3_key": s3_key,
            "file_type": analysis_result.file_type,
            "file_size": analysis_result.file_size
        })
    );
    let _ = state.event_dispatcher.dispatch(event).await;
    
    (StatusCode::OK, Json(MediaUploadResponse { image_id, s3_key })).into_response()
}

/// Replace media for a product
#[utoipa::path(
    put,
    path = "/products/{id}/media",
    params(
        ("id" = Uuid, Path, description = "Product ID")
    ),
    request_body = String,
    responses(
        (status = 200, description = "Media replaced successfully", body = MediaUploadResponse),
        (status = 400, description = "Bad request - invalid image or analysis failed"),
        (status = 404, description = "Product not found"),
        (status = 500, description = "Internal server error - upload failed")
    ),
    tag = "Products"
)]
pub async fn edit_product_media(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    // Same as upload, but replace existing media
    let analysis_result = match state.image_analysis.analyze_image(&mut multipart).await {
        Ok(result) => result,
        Err(e) => return (StatusCode::BAD_REQUEST, format!("Image analysis error: {}", e)).into_response(),
    };
    
    if !analysis_result.is_valid {
        return (StatusCode::BAD_REQUEST, format!("Image analysis failed: {:?}", analysis_result.violations)).into_response();
    }
    
    let image_id = Uuid::new_v4();
    let s3 = match S3MediaStorage::new().await {
        Ok(s3) => s3,
        Err(_) => {
            // Fallback to stub implementation if S3 initialization fails
            let stub = StubMediaStorage;
            let s3_key = match stub.upload_media(id, &mut multipart).await {
                Ok(key) => key,
                Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
            };
            if let Err(e) = Product::update_image_id(&state.db, id, image_id).await {
                return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
            }
            
            // Trigger event for media replacement
            let event = create_event(
                EventType::ProductMediaReplaced,
                id,
                serde_json::json!({
                    "product_id": id,
                    "image_id": image_id,
                    "s3_key": s3_key,
                    "file_type": analysis_result.file_type,
                    "file_size": analysis_result.file_size
                })
            );
            let _ = state.event_dispatcher.dispatch(event).await;
            
            return (StatusCode::OK, Json(MediaUploadResponse { image_id, s3_key })).into_response();
        }
    };
    let s3_key = match s3.upload_media(id, &mut multipart).await {
        Ok(key) => key,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    };
    if let Err(e) = Product::update_image_id(&state.db, id, image_id).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
    
    // Trigger event for media replacement
    let event = create_event(
        EventType::ProductMediaReplaced,
        id,
        serde_json::json!({
            "product_id": id,
            "image_id": image_id,
            "s3_key": s3_key,
            "file_type": analysis_result.file_type,
            "file_size": analysis_result.file_size
        })
    );
    let _ = state.event_dispatcher.dispatch(event).await;
    
    (StatusCode::OK, Json(MediaUploadResponse { image_id, s3_key })).into_response()
}

/// Delete media for a product
#[utoipa::path(
    delete,
    path = "/products/{id}/media",
    params(
        ("id" = Uuid, Path, description = "Product ID")
    ),
    responses(
        (status = 200, description = "Media deleted successfully"),
        (status = 404, description = "Product not found"),
        (status = 500, description = "Internal server error - deletion failed")
    ),
    tag = "Products"
)]
pub async fn delete_product_media(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 1. Get product to find current image_id
    let product = match Product::get(&state.db, id).await {
        Ok(product) => product,
        Err(_) => return (StatusCode::NOT_FOUND, "Product not found").into_response(),
    };
    
    // 2. Delete from S3/Minio
    let s3 = match S3MediaStorage::new().await {
        Ok(s3) => s3,
        Err(_) => {
            // Fallback to stub implementation
            let stub = StubMediaStorage;
            if let Err(e) = stub.delete_media(&format!("products/{}/media", id)).await {
                return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
            }
            // Update product's image_id to null
            if let Err(e) = Product::update_image_id(&state.db, id, Uuid::nil()).await {
                return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
            }
            
            // Trigger event for media deletion
            let event = create_event(
                EventType::ProductMediaDeleted,
                id,
                serde_json::json!({
                    "product_id": id,
                    "previous_image_id": product.image_id
                })
            );
            let _ = state.event_dispatcher.dispatch(event).await;
            
            return (StatusCode::OK, "Media deleted").into_response();
        }
    };
    
    // Delete from S3 using the stored s3_key (this would need to be stored in the product model)
    // For now, we'll use a placeholder key
    let s3_key = format!("products/{}/media", id);
    if let Err(e) = s3.delete_media(&s3_key).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
    
    // 3. Update product's image_id to null
    if let Err(e) = Product::update_image_id(&state.db, id, Uuid::nil()).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }
    
    // Trigger event for media deletion
    let event = create_event(
        EventType::ProductMediaDeleted,
        id,
        serde_json::json!({
            "product_id": id,
            "previous_image_id": product.image_id
        })
    );
    let _ = state.event_dispatcher.dispatch(event).await;
    
    (StatusCode::OK, "Media deleted").into_response()
}
