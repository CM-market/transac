pub mod entity;
use axum::{extract::Path, http::StatusCode, response::IntoResponse, routing::{delete, get, post}, Json, Router};
use serde::Serialize;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::ToSchema;

mod api;
mod auth;
mod config;
mod crypto;
mod db;
mod error;
mod events;
mod request_middleware;
mod migrator;

use crate::auth::JwtService;
use crate::crypto::PowService;
use crate::error::AppError;
use axum::extract::State;
use axum::middleware;
use crypto::middleware::crypto_validation_middleware;
use std::sync::Arc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use config::Config;

#[derive(Clone)]
pub struct ApiContext {
    // pool: sqlx::PgPool,
    pow_service: Arc<PowService>,
    jwt_service: Arc<JwtService>,
}

// Search the bucket for an object whose key contains the given image_id (UUID)
async fn find_s3_key_by_image_id(image_id: uuid::Uuid) -> Result<Option<String>, String> {
    // Prepare S3 client (same env setup as other S3 interactions)
    let access_key = std::env::var("AWS_ACCESS_KEY_ID")
        .map_err(|_| "AWS_ACCESS_KEY_ID environment variable not set".to_string())?;
    let secret_key = std::env::var("AWS_SECRET_ACCESS_KEY")
        .map_err(|_| "AWS_SECRET_ACCESS_KEY environment variable not set".to_string())?;
    let endpoint_url = std::env::var("AWS_ENDPOINT_URL")
        .unwrap_or_else(|_| "http://localhost:9000".to_string());
    let region_name = std::env::var("AWS_REGION")
        .unwrap_or_else(|_| "us-east-1".to_string());
    let bucket_name = std::env::var("S3_BUCKET_NAME")
        .unwrap_or_else(|_| "transac-media".to_string());

    let region = aws_config::meta::region::RegionProviderChain::default_provider()
        .or_else(aws_config::Region::new(region_name))
        .region()
        .await;

    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key,
        secret_key,
        None,
        None,
        "static",
    );

    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(region)
        .endpoint_url(&endpoint_url)
        .credentials_provider(credentials)
        .load()
        .await;

    let s3_config = aws_sdk_s3::config::Builder::from(&config)
        .force_path_style(true)
        .build();
    let client = aws_sdk_s3::Client::from_conf(s3_config);

    // We embedded a UUID in the key at upload time like
    // products/{product_id}/media/{media_uuid}_{basename}.{ext}
    // We'll scan keys under the common prefix and look for the UUID substring
    let uuid_str = image_id.to_string();
    let mut continuation: Option<String> = None;

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(&bucket_name)
            .prefix("products/");
        if let Some(token) = continuation.as_ref() {
            req = req.continuation_token(token);
        }
        let resp = req
            .send()
            .await
            .map_err(|e| format!("Failed to list objects: {}", e))?;

        let objects = resp.contents();
        if let Some(found) = objects
            .iter()
            .filter_map(|o| o.key())
            .find(|key| key.contains(&uuid_str))
        {
            return Ok(Some(found.to_string()));
        }

        if let Some(token) = resp.next_continuation_token() {
            continuation = Some(token.to_string());
        } else {
            break;
        }
    }

    Ok(None)
}
use db::create_connection;

#[derive(Serialize, ToSchema)]
struct HealthResponse {
    message: &'static str,
}

// Uuid schema for OpenAPI - represents a UUID string
#[derive(Serialize, ToSchema)]
#[schema(value_type = String, format = "uuid")]
struct UuidSchema;

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/healthz",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse)
    ),
    tag = "System"
)]
async fn healthz() -> impl IntoResponse {
    tracing::debug!("Health check requested");
    Json(HealthResponse { message: "ok" })
}

fn pow_routes() -> Router<ApiContext> {
    Router::new()
        .route("/challenge", axum::routing::post(get_pow_challenge))
        .route("/verify", axum::routing::post(verify_pow_solution))
}

