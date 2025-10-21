pub mod image_analysis;
pub mod media_storage;
pub mod products;

use crate::ApiContext;
use axum::Router;

// For now, we'll create a simple router that doesn't use state
// This will be updated later to properly integrate with the main router
pub fn api_router() -> Router<ApiContext> {
    Router::new()
        .nest("/products", products::router())
}
