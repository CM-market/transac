use crate::db::profiles::Profile;
use crate::entity::profile::Model as ProfileModel;
use crate::metrics::extract_valid_relay_id;
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, put},
    Json, Router,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct ProfileResponse {
    pub profile: ProfileModel,
}

#[allow(dead_code)]
#[derive(Deserialize, ToSchema)]
pub struct UpsertProfileRequest {
    /// Display name shown to other users.
    pub name: String,
    /// Contact phone in Cameroon format (`+237` + 9 digits) when present.
    pub phone: Option<String>,
    /// Free-text location.
    pub location: Option<String>,
}

/// Resolve the authenticated user's `relay_id` from the bearer JWT.
fn authenticated_relay_id(headers: &HeaderMap) -> Option<String> {
    extract_valid_relay_id(headers)
}

/// Get the current user's profile
#[utoipa::path(
    get,
    path = "/api/v1/profiles/me",
    tag = "Profiles",
    responses(
        (status = 200, description = "The current user's profile", body = ProfileResponse),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 404, description = "No profile exists for this user"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn get_my_profile(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let Some(relay_id) = authenticated_relay_id(&headers) else {
        return (StatusCode::UNAUTHORIZED, "Missing or invalid bearer token.").into_response();
    };

    match Profile::get_by_device(&db, &relay_id).await {
        Ok(Some(profile)) => (StatusCode::OK, Json(ProfileResponse { profile })).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "No profile exists for this user.").into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
    }
}

/// Create or update the current user's profile
#[utoipa::path(
    put,
    path = "/api/v1/profiles/me",
    tag = "Profiles",
    request_body = UpsertProfileRequest,
    responses(
        (status = 200, description = "Profile updated", body = ProfileResponse),
        (status = 201, description = "Profile created", body = ProfileResponse),
        (status = 400, description = "Invalid input - name or Cameroon phone"),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn upsert_my_profile(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Json(request): Json<UpsertProfileRequest>,
) -> impl IntoResponse {
    let Some(relay_id) = authenticated_relay_id(&headers) else {
        return (StatusCode::UNAUTHORIZED, "Missing or invalid bearer token.").into_response();
    };

    // Determine whether this is an insert (201) or an update (200).
    let existed = match Profile::get_by_device(&db, &relay_id).await {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(err) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, err).into_response();
        }
    };

    match Profile::upsert(
        &db,
        &relay_id,
        &request.name,
        request.phone.as_deref(),
        request.location.as_deref(),
    )
    .await
    {
        Ok(profile) => {
            let status = if existed {
                StatusCode::OK
            } else {
                StatusCode::CREATED
            };
            (status, Json(ProfileResponse { profile })).into_response()
        }
        Err(err) => {
            // Validation errors (name/phone) come back as 400.
            let status = if err.contains("required") || err.contains("Cameroon") {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, err).into_response()
        }
    }
}

#[allow(dead_code)]
pub fn router(db: DatabaseConnection) -> Router<()> {
    Router::new()
        .route("/api/v1/profiles/me", get(get_my_profile))
        .route("/api/v1/profiles/me", put(upsert_my_profile))
        .with_state(db)
}
