use axum::{http::StatusCode, response::IntoResponse, Json};
use thiserror::Error;
use tracing::error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal error: {0}")]
    Internal(#[from] anyhow::Error),

    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Internal(anyhow::anyhow!(s))
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_message) = match &self {
            AppError::Validation(msg) => {
                error!(error = %msg, "Validation error occurred");
                (StatusCode::BAD_REQUEST, msg.clone())
            }
            AppError::NotFound(msg) => {
                error!(error = %msg, "Not found error occurred");
                (StatusCode::NOT_FOUND, msg.clone())
            }
            AppError::Internal(err) => {
                error!(error = %err, "Internal server error occurred");
                (StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
            }
            AppError::Database(err) => {
                error!(error = %err, "Database error occurred");
                (StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
            }
        };

        (status, Json(serde_json::json!({ "error": error_message }))).into_response()
    }
}
