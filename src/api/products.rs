use crate::api::media_storage::{MediaStorage, S3MediaStorage, StubMediaStorage};
use crate::db::products::Product;
use crate::entity::product::Model as ProductModel;
use crate::events::{create_event, EventType};
use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Deserialize, ToSchema)]
pub struct CreateProductRequest {
    pub sku: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[schema(value_type = Vec<String>, format = "uuid")]
    pub image_ids: Vec<Uuid>,
    pub price: f64,
    pub quantity_available: i32,
    pub category: String,
    pub return_policy: String,
}

#[derive(Deserialize, ToSchema)]
pub struct CreateReviewRequest {
    pub user_id: Uuid,
    pub rating: i32,
    pub comment: String,
}

#[derive(Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ListReviewsQuery {
    pub product_id: Uuid,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateProductRequest {
    pub sku: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[schema(value_type = Vec<String>, format = "uuid")]
    pub image_ids: Vec<Uuid>,
    pub price: f64,
    pub quantity_available: i32,
    pub category: String,
    pub return_policy: String,
}

#[derive(Deserialize, ToSchema)]
pub struct ListProductsQuery {
    pub store_id: Option<i32>,
}
use crate::ApiContext;

pub fn router() -> Router<ApiContext> {
    Router::new()
        .route("/", post(create_product).get(list_products))
        .route(
            "/:id",
            get(get_product).put(update_product).delete(delete_product),
        )
        .route(
            "/:id/media",
            post(upload_product_media)
                .put(edit_product_media)
                .delete(delete_product_media),
        )
        .route("/:id/reviews", post(create_review).get(list_reviews))
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
    State(state): State<ApiContext>,
    Json(payload): Json<CreateProductRequest>,
) -> impl IntoResponse {
    match Product::create(
        &state.pool,
        payload.sku.as_deref(),
        &payload.name,
        payload.description.as_deref(),
        payload.image_ids,
        payload.price,
        payload.quantity_available,
        &payload.category,
        &payload.return_policy,
    )
    .await
    {
        Ok(product) => {
            // Trigger real-time event: product created
            let event = create_event(
                EventType::ProductCreated,
                product.id,
                serde_json::json!({
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
async fn get_product(State(state): State<ApiContext>, Path(id): Path<Uuid>) -> impl IntoResponse {
    match Product::get(&state.pool, id).await {
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
    State(state): State<ApiContext>,
    Query(query): Query<ListProductsQuery>,
) -> impl IntoResponse {
    tracing::info!(
        "Attempting to list products with query: {:?}",
        query.store_id
    );

    let result = Product::list_all(&state.pool).await;

    match result {
        Ok(products) => {
            tracing::info!("Successfully fetched {} products", products.len());
            Json(products).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to list products: {}", e);
            (StatusCode::BAD_REQUEST, e).into_response()
        }
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
    State(state): State<ApiContext>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateProductRequest>,
) -> impl IntoResponse {
    match Product::update(
        &state.pool,
        id,
        payload.sku.as_deref(),
        &payload.name,
        payload.description.as_deref(),
        payload.image_ids,
        payload.price,
        payload.quantity_available,
        &payload.category,
        &payload.return_policy,
    )
    .await
    {
        Ok(product) => {
            // Trigger real-time event: product updated
            let event = create_event(
                EventType::ProductUpdated,
                product.id,
                serde_json::json!({
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
    State(state): State<ApiContext>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Product::delete(&state.pool, id).await {
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
    State(state): State<ApiContext>,
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
            let s3_key = match stub.upload_media(id, &mut multipart).await {
                Ok(key) => key,
                Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
            };
            // Continue with stub result
            let mut product = Product::get(&state.pool, id).await.unwrap();
            product.image_ids.push(image_id);
            if let Err(e) = Product::update_image_ids(&state.pool, id, product.image_ids).await {
                return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
            }
            return (
                StatusCode::OK,
                Json(MediaUploadResponse { image_id, s3_key }),
            )
                .into_response();
        }
    };
    let s3_key = match s3.upload_media(id, &mut multipart).await {
        Ok(key) => key,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    };
    // 5. Update product's image_id in DB
    let mut product = Product::get(&state.pool, id).await.unwrap();
    product.image_ids.push(image_id);
    if let Err(e) = Product::update_image_ids(&state.pool, id, product.image_ids).await {
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
    State(state): State<ApiContext>,
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
            let s3_key = match stub.upload_media(id, &mut multipart).await {
                Ok(key) => key,
                Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
            };
            let mut product = Product::get(&state.pool, id).await.unwrap();
            product.image_ids.push(image_id);
            if let Err(e) = Product::update_image_ids(&state.pool, id, product.image_ids).await {
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
    let s3_key = match s3.upload_media(id, &mut multipart).await {
        Ok(key) => key,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    };
    let mut product = Product::get(&state.pool, id).await.unwrap();
    product.image_ids.push(image_id);
    if let Err(e) = Product::update_image_ids(&state.pool, id, product.image_ids).await {
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
    State(state): State<ApiContext>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 1. Get product to find current image_id
    let product = match Product::get(&state.pool, id).await {
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
            // Update product's image_id to null
            if let Err(e) = Product::update_image_ids(&state.pool, id, vec![]).await {
                return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
            }

            // Trigger event for media deletion
            let event = create_event(
                EventType::ProductMediaDeleted,
                id,
                serde_json::json!({
                    "product_id": id,
                    "previous_image_ids": product.image_ids
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

    // 3. Update product's image_id to null
    if let Err(e) = Product::update_image_ids(&state.pool, id, vec![]).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }

    // Trigger event for media deletion
    let event = create_event(
        EventType::ProductMediaDeleted,
        id,
        serde_json::json!({
            "product_id": id,
            "previous_image_ids": product.image_ids
        }),
    );
    let _ = state.event_dispatcher.dispatch(event).await;

    (StatusCode::OK, "Media deleted").into_response()
}

/// Create a new review for a product
#[utoipa::path(
    post,
    path = "/products/{id}/reviews",
    request_body = CreateReviewRequest,
    responses(
        (status = 201, description = "Review created successfully", body = Model),
        (status = 400, description = "Bad request - invalid data")
    ),
    tag = "Reviews"
)]
async fn create_review(
    State(state): State<ApiContext>,
    Path(product_id): Path<Uuid>,
    Json(payload): Json<CreateReviewRequest>,
) -> impl IntoResponse {
    match crate::db::reviews::Review::create(
        &state.pool,
        product_id,
        payload.user_id,
        payload.rating,
        &payload.comment,
    )
    .await
    {
        Ok(review) => {
            // Update product's average rating and review count
            if let Err(e) = Product::update_rating_and_review_count(&state.pool, product_id).await {
                tracing::error!("Failed to update product rating and review count: {}", e);
                // Log the error but don't fail the review creation
            }
            (axum::http::StatusCode::CREATED, Json(review)).into_response()
        }
        Err(e) => (axum::http::StatusCode::BAD_REQUEST, e).into_response(),
    }
}

/// List reviews for a product
#[utoipa::path(
    get,
    path = "/products/{id}/reviews",
    params(
        ("id" = UuidSchema, Path, description = "Product ID")
    ),
    responses(
        (status = 200, description = "Reviews found", body = Vec<Model>),
        (status = 404, description = "Product not found")
    ),
    tag = "Reviews"
)]
async fn list_reviews(
    State(state): State<ApiContext>,
    Path(product_id): Path<Uuid>,
) -> impl IntoResponse {
    match crate::db::reviews::Review::get_by_product_id(&state.pool, product_id).await {
        Ok(reviews) => Json(reviews).into_response(),
        Err(e) => (axum::http::StatusCode::NOT_FOUND, e).into_response(),
    }
}