#[utoipa::path(
    post,
    path = "/api/v1/pow/challenge",
    responses(
        (status = 200, description = "POW challenge", body = PowChallengeResponse),
    )
)]
async fn get_pow_challenge(
    State(ctx): State<ApiContext>,
) -> Result<Json<crypto::types::PowChallengeResponse>, AppError> {
    tracing::info!("POW challenge generation requested");
    let challenge = ctx.pow_service.generate_challenge()?;
    tracing::debug!(
        challenge_id = %challenge.challenge_id,
        difficulty = challenge.difficulty,
        "Generated POW challenge"
    );
    Ok(Json(crypto::types::PowChallengeResponse {
        challenge_id: challenge.challenge_id,
        challenge_data: challenge.challenge_data,
        difficulty: challenge.difficulty,
        expires_at: challenge.expires_at,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/pow/verify",
    request_body = VerificationRequest,
    responses(
        (status = 200, description = "POW solution verified", body = TokenResponse),
        (status = 422, description = "Invalid solution")
    )
)]
async fn verify_pow_solution(
    State(ctx): State<ApiContext>,
    Json(request): Json<crypto::types::VerificationRequest>,
) -> Result<Json<crypto::types::TokenResponse>, AppError> {
    tracing::info!(
        relay_id = %request.relay_id,
        "POW solution verification requested"
    );

    ctx.pow_service.verify_solution(&request.solution)?;
    tracing::debug!("POW solution verified successfully");

    // Generate a real JWT token
    let token = ctx
        .jwt_service
        .generate_token(request.relay_id.clone(), request.public_key.clone())
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

    tracing::info!(
        relay_id = %request.relay_id,
        "JWT token generated successfully"
    );

    Ok(Json(crypto::types::TokenResponse { token }))
}

// Create store endpoint with database integration
async fn create_store_endpoint(
    State(pool): State<sea_orm::DatabaseConnection>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    use crate::db::stores::Store;
    
    tracing::debug!("Store creation requested");
    
    let name = match request.get("name").and_then(|v| v.as_str()) {
        Some(name) => name,
        None => {
            return (StatusCode::BAD_REQUEST, "Name is required").into_response();
        }
    };
    
    let description = request.get("description")
        .and_then(|v| v.as_str());
    
    let logo_url = request.get("logo_url")
        .and_then(|v| v.as_str());
    
    let location = request.get("location")
        .and_then(|v| v.as_str());
    
    let contact_whatsapp = request.get("contact_whatsapp")
        .and_then(|v| v.as_str());
    
    let owner_device_id = request.get("owner_device_id")
        .and_then(|v| v.as_str());
    
    match Store::create(
        &pool,
        name,
        description,
        logo_url,
        location,
        None, // contact_phone
        None, // contact_email
        contact_whatsapp,
        owner_device_id,
    ).await {
        Ok(store) => {
            tracing::info!("Store created successfully: {}", store.id);
            let response = serde_json::json!({
                "store": store
            });
            (axum::http::StatusCode::CREATED, Json(response)).into_response()
        }
        Err(err) => {
            tracing::error!("Failed to create store: {}", err);
            (axum::http::StatusCode::INTERNAL_SERVER_ERROR, err).into_response()
        }
    }
}

// List stores endpoint
async fn list_stores_endpoint(
    State(pool): State<sea_orm::DatabaseConnection>,
) -> impl IntoResponse {
    use crate::db::stores::Store;
    
    tracing::debug!("Stores list requested");
    
    match Store::list(&pool).await {
        Ok(stores) => {
            tracing::info!("Found {} stores", stores.len());
            let response = serde_json::json!({
                "stores": stores
            });
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(err) => {
            tracing::error!("Failed to list stores: {}", err);
            (StatusCode::INTERNAL_SERVER_ERROR, err).into_response()
        }
    }
}

// Delete store endpoint
async fn delete_store_endpoint(
    State(pool): State<sea_orm::DatabaseConnection>,
    Path(store_id): Path<String>,
) -> impl IntoResponse {
    use crate::db::stores::Store;
    use uuid::Uuid;
    
    tracing::debug!(store_id = %store_id, "Store deletion requested");
    
    // Parse the store_id to UUID
    let uuid = match Uuid::parse_str(&store_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, "Invalid store ID format").into_response();
        }
    };
    
    match Store::delete(&pool, uuid).await {
        Ok(_) => {
            tracing::info!("Store deleted successfully: {}", store_id);
            StatusCode::NO_CONTENT.into_response()
        }
        Err(err) => {
            tracing::error!("Failed to delete store: {}", err);
            (StatusCode::INTERNAL_SERVER_ERROR, err).into_response()
        }
    }
}

// Update store endpoint
async fn update_store_endpoint(
    State(pool): State<sea_orm::DatabaseConnection>,
    Path(store_id): Path<String>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    use crate::db::stores::Store;
    use uuid::Uuid;
    
    tracing::debug!(store_id = %store_id, "Store update requested");
    
    // Parse the store_id to UUID
    let uuid = match Uuid::parse_str(&store_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, "Invalid store ID format").into_response();
        }
    };
    
    let name = request.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    
    let description = request.get("description")
        .and_then(|v| v.as_str());
    
    let logo_url = request.get("logo_url")
        .and_then(|v| v.as_str());
    
    let location = request.get("location")
        .and_then(|v| v.as_str());
    
    let contact_whatsapp = request.get("contact_whatsapp")
        .and_then(|v| v.as_str());
    
    match Store::update(
        &pool,
        uuid,
        name,
        description,
        logo_url,
        location,
        None, // contact_phone
        None, // contact_email
        contact_whatsapp,
    ).await {
        Ok(store) => {
            tracing::info!("Store updated successfully: {}", store_id);
            let response = serde_json::json!({
                "store": store
            });
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(err) => {
            tracing::error!("Failed to update store: {}", err);
            (StatusCode::INTERNAL_SERVER_ERROR, err).into_response()
        }
    }
}

