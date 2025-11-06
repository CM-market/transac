use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::healthz,
        crate::api::pow::get_pow_challenge,
        crate::api::pow::verify_pow_solution,
        crate::api::products::create_product,
        crate::api::products::get_product,
        crate::api::products::list_products,
        crate::api::products::update_product,
        crate::api::products::delete_product,
        crate::api::products::upload_product_media,
        crate::api::products::edit_product_media,
        crate::api::products::delete_product_media,
        crate::api::products::create_review,
        crate::api::products::list_reviews,
        crate::api::stores::create_store,
        crate::api::stores::get_store,
        crate::api::stores::list_stores,
        crate::api::stores::update_store,
        crate::api::stores::delete_store,
        crate::api::stores::get_store_share_links,
    ),
    components(
        schemas(
            crate::HealthResponse,
            crate::crypto::types::PowChallenge,
            crate::crypto::types::PowSolution,
            crate::crypto::types::PowCertificateRequest,
            crate::crypto::types::PowChallengeResponse,
            crate::crypto::types::TokenResponse,
            crate::crypto::types::VerificationRequest,
            crate::api::products::CreateProductRequest,
            crate::api::products::UpdateProductRequest,
            crate::api::products::ListProductsQuery,
            crate::api::products::MediaUploadResponse,
            crate::entity::product::Model,
            crate::api::products::CreateReviewRequest,
            crate::entity::review::Model,
            crate::entity::store::Model,
            crate::api::stores::CreateStoreRequest,
            crate::api::stores::UpdateStoreRequest,
            crate::api::stores::StoreResponse,
            crate::api::stores::StoresListResponse,
            crate::api::stores::StoreShareResponse,
        )
    ),
    tags(
        (name = "System", description = "System health and status endpoints"),
        (name = "POW", description = "Proof of Work authentication endpoints"),
        (name = "Products", description = "Product management endpoints"),
        (name = "Stores", description = "Store management endpoints")
    ),
    servers(
    )
)]
pub struct ApiDoc;
