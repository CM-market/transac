//! Cryptographic module for Proof of Work (POW) implementation
//!
//! This module provides:
//! - POW challenge generation and verification
//! - Cryptographic middleware for request validation
//! - Certificate-based authentication

pub mod middleware;
pub mod pow;

// Re-export main components
pub use pow::PowService;

/// Common types for cryptographic operations
pub mod types {
    use serde::{Deserialize, Serialize};
    use utoipa::ToSchema;

    /// Proof of Work challenge
    #[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
    pub struct PowChallenge {
        pub challenge_id: String,
        pub challenge_data: String, // Base64 encoded random data
        pub difficulty: u32,        // Number of leading zeros required
        pub expires_at: chrono::DateTime<chrono::Utc>,
        pub created_at: chrono::DateTime<chrono::Utc>,
    }

    /// Proof of Work solution
    #[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
    pub struct PowSolution {
        pub challenge_id: String,
        pub nonce: u64,
        pub hash: String, // Base64 encoded hash result
    }

    /// Proof of Work request for certificate issuance
    #[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
    pub struct PowCertificateRequest {
        pub solution: PowSolution,
        pub public_key: String, // Base64 encoded public key
        pub client_id: String,
    }

    /// Response for PoW challenge request
    #[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
    pub struct PowChallengeResponse {
        pub challenge_id: String,
        pub challenge_data: String,
        pub difficulty: u32,
        pub expires_at: chrono::DateTime<chrono::Utc>,
    }

    /// Response for PoW verification (token only)
    #[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
    pub struct TokenResponse {
        pub token: String,
    }
    /// Request for PoW verification
    #[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
    pub struct VerificationRequest {
        pub solution: PowSolution,
        pub public_key: String,
        pub relay_id: String,
    }
}
