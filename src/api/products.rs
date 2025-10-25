use crate::api::image_analysis::ImageAnalysisService;
use crate::api::media_storage::{MediaStorage, S3MediaStorage, StubMediaStorage};
use crate::auth::JwtService;
use crate::db::products::Product;
use crate::entity::product::Model as ProductModel;
use crate::events::{
    create_event, EventDispatcher, EventType, LoggingEventHandler, WebSocketEventHandler,
};
use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::error;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct CreateProductRequest {
    #[schema(value_type = String, format = "uuid")]
    pub store_id: Uuid,
    pub sku: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[schema(value_type = String, format = "uuid")]
    pub image_id: Option<Uuid>,
    pub price: f64,
    pub quantity_available: i32,
}

#[derive(Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct UpdateProductRequest {
    pub sku: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[schema(value_type = String, format = "uuid")]
    pub image_id: Option<Uuid>,
    pub price: f64,
    pub quantity_available: i32,
}

#[allow(dead_code)]
#[derive(Deserialize, ToSchema)]
pub struct ListProductsQuery {
    #[schema(value_type = String, format = "uuid")]
    pub store_id: Uuid,
}
#[allow(dead_code)]
pub fn router(db: DatabaseConnection) -> Router<()> {
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
        .route(
            "/products/:id",
            get(get_product).put(update_product).delete(delete_product),
        )
        .route(
            "/products/:id/media",
            post(upload_product_media)
                .put(edit_product_media)
                .delete(delete_product_media),
        )
        .with_state(ProductApiState {
            db,
            event_dispatcher: Arc::new(event_dispatcher),
            jwt_service,
            image_analysis,
        })
}

#[derive(Clone)]
#[allow(dead_code)]
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
        (status = 201, description = "Product created successfully", body = Model),
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
        payload.price,
        payload.quantity_available,
        payload.image_id,
    )
    .await
    {
        Ok(product) => {
            // Trigger real-time event: product created
            let event = create_event(
                EventType::ProductCreated,
                product.id,
                serde_json::json!({
                    "store_id": product.store_id,
                    "name": product.name,
                    "price": product.price
                }),
            );
            let _ = state.event_dispatcher.dispatch(event).await;

            (axum::http::StatusCode::CREATED, Json(product)).into_response()
        }
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}

/// Get a product by ID
#[utoipa::path(
    get,
    path = "/products/{id}",
    params(
        ("id" = UuidSchema, Path, description = "Product ID")
    ),
    responses(
        (status = 200, description = "Product found", body = Model),
        (status = 404, description = "Product not found")
    ),
    tag = "Products"
)]
async fn get_product(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Product::get(&state.db, id).await {
        Ok(product) => Json::<ProductModel>(product).into_response(),
        Err(e) => (axum::http::StatusCode::NOT_FOUND, e).into_response(),
    }
}

/// List products by store ID
#[utoipa::path(
    get,
    path = "/products",
    params(
        ("store_id" = UuidSchema, Query, description = "Store ID to filter products")
    ),
    responses(
        (status = 200, description = "Products found", body = Vec<Model>),
        (status = 400, description = "Bad request - invalid store ID")
    ),
    tag = "Products"
)]
async fn list_products(
    State(state): State<ProductApiState>,
    Query(query): Query<ListProductsQuery>,
) -> impl IntoResponse {
    match Product::list_by_store(&state.db, query.store_id).await {
        Ok(products) => Json::<Vec<ProductModel>>(products).into_response(),
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}

/// Update a product by ID
#[utoipa::path(
    put,
    path = "/products/{id}",
    params(
        ("id" = UuidSchema, Path, description = "Product ID")
    ),
    request_body = UpdateProductRequest,
    responses(
        (status = 200, description = "Product updated successfully", body = Model),
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
        payload.price,
        payload.quantity_available,
        payload.image_id,
    )
    .await
    {
        Ok(product) => {
            // Trigger real-time event: product updated
            let event = create_event(
                EventType::ProductUpdated,
                product.id,
                serde_json::json!({
                    "store_id": product.store_id,
                    "name": product.name,
                    "price": product.price
                }),
            );
            let _ = state.event_dispatcher.dispatch(event).await;

            Json(product).into_response()
        }
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}

/// Delete a product by ID
#[utoipa::path(
    delete,
    path = "/products/{id}",
    params(
        ("id" = UuidSchema, Path, description = "Product ID")
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
                }),
            );
            let _ = state.event_dispatcher.dispatch(event).await;

            axum::http::StatusCode::NO_CONTENT.into_response()
        }
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}
// --- Media upload/edit/delete endpoints for products ---