// Simple product creation endpoint
async fn create_product_endpoint(
    State(pool): State<sea_orm::DatabaseConnection>,
    Json(request): Json<serde_json::Value>,
) -> impl IntoResponse {
    use crate::db::products::Product;
    use uuid::Uuid;
    
    tracing::debug!("Product creation requested");
    
    let name = request.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let description = request.get("description").and_then(|v| v.as_str());
    let price = request.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let quantity_available = request.get("quantity_available").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let store_id_str = request.get("store_id").and_then(|v| v.as_str()).unwrap_or("");
    
    tracing::debug!(name = %name, price = %price, quantity = %quantity_available, store_id = %store_id_str, "Parsed product values");
    
    let store_id = match Uuid::parse_str(store_id_str) {
        Ok(uuid) => {
            tracing::debug!(store_id = %uuid, "Successfully parsed store_id");
            uuid
        },
        Err(e) => {
            tracing::error!("Failed to parse store_id '{}': {}", store_id_str, e);
            return (StatusCode::BAD_REQUEST, "Invalid store_id format").into_response();
        }
    };
    
    tracing::debug!("About to call Product::create");
    
    match Product::create(
        &pool,
        store_id,
        None, // sku
        name,
        description,
        price,
        quantity_available,
        None, // image_id
    ).await {
        Ok(product) => {
            tracing::info!(product_id = %product.id, "Product created successfully");
            let response = serde_json::json!({
                "product": product
            });
            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(err) => {
            tracing::error!(error = %err, "Failed to create product");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create product: {}", err)).into_response()
        }
    }
}

// Simple product listing endpoint
async fn list_products_endpoint(
    State(pool): State<sea_orm::DatabaseConnection>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    use crate::db::products::Product;
    use uuid::Uuid;
    
    let store_id = params.get("store_id")
        .and_then(|s| Uuid::parse_str(s).ok());
    // Seller flow: require explicit store_id for product listing
    if store_id.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            "store_id query parameter is required to list products for a seller",
        )
            .into_response();
    }

    let store_id = store_id.unwrap();
    let result = Product::list_by_store(&pool, store_id).await;
    
    match result {
        Ok(products) => {
            let response = serde_json::json!({
                "products": products
            });
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(err) => {
            tracing::error!(error = %err, "Failed to list products");
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to list products").into_response()
        }
    }
}

