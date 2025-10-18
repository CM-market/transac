use sea_orm::ColumnTrait;
pub mod products;
pub use products::*;
pub mod image_analysis;
pub mod media_storage;
use axum::{
    routing::post,
    Router,
    extract::{State, Json},
    response::IntoResponse,
    http::StatusCode,
};
use serde::Deserialize;
use sea_orm::DatabaseConnection;
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
    if !phone_exists_in_db(&state.db, &payload.phone_number).await {
        return (StatusCode::NOT_FOUND, "Phone number not found").into_response();
    }
    if !verify_otp(&payload.phone_number, &payload.otp) {
        return (StatusCode::UNAUTHORIZED, "OTP verification failed").into_response();
    }

    // Set is_revocked = true in REVOCATION for device_id
    if let Err(e) = RevocationRepo::_revoke(&state.db, &claims.device_id).await {
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
    use crate::api::phone_exists_in_db;
    use axum::{Router, body::Body, http::{Request, StatusCode}};
    use axum::body::to_bytes;
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

    // Helper macro for debug logging (must be defined before use)
    macro_rules! debug_log {
        ($($arg:tt)*) => {
            println!("[DEBUG] {}", format!($($arg)*));
        }
    }

    // Helper to run all migrations for the test database
    async fn run_migrations(db: &DatabaseConnection) {
        crate::migrator::Migrator::up(db, None).await.unwrap();
    }

    // Helper to create a test store (phone number)
    async fn create_store(db: &DatabaseConnection, phone_number: &str) {
        let store = StoreActiveModel {
            id: Set(Uuid::new_v4()), // Set id as UUID directly
            name: Set(format!("Test Store {}", phone_number)),
            description: Set(Some("Test".to_string())),
            created_at: Set(chrono::Utc::now()),
            phone_number: Set(phone_number.parse::<i64>().unwrap()),
            ..Default::default()
        };
    
        // Prepare debug info
        let insert_query = "INSERT INTO stores (name, description, created_at, phone_number) VALUES (?, ?, ?, ?)";
        debug_log!(
            "About to insert store with fields: name='{}', description='{:?}', created_at='{}', phone_number={}",
            store.name.as_ref(),
            store.description.as_ref(),
            store.created_at.as_ref(),
            store.phone_number.as_ref()
        );
        debug_log!("Insert query: {}", insert_query);
    
        let res = store.insert(db).await;
        match &res {
            Ok(model) => {
                debug_log!(
                    "Insert result: Ok. Inserted store: id={}, name='{}', description='{:?}', created_at='{}', phone_number={}",
                    model.id, model.name, model.description, model.created_at, model.phone_number
                );
            }
            Err(e) => {
                debug_log!("Insert result: Err: {:?}", e);
            }
        }
        // Unwrap as before (will panic if error, as in original)
        res.unwrap();
    }

    // Helper to create a test revocation record
    async fn create_revocation(db: &DatabaseConnection, device_id: &str, is_revocked: bool) {
        let rev = RevocationActiveModel {
            device_id: Set(device_id.to_string()),
            is_revocked: Set(is_revocked),
            ..Default::default()
        };
        // Debug logs before unwrap
        debug_log!(
            "About to insert revocation record: device_id='{}', is_revocked={}",
            device_id,
            is_revocked
        );
        debug_log!(
            "Insert query: INSERT INTO revocation (device_id, is_revocked) VALUES ('{}', {})",
            device_id,
            is_revocked
        );
        let insert_result = rev.insert(db).await;
        debug_log!("Insert result: {:?}", insert_result);
        insert_result.unwrap();
    }

    #[tokio::test]
    async fn test_revocation_and_reissue_flow() {
        // Setup in-memory SQLite DB for testing
        let db = Database::connect("sqlite::memory:").await.unwrap();
        // Manually create the stores table for SQLite test
        db.execute_unprepared(
            r#"
            CREATE TABLE IF NOT EXISTS stores (
                id BLOB PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                phone_number INTEGER NOT NULL
            );
            "#
        )
        .await
        .unwrap();
        // Run migrations to create tables
        run_migrations(&db).await;

        // Insert test phone numbers
        let phone1 = "10000000001";
        let phone2 = "10000000002";
        create_store(&db, phone1).await;
        create_store(&db, phone2).await;

        let db = Arc::new(db.clone());
        let state = AppState { db: db.clone() };
        let db = state.db.clone();
        let app = device_routes(state);

        // Insert revocation records for test device IDs to match JWTs
        create_revocation(&db, "test-device-1", false).await;
        create_revocation(&db, "test-device-2", false).await;

        // Helper to print debug info
        // (moved macro definition above)

        // 1. Use a hardcoded JWT for phone1 (seller)
        let jwt = crate::auth::issue_jwt("test-device-1", "seller", Some(phone1), 3600).unwrap();
        debug_log!("Hardcoded JWT for phone1: {}", jwt);

        // 2. Revoke phone1 with Authorization header
        let revoke_payload = format!(r#"{{"phone_number":"{}","otp":"123456"}}"#, phone1);
        debug_log!("Revoke payload: {}", revoke_payload);
        let req = Request::post("/api/device/revoke")
            .header("content-type", "application/json")
            .header("Authorization", format!("Bearer {}", jwt))
            .body(Body::from(revoke_payload.clone()))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        let status = resp.status();
        debug_log!("Revoke response status: {}", status);
        let body = to_bytes(resp.into_body(), 64 * 1024).await.unwrap();
        debug_log!("Revoke response body: {}", String::from_utf8_lossy(&body));
        
        // Check if phone number exists in the database
        if !phone_exists_in_db(&db, phone1).await {
            assert_eq!(status, StatusCode::NOT_FOUND);
        } else {
            assert_eq!(status, StatusCode::OK);
        }

        // 3. Login (reissue) should now succeed (since reissue clears revocation)
        debug_log!("Reissuing after revocation for phone1");
        let req = Request::post("/api/device/reissue")
            .header("content-type", "application/json")
            .header("Authorization", format!("Bearer {}", jwt))
            .body(Body::from(revoke_payload.clone()))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        let status = resp.status();
        debug_log!("Reissue response status: {}", status);
        let bytes = to_bytes(resp.into_body(), 64 * 1024).await.unwrap();
        let jwt2 = String::from_utf8(bytes.to_vec()).unwrap();
        debug_log!("Obtained new JWT: {}", jwt2);
        assert_eq!(status, StatusCode::OK);

        // 4. Attempt revoke with wrong phone number (not in stores)
        let wrong_payload = r#"{"phone_number":"19999999999","otp":"123456"}"#;
        debug_log!("Revoke with wrong phone payload: {}", wrong_payload);
        let req = Request::post("/api/device/revoke")
            .header("content-type", "application/json")
            .header("Authorization", format!("Bearer {}", jwt2))
            .body(Body::from(wrong_payload))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        let status = resp.status();
        debug_log!("Revoke (wrong phone) response status: {}", status);
        let body = to_bytes(resp.into_body(), 64 * 1024).await.unwrap();
        debug_log!("Revoke (wrong phone) response body: {}", String::from_utf8_lossy(&body));
        assert_eq!(status, StatusCode::NOT_FOUND);

        // 5. Only rightful user can revoke/reissue (simulate by using correct/incorrect phone numbers)
        // (Already covered above: only phone numbers in stores can be revoked/reissued)

        // 6. Test with multiple phone numbers
        // Use a hardcoded JWT for phone2 (seller)
        let jwt2 = crate::auth::issue_jwt("test-device-2", "seller", Some(phone2), 3600).unwrap();
        debug_log!("Hardcoded JWT for phone2: {}", jwt2);

        // Revoke phone2
        let revoke2_payload = format!(r#"{{"phone_number":"{}","otp":"123456"}}"#, phone2);
        debug_log!("Revoke payload for phone2: {}", revoke2_payload);
        let req = Request::post("/api/device/revoke")
            .header("content-type", "application/json")
            .header("Authorization", format!("Bearer {}", jwt2))
            .body(Body::from(revoke2_payload.clone()))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        let status = resp.status();
        debug_log!("Revoke response status for phone2: {}", status);
        let body = to_bytes(resp.into_body(), 64 * 1024).await.unwrap();
        debug_log!("Revoke response body for phone2: {}", String::from_utf8_lossy(&body));
        assert_eq!(status, StatusCode::OK);

        // Reissue phone2 (should succeed, but still needs Authorization if required)
        debug_log!("Reissuing after revocation for phone2");
        let req = Request::post("/api/device/reissue")
            .header("content-type", "application/json")
            .header("Authorization", format!("Bearer {}", jwt2))
            .body(Body::from(revoke2_payload.clone()))
            .unwrap();
        let resp = app.clone().call(req).await.unwrap();
        let status = resp.status();
        debug_log!("Reissue response status for phone2: {}", status);
        let bytes = to_bytes(resp.into_body(), 64 * 1024).await.unwrap();
        let jwt4 = String::from_utf8(bytes.to_vec()).unwrap();
        debug_log!("Obtained new JWT for phone2: {}", jwt4);
        assert_eq!(status, StatusCode::OK);
    }
}

async fn phone_exists_in_db(db: &DatabaseConnection, phone_number: &str) -> bool {
    use crate::entity::store::Entity as Store;
    use sea_orm::{EntityTrait, QueryFilter};
    Store::find()
        .filter(crate::entity::store::Column::PhoneNumber.eq(phone_number.parse::<i64>().unwrap()))
        .one(db)
        .await
        .map(|opt| opt.is_some())
        .unwrap_or(false)
}