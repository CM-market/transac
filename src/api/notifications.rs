use crate::db::notifications::Notification;
use crate::entity::notification::Model as NotificationModel;
use crate::metrics::extract_valid_relay_id;
use axum::{
    extract::{Path, State},
    http::HeaderMap,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, patch, post},
    Json, Router,
};
use sea_orm::DatabaseConnection;
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct NotificationsListResponse {
    pub notifications: Vec<NotificationModel>,
}

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct UnreadCountResponse {
    pub count: u64,
}

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct MarkReadResponse {
    pub updated: bool,
}

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct MarkAllReadResponse {
    pub updated: u64,
}

/// List notifications for the authenticated seller, newest first.
#[utoipa::path(
    get,
    path = "/api/v1/notifications",
    tag = "Notifications",
    responses(
        (status = 200, description = "List of seller notifications", body = NotificationsListResponse),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn list_notifications(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let Some(relay_id) = extract_valid_relay_id(&headers) else {
        return (StatusCode::UNAUTHORIZED, "Missing or invalid bearer token.").into_response();
    };

    match Notification::list_for_seller(&db, &relay_id).await {
        Ok(notifications) => (
            StatusCode::OK,
            Json(NotificationsListResponse { notifications }),
        )
            .into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
    }
}

/// Count unread notifications for the authenticated seller.
#[utoipa::path(
    get,
    path = "/api/v1/notifications/unread_count",
    tag = "Notifications",
    responses(
        (status = 200, description = "Number of unread notifications", body = UnreadCountResponse),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn unread_count(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let Some(relay_id) = extract_valid_relay_id(&headers) else {
        return (StatusCode::UNAUTHORIZED, "Missing or invalid bearer token.").into_response();
    };

    match Notification::unread_count(&db, &relay_id).await {
        Ok(count) => (StatusCode::OK, Json(UnreadCountResponse { count })).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
    }
}

/// Mark a single notification as read (scoped to the seller).
#[utoipa::path(
    patch,
    path = "/api/v1/notifications/{id}/read",
    tag = "Notifications",
    params(
        ("id" = String, Path, description = "Notification ID", format = "uuid")
    ),
    responses(
        (status = 200, description = "Notification marked as read", body = MarkReadResponse),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 404, description = "Notification not found"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn mark_read(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let Some(relay_id) = extract_valid_relay_id(&headers) else {
        return (StatusCode::UNAUTHORIZED, "Missing or invalid bearer token.").into_response();
    };

    match Notification::mark_read(&db, &relay_id, id).await {
        Ok(true) => (StatusCode::OK, Json(MarkReadResponse { updated: true })).into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, "Notification not found.").into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
    }
}

/// Mark all notifications for the seller as read.
#[utoipa::path(
    post,
    path = "/api/v1/notifications/read-all",
    tag = "Notifications",
    responses(
        (status = 200, description = "All notifications marked as read", body = MarkAllReadResponse),
        (status = 401, description = "Missing or invalid bearer token"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn mark_all_read(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let Some(relay_id) = extract_valid_relay_id(&headers) else {
        return (StatusCode::UNAUTHORIZED, "Missing or invalid bearer token.").into_response();
    };

    match Notification::mark_all_read(&db, &relay_id).await {
        Ok(updated) => (StatusCode::OK, Json(MarkAllReadResponse { updated })).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
    }
}

#[allow(dead_code)]
pub fn router(db: DatabaseConnection) -> Router<()> {
    Router::new()
        .route("/api/v1/notifications", get(list_notifications))
        .route("/api/v1/notifications/unread_count", get(unread_count))
        .route("/api/v1/notifications/:id/read", patch(mark_read))
        .route("/api/v1/notifications/read-all", post(mark_all_read))
        .with_state(db)
}
