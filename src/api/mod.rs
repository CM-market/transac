pub mod image_analysis;
pub mod media_storage;
pub mod products;

use axum::Router;
use sea_orm::DatabaseConnection;

// For now, we'll create a simple router that doesn't use state
// This will be updated later to properly integrate with the main router
pub fn _api_router(db: DatabaseConnection) -> Router {
    products::router(db)
}
