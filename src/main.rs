use axum::{response::IntoResponse, routing::get, Json, Router};
use migration::Migrator;
use migration::MigratorTrait;
use serde::Serialize;
use std::sync::Arc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use transac::{
    api::{api_router, image_analysis::ImageAnalysisService},
    auth::JwtService,
    config::Config,
    context::ApiContext,
    crypto::PowService,
    db::create_connection,
    events::{EventDispatcher, LoggingEventHandler, WebSocketEventHandler},
};
use utoipa::ToSchema;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[derive(Serialize, ToSchema)]
struct HealthResponse {
    message: &'static str,
}

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

#[derive(OpenApi)]
#[openapi(
    paths(
        healthz,
        transac::api::pow::get_pow_challenge,
        transac::api::pow::verify_pow_solution,
        transac::api::products::create_product,
        transac::api::products::get_product,
        transac::api::products::list_products,
        transac::api::products::update_product,
        transac::api::products::delete_product,
        transac::api::products::upload_product_media,
        transac::api::products::edit_product_media,
        transac::api::products::delete_product_media,
        transac::api::products::create_review,
        transac::api::products::list_reviews,
        transac::api::stores::create_store,
        transac::api::stores::get_store,
        transac::api::stores::list_stores,
        transac::api::stores::update_store,
        transac::api::stores::delete_store,
        transac::api::stores::get_store_share_links,
    ),
    components(
        schemas(
            HealthResponse,
            transac::crypto::types::PowChallenge,
            transac::crypto::types::PowSolution,
            transac::crypto::types::PowCertificateRequest,
            transac::crypto::types::PowChallengeResponse,
            transac::crypto::types::TokenResponse,
            transac::crypto::types::VerificationRequest,
            transac::api::products::CreateProductRequest,
            transac::api::products::UpdateProductRequest,
            transac::api::products::ListProductsQuery,
            transac::api::products::MediaUploadResponse,
            transac::entity::product::Model,
            transac::api::products::CreateReviewRequest,
            transac::entity::review::Model,
            transac::api::stores::CreateStoreRequest,
            transac::api::stores::UpdateStoreRequest,
            transac::api::stores::StoreResponse,
            transac::api::stores::StoresListResponse,
            transac::api::stores::StoreShareResponse,
        )
    ),
    tags(
        (name = "System", description = "System health and status endpoints"),
        (name = "POW", description = "Proof of Work authentication endpoints"),
        (name = "Products", description = "Product management endpoints"),
        (name = "Stores", description = "Store management endpoints")
    ),
    servers(
    )
)]
struct ApiDoc;

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
    let pool = create_connection(&config).await?;

    if config.run_migrations_on_start {
        info!("Running database migrations at startup");
        if let Err(e) = Migrator::up(&pool, None).await {
            tracing::error!(error = %e, "Database migrations failed");
            return Err(e.into());
        }
        info!("Database migrations completed");
    } else {
        tracing::info!("RUN_MIGRATIONS_ON_START is false; skipping migrations");
    }

    // Initialize event dispatcher
    let mut event_dispatcher = EventDispatcher::new();
    event_dispatcher.add_handler(Box::new(LoggingEventHandler));
    event_dispatcher.add_handler(Box::new(WebSocketEventHandler));

    // Initialize image analysis service
    let image_analysis = Arc::new(ImageAnalysisService::new());

    let api_context = ApiContext {
        pool: pool.clone(),
        pow_service: Arc::new(PowService::new(
            config.pow_difficulty,
            config.pow_timeout_minutes,
        )),
        jwt_service: Arc::new(JwtService::new().unwrap_or_default()),
        event_dispatcher: Arc::new(event_dispatcher),
        image_analysis,
    };

    let app = Router::new()
        .route("/healthz", get(healthz))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .nest("/api/v1", api_router())
        .with_state(api_context)
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
        )
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    info!("Server listening on http://0.0.0.0:3001");
    info!("Swagger UI available at http://0.0.0.0:3001/swagger-ui");
    axum::serve(listener, app).await?;

    Ok(())
}






#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_openapi_spec() {
        let openapi = ApiDoc::openapi();
        let json_spec = serde_json::to_string_pretty(&openapi).unwrap();
        std::fs::write("frontend/openapi.json", json_spec).unwrap();
    }
}
