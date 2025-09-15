use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};
use tracing::{info, warn};
use std::sync::Arc;
use sea_orm::DatabaseConnection;
use crate::db::revocation::RevocationRepo;
use crate::auth::validate_jwt;

/// Determine if cryptographic validation should be skipped for a given path
pub fn should_skip_validation(path: &str) -> bool {
    // Public endpoints that don't require authentication
    let public_paths = [
        "/healthz",
        // PoW challenge endpoint for obtaining challenges
        "/api/v1/pow/challenge",
        // PoW verification endpoint for obtaining certificates
        "/api/v1/pow/verify",
    ];

    public_paths
        .iter()
        .any(|&public_path| path == public_path || path.starts_with(&format!("{public_path}/")))
}

/// Extract token from Authorization header
/// Expected format: "Bearer <token>"
fn extract_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|auth_header| {
            auth_header
                .strip_prefix("Bearer ")
                .map(|token| token.to_string())
        })
}

/// Cryptographic validation middleware
/// This middleware ensures all incoming requests are properly authenticated
pub async fn crypto_validation_middleware(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let path = request.uri().path().to_string();

    // Skip validation for public endpoints
    if should_skip_validation(&path) {
        info!(path = %path, "Skipping crypto validation for public endpoint");
        return Ok(next.run(request).await);
    }

    info!(path = %path, "Applying cryptographic validation");

    // Extract headers for token check
    let headers = request.headers().clone();

    // Check for token authentication
    if let Some(token) = extract_token(&headers) {
        info!(path = %path, "Detected token, validating authentication");

        // Validate JWT and extract claims
        let claims = match validate_jwt(&token) {
            Ok(data) => data.claims,
            Err(_) => {
                warn!(path = %path, "JWT validation failed");
                return Err(StatusCode::UNAUTHORIZED);
            }
        };

        // Get DB connection from request extensions (assumes Arc<DatabaseConnection> is set as "db")
        let db = if let Some(db) = request.extensions().get::<Arc<DatabaseConnection>>() {
            db.clone()
        } else {
            warn!(path = %path, "Database connection not found in request extensions");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        };

        // Phone number existence in STORES cannot be checked (no phone_number column)

        // Check revocation status
        match RevocationRepo::is_revoked(&db, &claims.device_id).await {
            Ok(true) => {
                warn!(path = %path, "Device certificate is revoked");
                return Err(StatusCode::UNAUTHORIZED);
            }
            Ok(false) => {
                info!(path = %path, "Token and device are valid");
                return Ok(next.run(request).await);
            }
            Err(_) => {
                warn!(path = %path, "Error checking revocation status");
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        }
    }

    // No token found - authentication required
    warn!(
        path = %path,
        "Request missing authentication token in Authorization header"
    );
    Err(StatusCode::UNAUTHORIZED)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_skip_validation() {
        assert!(should_skip_validation("/healthz"));
        assert!(should_skip_validation("/api/v1/pow/challenge"));
        assert!(should_skip_validation("/api/v1/pow/verify"));

        assert!(!should_skip_validation("/api/v1/events"));
        assert!(!should_skip_validation("/some/other/path"));
    }

    #[test]
    fn test_extract_token() {
        let mut headers = HeaderMap::new();

        // No authorization header
        assert_eq!(extract_token(&headers), None);

        // Valid bearer token
        headers.insert("Authorization", "Bearer test_token".parse().unwrap());
        assert_eq!(extract_token(&headers), Some("test_token".to_string()));

        // Invalid format
        headers.insert("Authorization", "Basic dGVzdDp0ZXN0".parse().unwrap());
        assert_eq!(extract_token(&headers), None);
    }
}