#[derive(Serialize, ToSchema)]
pub struct MediaUploadResponse {
    #[schema(value_type = String, format = "uuid")]
    image_id: Uuid,
    s3_key: String,
}

/// Upload media for a product
#[utoipa::path(
    post,
    path = "/products/{id}/media",
    params(
        ("id" = UuidSchema, Path, description = "Product ID")
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
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                format!("Image analysis error: {e}"),
            )
                .into_response()
        }
    };

    if !analysis_result.is_valid {
        return (
            StatusCode::BAD_REQUEST,
            format!("Image analysis failed: {:?}", analysis_result.violations),
        )
            .into_response();
    }
    // 3. Generate new image_id
    let image_id = Uuid::new_v4();
    // 4. Upload to S3/Minio
    let s3 = match S3MediaStorage::new().await {
        Ok(s3) => s3,
        Err(_) => {
            // Fallback to stub implementation if S3 initialization fails
            let stub = StubMediaStorage;

            // Use the file data from analysis result
            let file_name = analysis_result
                .file_name
                .as_deref()
                .unwrap_or("unknown.jpg");
            let content_type = analysis_result
                .file_type
                .as_deref()
                .unwrap_or("application/octet-stream");

            // If we have file data, use it, otherwise fall back to the old method
            let s3_key = if let Some(file_data) = &analysis_result.file_data {
                match stub
                    .upload_media_data(id, file_name, file_data, content_type, Some(image_id))
                    .await
                {
                    Ok(key) => key,
                    Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
                }
            } else {
                match stub.upload_media(id, &mut multipart).await {
                    Ok(key) => key,
                    Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
                }
            };

            // Continue with stub result
            return (
                StatusCode::OK,
                Json(MediaUploadResponse { image_id, s3_key }),
            )
                .into_response();
        }
    };

    // Use the file data from analysis result
    let file_name = analysis_result
        .file_name
        .as_deref()
        .unwrap_or("unknown.jpg");
    let content_type = analysis_result
        .file_type
        .as_deref()
        .unwrap_or("application/octet-stream");

    // If we have file data, use it, otherwise fall back to the old method
    let s3_key = if let Some(file_data) = &analysis_result.file_data {
        match s3
            .upload_media_data(id, file_name, file_data, content_type, Some(image_id))
            .await
        {
            Ok(key) => key,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
        }
    } else {
        match s3.upload_media(id, &mut multipart).await {
            Ok(key) => key,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
        }
    };
    // Image handling will be implemented separately

    // 6. Update the product with the new image_id
    if let Err(e) = Product::update_image(&state.db, id, Some(image_id)).await {
        error!("Failed to update product with image_id: {:?}", e);
        // Continue anyway, as the image was uploaded successfully
    }

    // 7. Trigger real-time events
    let event = create_event(
        EventType::ProductMediaUploaded,
        id,
        serde_json::json!({
            "product_id": id,
            "image_id": image_id,
            "s3_key": s3_key,
            "file_type": analysis_result.file_type,
            "file_size": analysis_result.file_size
        }),
    );
    let _ = state.event_dispatcher.dispatch(event).await;

    (
        StatusCode::OK,
        Json(MediaUploadResponse { image_id, s3_key }),
    )
        .into_response()
}

