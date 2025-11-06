use crate::auth::JwtService;
use crate::crypto::PowService;
use crate::events::EventDispatcher;
use std::sync::Arc;

#[derive(Clone)]
pub struct ApiContext {
    pub pool: sea_orm::DatabaseConnection,
    pub pow_service: Arc<PowService>,
    pub jwt_service: Arc<JwtService>,
    pub event_dispatcher: Arc<EventDispatcher>,
    pub image_analysis: Arc<crate::api::image_analysis::ImageAnalysisService>,
}