// Simple media upload endpoint for products
async fn upload_product_media_endpoint(
    State(pool): State<sea_orm::DatabaseConnection>,
    Path(product_id): Path<String>,
    mut multipart: axum::extract::Multipart,
) -> impl IntoResponse {
    use uuid::Uuid;
    
    tracing::info!(product_id = %product_id, "Media upload requested");
    
    let product_uuid = match Uuid::parse_str(&product_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, "Invalid product ID format").into_response();
        }
    };
    
    // Check if product exists using SeaORM
    use crate::db::products::Product;
    match Product::get(&pool, product_uuid).await {
        Ok(_) => {
            tracing::debug!(product_id = %product_uuid, "Product exists, proceeding with upload");
        }
        Err(_) => {
            return (StatusCode::NOT_FOUND, "Product not found").into_response();
        }
    }
    
    // Process the uploaded file
    tracing::debug!("Starting multipart processing");
    while let Some(field) = match multipart.next_field().await {
        Ok(field) => field,
        Err(e) => {
            tracing::error!("Failed to get next multipart field: {}", e);
            return (StatusCode::BAD_REQUEST, format!("Multipart error: {}", e)).into_response();
        }
    } {
        let name = field.name().unwrap_or("unknown").to_string();
        let filename = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        
        tracing::debug!(field_name = %name, filename = %filename, content_type = %content_type, "Processing multipart field");
        
        if name == "file" {
            let data = match field.bytes().await {
                Ok(data) => data,
                Err(e) => {
                    tracing::error!(error = %e, "Failed to read file data");
                    return (StatusCode::BAD_REQUEST, "Failed to read file").into_response();
                }
            };
            
            tracing::debug!(size_bytes = data.len(), "File read from multipart");
            
            // Upload to MinIO/S3 using the proper S3MediaStorage implementation
            use crate::api::media_storage::{MediaStorage, S3MediaStorage};
            
            let storage = match S3MediaStorage::new().await {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!(error = %e, "Failed to initialize S3 storage");
                    return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to initialize storage").into_response();
                }
            };
            
            // Generate image_id first so the S3 key contains this UUID
            let image_id = uuid::Uuid::new_v4();
            let s3_key = match storage.upload_media_data(
                product_uuid,
                &filename,
                &data,
                &content_type,
                Some(image_id),
            ).await {
                Ok(key) => {
                    tracing::info!(s3_key = %key, "File uploaded to object storage");
                    key
                },
                Err(e) => {
                    tracing::error!(error = %e, "Failed to upload to object storage");
                    return (StatusCode::INTERNAL_SERVER_ERROR, format!("MinIO upload failed: {}", e)).into_response();
                }
            };
            
            // Update the product with the image_id
            use crate::db::products::Product;
            if let Err(e) = Product::update_image(&pool, product_uuid, Some(image_id)).await {
                tracing::error!(error = %e, "Failed to update product with image_id");
                // Continue anyway, as the image was uploaded successfully
            }
            
            tracing::info!(image_id = %image_id, s3_key = %s3_key, "Image stored");
            
            let response = serde_json::json!({
                "success": true,
                "product_id": product_uuid,
                "image_id": image_id,
                "filename": filename,
                "size": data.len(),
                "content_type": content_type,
                "s3_key": s3_key,
                // UUID based serving endpoint
                "image_url": format!("/api/v1/media/{}", image_id)
            });
            
            return (StatusCode::OK, Json(response)).into_response();
        }
    }
    
    (StatusCode::BAD_REQUEST, "No file uploaded").into_response()
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing with structured logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "transac=info,tower_http=info,axum::routing=info".into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .with_line_number(true)
                .with_file(true),
        )
        .init();

    info!("Starting Transac backend server");

    // Load configuration
    let config = Config::from_env()?;

    // Initialize database pool
    // let pool = create_pool(&config).await?;

    let api_context = ApiContext {
        // pool: pool.clone(),
        pow_service: Arc::new(PowService::new(
            config.pow_difficulty,
            config.pow_timeout_minutes,
        )),
        jwt_service: Arc::new(JwtService::new().unwrap_or_default()),
    };

    let api_routes = Router::new()
        .nest("/api/v1/pow", pow_routes())
        .layer(middleware::from_fn(crypto_validation_middleware));

    let pool = create_connection(&config).await?;
    if config.run_migrations_on_start {
        use sea_orm_migration::MigratorTrait;
        info!("Running database migrations at startup");
        if let Err(e) = migrator::Migrator::up(&pool, None).await {
            tracing::error!(error = %e, "Database migrations failed");
            return Err(anyhow::anyhow!(e));
        }
        info!("Database migrations completed");
    } else {
        tracing::info!("RUN_MIGRATIONS_ON_START is false; skipping migrations");
    }

    // Create a separate router for stores and products with database state
    let stores_router = Router::new()
        .route("/api/v1/stores", post(create_store_endpoint).get(list_stores_endpoint))
        .route("/api/v1/stores/:id", delete(delete_store_endpoint).put(update_store_endpoint))
        .route("/api/v1/products", post(create_product_endpoint).get(list_products_endpoint))
        .route("/api/v1/products/:id/media", post(upload_product_media_endpoint))
        .route("/api/v1/media/*path", get(serve_media_endpoint))
        .with_state(pool);

    let app = Router::new()
        .route("/healthz", get(healthz))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .merge(api_routes)
        .merge(stores_router)
        .layer(middleware::from_fn(
            request_middleware::request_logging_middleware,
        ))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &axum::http::Request<_>| {
                    tracing::info_span!(
                        "http_request",
                        method = %request.method(),
                        uri = %request.uri(),
                        version = ?request.version(),
                    )
                })
                .on_request(|_request: &axum::http::Request<_>, _span: &tracing::Span| {
                    tracing::debug!("Started processing request")
                })
                .on_response(
                    |response: &axum::http::Response<_>,
                     latency: std::time::Duration,
                     _span: &tracing::Span| {
                        tracing::info!(
                            status = %response.status(),
                            latency = ?latency,
                            "Finished processing request"
                        )
                    },
                )
                .on_failure(
                    |error: tower_http::classify::ServerErrorsFailureClass,
                     latency: std::time::Duration,
                     _span: &tracing::Span| {
                        tracing::error!(
                            error = %error,
                            latency = ?latency,
                            "Request failed"
                        )
                    },
                ),
        )
        .layer(CorsLayer::permissive())
        .with_state(api_context);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    info!("Server listening on http://0.0.0.0:3001");
    info!("Swagger UI available at http://0.0.0.0:3001/swagger-ui");
    axum::serve(listener, app).await?;

    Ok(())
}