/// Replace media for a product
#[utoipa::path(
    put,
    path = "/products/{id}/media",
    params(
        ("id" = UuidSchema, Path, description = "Product ID")
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
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                format!("Image analysis error: {e}"),
            )
                .into_response()
        }
    };

    if !analysis_result.is_valid {
        return (
            StatusCode::BAD_REQUEST,
            format!("Image analysis failed: {:?}", analysis_result.violations),
        )
            .into_response();
    }

    let image_id = Uuid::new_v4();
    let s3 = match S3MediaStorage::new().await {
        Ok(s3) => s3,
        Err(_) => {
            // Fallback to stub implementation if S3 initialization fails
            let stub = StubMediaStorage;

            // Use the file data from analysis result
            let file_name = analysis_result
                .file_name
                .as_deref()
                .unwrap_or("unknown.jpg");
            let content_type = analysis_result
                .file_type
                .as_deref()
                .unwrap_or("application/octet-stream");

            // If we have file data, use it, otherwise fall back to the old method
            let s3_key = if let Some(file_data) = &analysis_result.file_data {
                match stub
                    .upload_media_data(id, file_name, file_data, content_type, Some(image_id))
                    .await
                {
                    Ok(key) => key,
                    Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
                }
            } else {
                match stub.upload_media(id, &mut multipart).await {
                    Ok(key) => key,
                    Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
                }
            };

            // Image handling will be implemented separately

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
                }),
            );
            let _ = state.event_dispatcher.dispatch(event).await;

            return (
                StatusCode::OK,
                Json(MediaUploadResponse { image_id, s3_key }),
            )
                .into_response();
        }
    };

    // Use the file data from analysis result
    let file_name = analysis_result
        .file_name
        .as_deref()
        .unwrap_or("unknown.jpg");
    let content_type = analysis_result
        .file_type
        .as_deref()
        .unwrap_or("application/octet-stream");

    // If we have file data, use it, otherwise fall back to the old method
    let s3_key = if let Some(file_data) = &analysis_result.file_data {
        match s3
            .upload_media_data(id, file_name, file_data, content_type, Some(image_id))
            .await
        {
            Ok(key) => key,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
        }
    } else {
        match s3.upload_media(id, &mut multipart).await {
            Ok(key) => key,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
        }
    };
    // Image handling will be implemented separately

    // Update the product with the new image_id
    if let Err(e) = Product::update_image(&state.db, id, Some(image_id)).await {
        error!("Failed to update product with image_id: {:?}", e);
        // Continue anyway, as the image was uploaded successfully
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
        }),
    );
    let _ = state.event_dispatcher.dispatch(event).await;

    (
        StatusCode::OK,
        Json(MediaUploadResponse { image_id, s3_key }),
    )
        .into_response()
}

/// Delete media for a product
#[utoipa::path(
    delete,
    path = "/products/{id}/media",
    params(
        ("id" = UuidSchema, Path, description = "Product ID")
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
    let _product = match Product::get(&state.db, id).await {
        Ok(product) => product,
        Err(_) => return (StatusCode::NOT_FOUND, "Product not found").into_response(),
    };

    // 2. Delete from S3/Minio
    let s3 = match S3MediaStorage::new().await {
        Ok(s3) => s3,
        Err(_) => {
            // Fallback to stub implementation
            let stub = StubMediaStorage;
            if let Err(e) = stub.delete_media(&format!("products/{id}/media")).await {
                return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
            }
            // Image handling will be implemented separately

            // Trigger event for media deletion
            let event = create_event(
                EventType::ProductMediaDeleted,
                id,
                serde_json::json!({
                    "product_id": id,
                    "previous_image_id": null
                }),
            );
            let _ = state.event_dispatcher.dispatch(event).await;

            return (StatusCode::OK, "Media deleted").into_response();
        }
    };

    // Delete from S3 using the stored s3_key (this would need to be stored in the product model)
    // For now, we'll use a placeholder key
    let s3_key = format!("products/{id}/media");
    if let Err(e) = s3.delete_media(&s3_key).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }

    // Clear the image_id in the product record
    if let Err(e) = Product::update_image(
        &state.db, id, None, // Set to None to clear the image_id
    )
    .await
    {
        error!("Failed to clear product image_id: {:?}", e);
        // Continue anyway, as the image was deleted successfully
    }

    // Trigger event for media deletion
    let event = create_event(
        EventType::ProductMediaDeleted,
        id,
        serde_json::json!({
            "product_id": id,
            "previous_image_id": null
        }),
    );
    let _ = state.event_dispatcher.dispatch(event).await;

    (StatusCode::OK, "Media deleted").into_response()
}
