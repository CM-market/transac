use crate::db::reviews::Review;
use crate::entity::review::Model as ReviewModel;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[allow(dead_code)]
#[derive(Deserialize, ToSchema)]
pub struct CreateReviewRequest {
    /// Rating between 1 and 5.
    pub rating: i16,
    pub comment: Option<String>,
    /// Optional buyer device certificate ID. Defaults to "anonymous" when absent.
    pub buyer_device_id: Option<String>,
}

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct ReviewResponse {
    pub review: ReviewModel,
}

#[allow(dead_code)]
#[derive(Serialize, ToSchema)]
pub struct ReviewsListResponse {
    #[schema(value_type = String, format = "uuid")]
    pub store_id: Uuid,
    pub reviews: Vec<ReviewModel>,
}

/// Submit a rating and review for a store
#[utoipa::path(
    post,
    path = "/api/v1/stores/{id}/reviews",
    tag = "Reviews",
    params(
        ("id" = String, Path, description = "Store ID", format = "uuid")
    ),
    request_body = CreateReviewRequest,
    responses(
        (status = 201, description = "Review submitted and store rating updated", body = ReviewResponse),
        (status = 400, description = "Bad request - invalid rating"),
        (status = 404, description = "Store not found"),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn create_review(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Json(request): Json<CreateReviewRequest>,
) -> impl IntoResponse {
    let buyer = request
        .buyer_device_id
        .unwrap_or_else(|| "anonymous".to_string());
    match Review::create(&db, id, &buyer, request.rating, request.comment.as_deref()).await {
        Ok(review) => (StatusCode::CREATED, Json(ReviewResponse { review })).into_response(),
        Err(err) => {
            let status = if err.contains("between") {
                StatusCode::BAD_REQUEST
            } else if err.contains("Store not found") {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, err).into_response()
        }
    }
}

/// List reviews for a store
#[utoipa::path(
    get,
    path = "/api/v1/stores/{id}/reviews",
    tag = "Reviews",
    params(
        ("id" = String, Path, description = "Store ID", format = "uuid")
    ),
    responses(
        (status = 200, description = "List of reviews", body = ReviewsListResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[allow(dead_code)]
pub async fn list_reviews(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match Review::list_by_store(&db, id).await {
        Ok(reviews) => (
            StatusCode::OK,
            Json(ReviewsListResponse {
                store_id: id,
                reviews,
            }),
        )
            .into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
    }
}

#[allow(dead_code)]
pub fn router(db: DatabaseConnection) -> Router<()> {
    Router::new()
        .route("/api/v1/stores/:id/reviews", post(create_review))
        .route("/api/v1/stores/:id/reviews", get(list_reviews))
        .with_state(db)
}
