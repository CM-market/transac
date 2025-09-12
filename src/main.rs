pub mod entity;
use axum::{
    routing::get,
    Router,
    Json,
    response::IntoResponse,
};
use serde::Serialize;
use tracing_subscriber::filter::EnvFilter;

mod config;
mod db;
mod crypto;
mod error;

use axum::middleware;
use crypto::middleware::crypto_validation_middleware;
use tower_http::cors::CorsLayer;
use crate::crypto::PowService;
use crate::error::AppError;
use axum::extract::State;
use std::sync::Arc;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use config::Config;

#[derive(Clone)]
pub struct ApiContext {
    // pool: sqlx::PgPool,
    pow_service: Arc<PowService>,
}
use db::create_connection;


#[derive(Serialize)]
struct HealthResponse {
    message: &'static str,
}

async fn healthz() -> impl IntoResponse {
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
    let challenge = ctx.pow_service.generate_challenge()?;
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
    ctx.pow_service.verify_solution(&request.solution)?;
    // TODO: Generate a real token
    let token = "valid_token_".to_string() + &request.solution.challenge_id;
    Ok(Json(crypto::types::TokenResponse { token }))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    // Load configuration
    let config = Config::from_env()?;

    // Initialize database pool
    // let pool = create_pool(&config).await?;

    let api_context = ApiContext {
        // pool: pool.clone(),
        pow_service: Arc::new(PowService::new(config.pow_difficulty, config.pow_timeout_minutes)),
    };

    let api_routes = Router::new()
        .nest("/api/v1/pow", pow_routes())
        .layer(middleware::from_fn(crypto_validation_middleware));

    let pool = create_connection(&config).await?;

    let app = Router::new()
        .route("/healthz", get(healthz))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .merge(api_routes)
        .layer(CorsLayer::permissive())
        .with_state(api_context);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    axum::serve(listener, app).await?;

    Ok(())
}

#[derive(OpenApi)]
#[openapi(
    paths(
        get_pow_challenge,
        verify_pow_solution,
    ),
    components(
        schemas(
            crypto::types::PowChallenge,
            crypto::types::PowSolution,
            crypto::types::PowCertificateRequest,
            crypto::types::PowChallengeResponse,
            crypto::types::TokenResponse,
            crypto::types::VerificationRequest
        )
    ),
    tags(
        (name = "transac", description = "Transac API")
    ),
    servers(
        (url = "http://localhost:3001", description = "Local server")
    )
)]
struct ApiDoc;
