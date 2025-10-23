use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};
use tracing::{info, warn, error, debug};
use crate::auth::JwtService;

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
    let path = request.uri().path();

    // Skip validation for public endpoints
    if should_skip_validation(path) {
        debug!(path = %path, "Skipping crypto validation for public endpoint");
        return Ok(next.run(request).await);
    }

    debug!(path = %path, "Applying cryptographic validation");

    // Extract headers for token check
    let headers = request.headers().clone();

    // Check for token authentication
    if let Some(token) = extract_token(&headers) {
        debug!(path = %path, "Detected bearer token, validating");

        // Validate JWT using JwtService (env-based secret)
        let jwt = JwtService::new().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR).unwrap();
        match jwt.validate_token(&token) {
            Ok(claims) => {
                info!(path = %path, relay_id = %claims.relay_id, "Authenticated request");
                return Ok(next.run(request).await);
            }
            Err(e) => {
                warn!(path = %path, error = %e, "Invalid JWT token");
                return Err(StatusCode::UNAUTHORIZED);
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

        // Valid bearer token format
        headers.insert("Authorization", "Bearer test_token".parse().unwrap());
        assert_eq!(extract_token(&headers), Some("test_token".to_string()));

        // Invalid format
        headers.insert("Authorization", "Basic dGVzdDp0ZXN0".parse().unwrap());
        assert_eq!(extract_token(&headers), None);
    }
}
