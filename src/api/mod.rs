pub mod image_analysis;
pub mod media_storage;
pub mod products;
pub mod stores;
pub mod pow;

use crate::context::ApiContext;
use axum::Router;

pub fn api_router() -> Router<ApiContext> {
    Router::new()
        .merge(products::router())
        .merge(stores::router())
        .nest("/pow", pow::router())
}
