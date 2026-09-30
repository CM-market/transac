use crate::auth::JwtService;
use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};
use tracing::{debug, info, warn};

/// Public path prefixes that must remain reachable without a device certificate.
/// These are platform bootstrap and asset endpoints that run before (or do not
/// require) Proof of Work verification.
const PUBLIC_PATH_PREFIXES: &[&str] = &[
    // Liveness probe
    "/healthz",
    // OpenAPI documentation UI
    "/swagger-ui",
    "/api-docs",
    // PoW bootstrap endpoints used to obtain a challenge and certificate
    "/api/v1/pow/challenge",
    "/api/v1/pow/verify",
    // PWA public web-app assets (manifest, service worker, offline page)
    "/api/v1/manifest.json",
    "/api/v1/sw.js",
    "/api/v1/offline",
    // Public product media served directly to browsers via <img> tags
    "/api/v1/media",
];

/// Determine if cryptographic validation should be skipped for a given path
pub fn should_skip_validation(path: &str) -> bool {
    // Any other path (e.g. authenticated business API) requires a valid
    // device certificate presented as a Bearer token.
    PUBLIC_PATH_PREFIXES
        .iter()
        .any(|&prefix| path == prefix || path.starts_with(&format!("{prefix}/")))
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
        let jwt = JwtService::new().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
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
        // Public bootstrap / asset endpoints are exempt.
        assert!(should_skip_validation("/healthz"));
        assert!(should_skip_validation("/api/v1/pow/challenge"));
        assert!(should_skip_validation("/api/v1/pow/verify"));
        assert!(should_skip_validation("/swagger-ui"));
        assert!(should_skip_validation("/api-docs/openapi.json"));
        assert!(should_skip_validation("/api/v1/manifest.json"));
        assert!(should_skip_validation("/api/v1/sw.js"));
        assert!(should_skip_validation("/api/v1/offline"));
        assert!(should_skip_validation("/api/v1/media/abc123"));

        // Everything else (the authenticated business API) requires a cert.
        assert!(!should_skip_validation("/api/v1/events"));
        assert!(!should_skip_validation("/api/v1/products"));
        assert!(!should_skip_validation("/api/v1/profiles/me"));
        assert!(!should_skip_validation("/some/other/path"));
    }

    // Build a minimal app that applies the crypto validation middleware so we
    // can assert full-request behaviour (401 on missing/invalid cert).
    fn build_test_app() -> axum::Router {
        use axum::routing::get;

        axum::Router::new()
            .route("/protected", get(|| async { "ok" }))
            .route("/public", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn(crypto_validation_middleware))
    }

    #[tokio::test]
    async fn missing_certificate_is_rejected_with_401() {
        use axum::body::Body;
        use axum::http::Request;
        use tower::ServiceExt;

        let app = build_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn invalid_certificate_is_rejected_with_401() {
        use axum::body::Body;
        use axum::http::Request;
        use tower::ServiceExt;

        let app = build_test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/protected")
                    .header("Authorization", "Bearer not-a-valid-jwt")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
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