#[derive(OpenApi)]
#[openapi(
    paths(
        healthz,
        get_pow_challenge,
        verify_pow_solution,
        api::products::create_product,
        api::products::get_product,
        api::products::list_products,
        api::products::update_product,
        api::products::delete_product,
        api::products::upload_product_media,
        api::products::edit_product_media,
        api::products::delete_product_media,
    ),
    components(
        schemas(
            HealthResponse,
            UuidSchema,
            crypto::types::PowChallenge,
            crypto::types::PowSolution,
            crypto::types::PowCertificateRequest,
            crypto::types::PowChallengeResponse,
            crypto::types::TokenResponse,
            crypto::types::VerificationRequest,
            api::products::CreateProductRequest,
            api::products::UpdateProductRequest,
            api::products::ListProductsQuery,
            api::products::MediaUploadResponse,
            entity::product::Model,
        )
    ),
    tags(
        (name = "System", description = "System health and status endpoints"),
        (name = "POW", description = "Proof of Work authentication endpoints"),
        (name = "Products", description = "Product management endpoints"),
        (name = "Stores", description = "Store management endpoints")
    ),
    servers(
        (url = "http://localhost:3001", description = "Local server")
    )
)]
struct ApiDoc;

// Serve media files from MinIO
async fn serve_media_endpoint(
    State(pool): State<sea_orm::DatabaseConnection>,
    Path(path): Path<String>,
) -> impl IntoResponse {
    use crate::api::media_storage::{MediaStorage, S3MediaStorage};
    use axum::response::Response;
    use axum::body::Body;
    
    tracing::info!(path = %path, "Serving media file");
    
    // Try to decode the path as base64 encoded S3 key first
    use base64::{Engine as _, engine::general_purpose};
    if let Ok(decoded_bytes) = general_purpose::STANDARD.decode(&path) {
        if let Ok(s3_key) = String::from_utf8(decoded_bytes) {
            tracing::debug!(s3_key = %s3_key, "Decoded S3 key from base64");
            return serve_direct_media_path(&s3_key).await;
        }
    }
    
    // Try to parse the path as a UUID (image_id)
    let image_id = match uuid::Uuid::parse_str(&path) {
        Ok(id) => id,
        Err(_) => {
            // If it's not a UUID and not base64, treat it as a direct S3 path
            return serve_direct_media_path(&path).await;
        }
    };
    
    // Try to find an S3 object whose key contains this image_id (UUID) that we embedded at upload time
    match find_s3_key_by_image_id(image_id).await {
        Ok(Some(s3_key)) => {
            tracing::debug!(s3_key = %s3_key, "Resolved image_id to S3 key");
            return serve_direct_media_path(&s3_key).await;
        }
        Ok(None) => {
            tracing::warn!(image_id = %image_id, "No S3 object found for image_id");
            return (StatusCode::NOT_FOUND, "Image not found").into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, image_id = %image_id, "Failed to resolve image_id to S3 key");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to resolve image").into_response();
        }
    }
}

