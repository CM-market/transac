use crate::auth::claims::Claims;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use std::env;

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
        validation.set_required_spec_claims(&["sub", "exp"]);

        Ok(Self {
            encoding_key,
            decoding_key,
            validation,
        })
    }

    pub fn generate_token(&self, relay_id: String, public_key: String) -> Result<String, String> {
        let now = Utc::now();
        let claims = Claims {
            sub: relay_id.clone(),
            pub_key: public_key,
            exp: (now + Duration::hours(24)).timestamp() as usize,
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| format!("Failed to generate token: {e}"))
    }

    #[allow(dead_code)]
    pub fn generate_token_with_role(
        &self,
        relay_id: String,
        public_key: String,
        _role: String,
    ) -> Result<String, String> {
        let now = Utc::now();
        let claims = Claims {
            sub: relay_id.clone(),
            pub_key: public_key,
            exp: (now + Duration::hours(24)).timestamp() as usize,
        };
        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| format!("Failed to generate token: {e}"))
    }

    #[allow(dead_code)]
    pub fn validate_token(&self, token: &str) -> Result<Claims, String> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &self.validation)
            .map_err(|e| format!("Invalid token: {e}"))?;

        Ok(token_data.claims)
    }

    #[allow(dead_code)]
    pub fn get_relay_id(&self, token: &str) -> Result<String, String> {
        let claims = self.validate_token(token)?;
        Ok(claims.sub)
    }

    #[allow(dead_code)]
    pub fn is_token_valid(&self, token: &str) -> bool {
        self.validate_token(token).is_ok()
    }
}

impl Default for JwtService {
    fn default() -> Self {
        Self::new().expect("Failed to initialize JWT service")
    }
}
