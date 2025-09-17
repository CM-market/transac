use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use chrono::{Duration, Utc};
use uuid::Uuid;
use std::env;

/// JWT claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // Subject (user ID)
    pub exp: i64,          // Expiration time
    pub iat: i64,          // Issued at
    pub relay_id: String,  // Relay identifier
    pub public_key: String, // Public key used for authentication
}

impl Claims {
    pub fn new(relay_id: String, public_key: String, expiration_hours: i64) -> Self {
        let now = Utc::now();
        Self {
            sub: relay_id.clone(),
            exp: (now + Duration::hours(expiration_hours)).timestamp(),
            iat: now.timestamp(),
            relay_id,
            public_key,
        }
    }
}

/// JWT service for token generation and validation
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    validation: Validation,
}

impl JwtService {
    pub fn new() -> Result<Self, String> {
        let secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| "your-secret-key-change-in-production".to_string());
        
        let encoding_key = EncodingKey::from_secret(secret.as_ref());
        let decoding_key = DecodingKey::from_secret(secret.as_ref());
        
        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_required_spec_claims(&["sub", "exp", "iat"]);
        
        Ok(Self {
            encoding_key,
            decoding_key,
            validation,
        })
    }

    pub fn generate_token(&self, relay_id: String, public_key: String) -> Result<String, String> {
        let claims = Claims::new(relay_id, public_key, 24); // 24 hours expiration
        
        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| format!("Failed to generate token: {}", e))
    }

    pub fn validate_token(&self, token: &str) -> Result<Claims, String> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &self.validation)
            .map_err(|e| format!("Invalid token: {}", e))?;
        
        Ok(token_data.claims)
    }

    pub fn is_token_valid(&self, token: &str) -> bool {
        self.validate_token(token).is_ok()
    }
}

impl Default for JwtService {
    fn default() -> Self {
        Self::new().expect("Failed to initialize JWT service")
    }
}
