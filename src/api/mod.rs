pub mod products;
pub mod media_storage;

use axum::Router;
use sea_orm::DatabaseConnection;

pub fn api_router(db: DatabaseConnection) -> Router {
    Router::new()
        .nest("/", products::router(db.clone()))
}