// Helper function to serve media directly by S3 path
async fn serve_direct_media_path(s3_key: &str) -> axum::response::Response {
    use crate::api::media_storage::{MediaStorage, S3MediaStorage};
    use axum::response::Response;
    use axum::body::Body;
    
    // Initialize S3 storage
    let storage = match S3MediaStorage::new().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to initialize S3 storage: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to initialize storage").into_response();
        }
    };
    
    // Get the file from MinIO
    match get_media_from_storage(&storage, s3_key).await {
        Ok((data, content_type)) => {
            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", content_type)
                .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
                .body(Body::from(data))
                .unwrap()
        },
        Err(e) => {
            tracing::error!("Failed to get media file {}: {}", s3_key, e);
            (StatusCode::NOT_FOUND, "Media file not found").into_response()
        }
    }
}

// Placeholder function - in a real implementation, this would query MinIO to find the file
async fn find_product_image_in_minio(_s3_key_pattern: &str, _image_id: uuid::Uuid) -> Option<String> {
    // For now, return None - this function would need to list MinIO objects
    // and find the one that matches the image_id
    None
}

async fn get_media_from_storage(
    storage: &crate::api::media_storage::S3MediaStorage,
    path: &str,
) -> Result<(Vec<u8>, String), String> {
    
    // Get bucket name from environment
    let bucket_name = std::env::var("S3_BUCKET_NAME")
        .unwrap_or_else(|_| "transac-media".to_string());
    
    // Get the S3 client from storage (we need to expose it)
    // For now, let's create a new client instance
    let access_key = std::env::var("AWS_ACCESS_KEY_ID")
        .map_err(|_| "AWS_ACCESS_KEY_ID environment variable not set".to_string())?;
    let secret_key = std::env::var("AWS_SECRET_ACCESS_KEY")
        .map_err(|_| "AWS_SECRET_ACCESS_KEY environment variable not set".to_string())?;
    let endpoint_url = std::env::var("AWS_ENDPOINT_URL")
        .unwrap_or_else(|_| "http://localhost:9000".to_string());
    let region_name = std::env::var("AWS_REGION")
        .unwrap_or_else(|_| "us-east-1".to_string());
    
    let region = aws_config::meta::region::RegionProviderChain::default_provider()
        .or_else(aws_config::Region::new(region_name))
        .region()
        .await;

    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key,
        secret_key,
        None,
        None,
        "static"
    );
    
    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(region)
        .endpoint_url(&endpoint_url)
        .credentials_provider(credentials)
        .load()
        .await;

    let s3_config = aws_sdk_s3::config::Builder::from(&config)
        .force_path_style(true)
        .build();
    
    let client = aws_sdk_s3::Client::from_conf(s3_config);
    
    // Get the object from S3/MinIO
    let result = client
        .get_object()
        .bucket(&bucket_name)
        .key(path)
        .send()
        .await
        .map_err(|e| format!("Failed to get object from S3: {}", e))?;
    
    // Read the body
    let data = result
        .body
        .collect()
        .await
        .map_err(|e| format!("Failed to read object body: {}", e))?
        .into_bytes()
        .to_vec();
    
    // Determine content type based on file extension
    let content_type = match path.split('.').last() {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        _ => "application/octet-stream",
    }.to_string();
    
    Ok((data, content_type))
}
