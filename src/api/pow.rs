use axum::{extract::State, Json};
use crate::{
    context::ApiContext,
    crypto::{
        types::{PowChallengeResponse, TokenResponse, VerificationRequest},
    },
    db::users::User,
    error::AppError,
};

#[utoipa::path(
    post,
    path = "/pow/challenge",
    responses(
        (status = 200, description = "POW challenge", body = PowChallengeResponse),
    ),
    tag = "POW"
)]
pub async fn get_pow_challenge(
    State(ctx): State<ApiContext>,
) -> Result<Json<PowChallengeResponse>, AppError> {
    tracing::info!("POW challenge generation requested");
    let challenge = ctx.pow_service.generate_challenge()?;
    tracing::debug!(
        challenge_id = %challenge.challenge_id,
        difficulty = challenge.difficulty,
        "Generated POW challenge"
    );
    Ok(Json(PowChallengeResponse {
        challenge_id: challenge.challenge_id,
        challenge_data: challenge.challenge_data,
        difficulty: challenge.difficulty,
        expires_at: challenge.expires_at,
    }))
}

#[utoipa::path(
    post,
    path = "/pow/verify",
    request_body = VerificationRequest,
    responses(
        (status = 200, description = "POW solution verified", body = TokenResponse),
        (status = 422, description = "Invalid solution")
    ),
    tag = "POW"
)]
pub async fn verify_pow_solution(
    State(ctx): State<ApiContext>,
    Json(request): Json<VerificationRequest>,
) -> Result<Json<TokenResponse>, AppError> {
    tracing::info!(
        relay_id = %request.relay_id,
        "POW solution verification requested"
    );

    ctx.pow_service.verify_solution(&request.solution)?;
    tracing::debug!("POW solution verified successfully");

    // Check if user exists, if not create one
    let user = User::get_by_relay_id(&ctx.pool, &request.relay_id).await?;
    if user.is_none() {
        User::create(&ctx.pool, &request.relay_id).await?;
    }

    let token = ctx
        .jwt_service
        .generate_token(request.relay_id.clone(), request.public_key.clone())
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

    tracing::info!(
        relay_id = %request.relay_id,
        "JWT token generated successfully"
    );

    Ok(Json(TokenResponse { token }))
}

pub fn router() -> axum::Router<ApiContext> {
    axum::Router::new()
        .route("/challenge", axum::routing::post(get_pow_challenge))
        .route("/verify", axum::routing::post(verify_pow_solution))
}