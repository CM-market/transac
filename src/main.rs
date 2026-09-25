pub mod entity;
use axum::{http::StatusCode, response::IntoResponse, routing::get, Json, Router};
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
mod metrics;
mod migrator;
mod request_middleware;

use crate::auth::JwtService;
use crate::crypto::PowService;
use crate::error::AppError;
use axum::extract::{Path, State};
use axum::middleware;
use crypto::middleware::crypto_validation_middleware;
use std::sync::Arc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use config::Config;
use metrics::ActiveUsersTracker;

#[derive(Clone)]
pub struct ApiContext {
    pow_service: Arc<PowService>,
    jwt_service: Arc<JwtService>,
    active_users: Arc<ActiveUsersTracker>,
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

/// Records authenticated user activity into the shared active-user tracker.
///
/// Applied as an app-wide layer so that any request carrying a valid bearer
/// JWT counts toward the active-users metric. It is purely observational: it
/// never rejects or modifies the request.
async fn request_user_activity_middleware(
    State(ctx): State<ApiContext>,
    request: axum::extract::Request,
    next: middleware::Next,
) -> axum::response::Response {
    if let Some(relay_id) = metrics::extract_valid_relay_id(request.headers()) {
        ctx.active_users.record(relay_id);
    }
    next.run(request).await
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
        active_users: Arc::new(ActiveUsersTracker::new()),
    };

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

    // Create a separate router for media serving with database state
    let media_router = Router::new()
        .route("/api/v1/media/*path", get(serve_media_endpoint))
        .with_state(pool.clone());

    // Build the unified app router
    // Each sub-module provides its own router with its own state.
    // Using .nest() for all sub-routers to handle state boundaries correctly,
    // since each module manages its own state (DatabaseConnection, ProductApiState, etc.)
    // while the top-level app uses ApiContext for POW routes.
    let app = Router::new()
        .route("/healthz", get(healthz))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .nest(
            "/api/v1/pow",
            pow_routes().layer(middleware::from_fn(crypto_validation_middleware)),
        )
        .nest_service("/api/v1", api::stores::router(pool.clone()))
        .nest_service("/api/v1", api::reviews::router(pool.clone()))
        .nest_service("/api/v1", api::profiles::router(pool.clone()))
        .nest_service("/api/v1", api::products::router(pool))
        .nest_service("/api/v1", api::pwa::router())
        .nest_service("/api/v1", metrics::router(api_context.active_users.clone()))
        .nest("/api/v1/media", media_router)
        .layer(middleware::from_fn_with_state(
            api_context.clone(),
            request_user_activity_middleware,
        ))
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
        api::reviews::create_review,
        api::reviews::list_reviews,
        api::stores::update_store_verification,
        api::profiles::get_my_profile,
        api::profiles::upsert_my_profile,
        api::pwa::manifest,
        api::pwa::service_worker,
        api::pwa::offline,
        metrics::get_active_users,
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
            api::reviews::CreateReviewRequest,
            api::reviews::ReviewResponse,
            api::reviews::ReviewsListResponse,
            api::stores::VerificationRequest,
            metrics::ActiveUsersResponse,
            api::profiles::ProfileResponse,
            api::profiles::UpsertProfileRequest,
            entity::profile::Model,
            entity::product::Model,
        )
    ),
    tags(
        (name = "System", description = "System health and status endpoints"),
        (name = "POW", description = "Proof of Work authentication endpoints"),
        (name = "Products", description = "Product management endpoints"),
        (name = "Reviews", description = "Store rating and review endpoints"),
        (name = "Stores", description = "Store management endpoints"),
        (name = "Profiles", description = "User profile management endpoints"),
        (name = "PWA", description = "Progressive Web App endpoints"),
        (name = "Metrics", description = "System metrics and analytics endpoints")
    ),
    servers(
        (url = "http://localhost:3001", description = "Local server")
    )
)]
struct ApiDoc;

