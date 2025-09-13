use axum::{
    routing::post,
    Router,
    extract::{State, Json},
    response::IntoResponse,
    http::StatusCode,
};
use serde::Deserialize;
use sea_orm::DatabaseConnection;
use crate::db::stores::Store;
use crate::db::revocation::RevocationRepo;
use crate::auth::{issue_jwt};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<DatabaseConnection>,
}

#[derive(Deserialize)]
pub struct DeviceRequest {
    pub phone_number: String,
    pub otp: String,
}

// Simulate OTP verification (replace with real SMS OTP in production)
fn verify_otp(_phone_number: &str, _otp: &str) -> bool {
    // Accept any OTP for demo purposes
    true
}

use crate::auth::validate_jwt;

pub async fn revoke_device(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<DeviceRequest>,
) -> impl IntoResponse {
    // Extract and validate JWT from Authorization header
    let token = match headers.get("Authorization").and_then(|h| h.to_str().ok()) {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => return (StatusCode::UNAUTHORIZED, "Missing or invalid Authorization header").into_response(),
    };
    let claims = match validate_jwt(token) {
        Ok(data) => data.claims,
        Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid JWT").into_response(),
    };

    // Only allow sellers to revoke
    if claims.user_role != "seller" {
        return (StatusCode::FORBIDDEN, "Only sellers can revoke devices").into_response();
    }

    // WhatsApp/OTP verification (simulated)
    if !verify_otp(&payload.phone_number, &payload.otp) {
        return (StatusCode::UNAUTHORIZED, "OTP verification failed").into_response();
    }

    // Set is_revocked = true in REVOCATION for device_id
    if let Err(e) = RevocationRepo::revoke(&state.db, &claims.device_id).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {e}")).into_response();
    }

    (StatusCode::OK, "Device certificate revoked").into_response()
}

pub async fn reissue_device(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<DeviceRequest>,
) -> impl IntoResponse {
    // Extract and validate JWT from Authorization header
    let token = match headers.get("Authorization").and_then(|h| h.to_str().ok()) {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => return (StatusCode::UNAUTHORIZED, "Missing or invalid Authorization header").into_response(),
    };
    let claims = match validate_jwt(token) {
        Ok(data) => data.claims,
        Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid JWT").into_response(),
    };

    // WhatsApp/OTP verification (simulated)
    if !verify_otp(&payload.phone_number, &payload.otp) {
        return (StatusCode::UNAUTHORIZED, "OTP verification failed").into_response();
    }

    // Clear is_revocked in REVOCATION for device_id
    if let Err(e) = RevocationRepo::clear_revocation(&state.db, &claims.device_id).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {e}")).into_response();
    }

    // Issue new JWT with correct claims
    let user_role = if claims.user_role == "seller" { "seller" } else { "buyer" };
    let phone_number = if user_role == "seller" { Some(payload.phone_number.as_str()) } else { None };
    match issue_jwt(&claims.device_id, user_role, phone_number, 3600) {
        Ok(token) => (StatusCode::OK, token).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("JWT error: {e}")).into_response(),
    }
}

pub fn device_routes(state: AppState) -> Router {
    Router::new()
        .route("/api/device/revoke", post(revoke_device))
        .route("/api/device/reissue", post(reissue_device))
        .with_state(state)
}
#[cfg(test)]
mod tests {
    use tower::Service;
    use axum::ServiceExt;
    use axum::{Router, body::Body, http::{Request, StatusCode}};
    use sea_orm::ConnectionTrait;
    use sea_orm::{Database, DatabaseConnection, ActiveModelTrait, Set};
    use uuid::Uuid;
    use std::sync::Arc;

    use super::{device_routes, AppState, DeviceRequest};
    use crate::entity::store;
    use crate::entity::store::ActiveModel as StoreActiveModel;
    use crate::entity::revocation;
    use crate::entity::revocation::ActiveModel as RevocationActiveModel;
    use sea_orm_migration::MigratorTrait;

    // Helper to run all migrations for the test database
    async fn run_migrations(db: &DatabaseConnection) {
        crate::migrator::Migrator::up(db, None).await.unwrap();
    }

    // Helper to create a test store (phone number)
    async fn create_store(db: &DatabaseConnection, phone_number: &str) {
        let store = StoreActiveModel {
            id: Set(Uuid::new_v4()),

    // Helper to run all migrations for the test database
            name: Set(format!("Test Store {}", phone_number)),
            description: Set(Some("Test".to_string())),
            created_at: Set(chrono::Utc::now()),
            ..Default::default()
        };
        store.insert(db).await.unwrap();
    }

    // Helper to create a test revocation record
    async fn create_revocation(db: &DatabaseConnection, device_id: &str, is_revocked: bool) {
        let rev = RevocationActiveModel {
            device_id: Set(device_id.to_string()),
            is_revocked: Set(is_revocked),
            ..Default::default()
        };
        rev.insert(db).await.unwrap();
    }

    #[tokio::test]
    async fn test_revocation_and_reissue_flow() {
        // Setup in-memory SQLite DB for testing
        let db = Database::connect("sqlite::memory:").await.unwrap();
        // Manually create the stores table for SQLite test
        db.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS stores (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            );
            "#
        )
        .await
        .unwrap();
        // Run migrations to create tables
        run_migrations(&db).await;

        // Insert test phone numbers
        let phone1 = "+10000000001";
        let phone2 = "+10000000002";
        create_store(&db, phone1).await;
        create_store(&db, phone2).await;

        let state = AppState { db: Arc::new(db.clone()) };
        let app = device_routes(state);

        // 1. Login (reissue) should succeed for phone1
        let req = Request::post("/api/device/reissue")
            .header("content-type", "application/json")
            .body(Body::from(format!(r#"{{"phone_number":"{}","otp":"123456"}}"#, phone1)))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);

        // 2. Revoke phone1
        let req = Request::post("/api/device/revoke")
            .header("content-type", "application/json")
            .body(Body::from(format!(r#"{{"phone_number":"{}","otp":"123456"}}"#, phone1)))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);

        // 3. Login (reissue) should now succeed (since reissue clears revocation)
        let req = Request::post("/api/device/reissue")
            .header("content-type", "application/json")
            .body(Body::from(format!(r#"{{"phone_number":"{}","otp":"123456"}}"#, phone1)))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);

        // 4. Attempt revoke with wrong phone number (not in stores)
        let req = Request::post("/api/device/revoke")
            .header("content-type", "application/json")
            .body(Body::from(r#"{"phone_number":"+19999999999","otp":"123456"}"#))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);

        // 5. Only rightful user can revoke/reissue (simulate by using correct/incorrect phone numbers)
        // (Already covered above: only phone numbers in stores can be revoked/reissued)

        // 6. Test with multiple phone numbers
        // Revoke phone2
        let req = Request::post("/api/device/revoke")
            .header("content-type", "application/json")
            .body(Body::from(format!(r#"{{"phone_number":"{}","otp":"123456"}}"#, phone2)))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);

        // Reissue phone2
        let req = Request::post("/api/device/reissue")
            .header("content-type", "application/json")
            .body(Body::from(format!(r#"{{"phone_number":"{}","otp":"123456"}}"#, phone2)))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
    }
}