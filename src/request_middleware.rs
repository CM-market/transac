use axum::{
    extract::MatchedPath,
    http::{Request, Response},
    middleware::Next,
    response::IntoResponse,
};
use std::time::Instant;
use tracing::{info, warn};
use uuid::Uuid;

/// Custom middleware for detailed request logging
pub async fn request_logging_middleware(
    request: Request<axum::body::Body>,
    next: Next,
) -> Response<axum::body::Body> {
    let request_id = Uuid::new_v4();
    let start = Instant::now();
    let method = request.method().clone();
    let uri = request.uri().clone();
    let matched_path = request
        .extensions()
        .get::<MatchedPath>()
        .map(|path| path.as_str().to_string())
        .unwrap_or_else(|| uri.path().to_string());

    // Get client IP from headers (considering proxies)
    let client_ip = get_client_ip(&request);

    // Log the incoming request
    info!(
        request_id = %request_id,
        method = %method,
        path = %matched_path,
        uri = %uri,
        client_ip = %client_ip,
        "Incoming request"
    );

    // Process the request
    let response = next.run(request).await;

    let duration = start.elapsed();
    let status = response.status();

    // Log the response
    if status.is_success() {
        info!(
            request_id = %request_id,
            method = %method,
            path = %matched_path,
            status = %status,
            duration_ms = duration.as_millis(),
            client_ip = %client_ip,
            "Request completed successfully"
        );
    } else if status.is_client_error() {
        warn!(
            request_id = %request_id,
            method = %method,
            path = %matched_path,
            status = %status,
            duration_ms = duration.as_millis(),
            client_ip = %client_ip,
            "Client error response"
        );
    } else {
        warn!(
            request_id = %request_id,
            method = %method,
            path = %matched_path,
            status = %status,
            duration_ms = duration.as_millis(),
            client_ip = %client_ip,
            "Server error response"
        );
    }

    response
}

/// Extract client IP from request headers, considering common proxy headers
fn get_client_ip(request: &Request<axum::body::Body>) -> String {
    let headers = request.headers();

    // Try various headers in order of preference
    if let Some(forwarded_for) = headers.get("x-forwarded-for") {
        if let Ok(value) = forwarded_for.to_str() {
            // X-Forwarded-For can contain multiple IPs, take the first one
            if let Some(first_ip) = value.split(',').next() {
                return first_ip.trim().to_string();
            }
        }
    }

    if let Some(real_ip) = headers.get("x-real-ip") {
        if let Ok(value) = real_ip.to_str() {
            return value.to_string();
        }
    }

    if let Some(forwarded) = headers.get("forwarded") {
        if let Ok(value) = forwarded.to_str() {
            // Parse the Forwarded header for the 'for' field
            for part in value.split(';') {
                let part = part.trim();
                if part.starts_with("for=") {
                    let ip = part.trim_start_matches("for=");
                    // Remove quotes if present
                    let ip = ip.trim_matches('"');
                    // Remove port if present (IPv4)
                    if let Some(colon_pos) = ip.rfind(':') {
                        if !ip.starts_with('[') {
                            // Not IPv6
                            return ip[..colon_pos].to_string();
                        }
                    }
                    return ip.to_string();
                }
            }
        }
    }

    // Fallback to connection info (though this might not be available in all cases)
    "unknown".to_string()
}

/// Middleware to log database query execution times
#[allow(dead_code)]
pub async fn database_logging_middleware(
    request: Request<axum::body::Body>,
    next: Next,
) -> impl IntoResponse {
    let start = Instant::now();
    let response = next.run(request).await;
    let duration = start.elapsed();

    // Log slow queries
    if duration.as_millis() > 1000 {
        warn!(
            duration_ms = duration.as_millis(),
            "Slow database query detected"
        );
    }

    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_client_ip_x_forwarded_for() {
        let request = Request::builder()
            .header("x-forwarded-for", "192.168.1.1, 10.0.0.1")
            .body(axum::body::Body::empty())
            .unwrap();

        let ip = get_client_ip(&request);
        assert_eq!(ip, "192.168.1.1");
    }

    #[test]
    fn test_get_client_ip_x_real_ip() {
        let request = Request::builder()
            .header("x-real-ip", "203.0.113.1")
            .body(axum::body::Body::empty())
            .unwrap();

        let ip = get_client_ip(&request);
        assert_eq!(ip, "203.0.113.1");
    }

    #[test]
    fn test_get_client_ip_forwarded() {
        let request = Request::builder()
            .header("forwarded", "for=198.51.100.1;proto=https")
            .body(axum::body::Body::empty())
            .unwrap();

        let ip = get_client_ip(&request);
        assert_eq!(ip, "198.51.100.1");
    }

    #[test]
    fn test_get_client_ip_unknown() {
        let request = Request::builder().body(axum::body::Body::empty()).unwrap();

        let ip = get_client_ip(&request);
        assert_eq!(ip, "unknown");
    }
}