async fn serve_media_endpoint(
    State(_pool): State<sea_orm::DatabaseConnection>,
    Path(path): Path<String>,
) -> impl IntoResponse {
    tracing::info!(path = %path, "Serving media file");

    // Try to decode the path as base64 encoded S3 key first
    use base64::{engine::general_purpose, Engine as _};
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

    // Try to find an S3 object whose key contains this image_id (UUID)
    match find_s3_key_by_image_id(image_id).await {
        Ok(Some(s3_key)) => {
            tracing::debug!(s3_key = %s3_key, "Resolved image_id to S3 key");
            serve_direct_media_path(&s3_key).await
        }
        Ok(None) => {
            tracing::warn!(image_id = %image_id, "No S3 object found for image_id");
            (StatusCode::NOT_FOUND, "Image not found").into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, image_id = %image_id, "Failed to resolve image_id to S3 key");
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to resolve image").into_response()
        }
    }
}

// Search the bucket for an object whose key contains the given image_id (UUID)
async fn find_s3_key_by_image_id(image_id: uuid::Uuid) -> Result<Option<String>, String> {
    let access_key = std::env::var("AWS_ACCESS_KEY_ID")
        .map_err(|_| "AWS_ACCESS_KEY_ID environment variable not set".to_string())?;
    let secret_key = std::env::var("AWS_SECRET_ACCESS_KEY")
        .map_err(|_| "AWS_SECRET_ACCESS_KEY environment variable not set".to_string())?;
    let endpoint_url =
        std::env::var("AWS_ENDPOINT_URL").unwrap_or_else(|_| "http://localhost:9000".to_string());
    let region_name = std::env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string());
    let bucket_name =
        std::env::var("S3_BUCKET_NAME").unwrap_or_else(|_| "transac-media".to_string());

    let region = aws_config::meta::region::RegionProviderChain::default_provider()
        .or_else(aws_config::Region::new(region_name))
        .region()
        .await;

    let credentials =
        aws_sdk_s3::config::Credentials::new(access_key, secret_key, None, None, "static");

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
            .map_err(|e| format!("Failed to list objects: {e}"))?;

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

// Helper function to serve media directly by S3 path
async fn serve_direct_media_path(s3_key: &str) -> axum::response::Response {
    use crate::api::media_storage::S3MediaStorage;
    use axum::response::Response;

    // Initialize S3 storage
    let storage = match S3MediaStorage::new().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to initialize S3 storage: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to initialize storage",
            )
                .into_response();
        }
    };

    // Get the file from MinIO
    match get_media_from_storage(&storage, s3_key).await {
        Ok((data, content_type)) => {
            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", content_type)
                .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
                .body(axum::body::Body::from(data))
                .unwrap()
        }
        Err(e) => {
            tracing::error!("Failed to get media file {}: {}", s3_key, e);
            (StatusCode::NOT_FOUND, "Media file not found").into_response()
        }
    }
}

async fn get_media_from_storage(
    _storage: &crate::api::media_storage::S3MediaStorage,
    path: &str,
) -> Result<(Vec<u8>, String), String> {
    // Get bucket name from environment
    let bucket_name =
        std::env::var("S3_BUCKET_NAME").unwrap_or_else(|_| "transac-media".to_string());

    // Get the S3 client from storage (we need to expose it)
    // For now, let's create a new client instance
    let access_key = std::env::var("AWS_ACCESS_KEY_ID")
        .map_err(|_| "AWS_ACCESS_KEY_ID environment variable not set".to_string())?;
    let secret_key = std::env::var("AWS_SECRET_ACCESS_KEY")
        .map_err(|_| "AWS_SECRET_ACCESS_KEY environment variable not set".to_string())?;
    let endpoint_url =
        std::env::var("AWS_ENDPOINT_URL").unwrap_or_else(|_| "http://localhost:9000".to_string());
    let region_name = std::env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string());

    let region = aws_config::meta::region::RegionProviderChain::default_provider()
        .or_else(aws_config::Region::new(region_name))
        .region()
        .await;

    let credentials =
        aws_sdk_s3::config::Credentials::new(access_key, secret_key, None, None, "static");

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
        .map_err(|e| format!("Failed to get object from S3: {e}"))?;

    // Read the body
    let data = result
        .body
        .collect()
        .await
        .map_err(|e| format!("Failed to read object body: {e}"))?
        .into_bytes()
        .to_vec();

    // Determine content type based on file extension
    let content_type = match path.split('.').next_back() {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        _ => "application/octet-stream",
    }
    .to_string();

    Ok((data, content_type))
}
