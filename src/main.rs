pub mod entity;
use axum::{response::IntoResponse, routing::get, Json, Router};
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
    tracing::info!("Health check requested");
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

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing with structured logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "transac=debug,tower_http=debug,axum::routing=debug".into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .with_thread_ids(true)
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

    let _pool = create_connection(&config).await?;

    let app = Router::new()
        .route("/healthz", get(healthz))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .merge(api_routes)
        // .merge(api::api_router(pool))  // Temporarily disabled due to state mismatch
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
                        headers = ?request.headers(),
                    )
                })
                .on_request(|_request: &axum::http::Request<_>, _span: &tracing::Span| {
                    tracing::info!("Started processing request")
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
        (name = "Products", description = "Product management endpoints")
    ),
    servers(
        (url = "http://localhost:3001", description = "Local server")
    )
)]
struct ApiDoc;
