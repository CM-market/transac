use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey, TokenData, errors::Error as JwtError};
use chrono::{Utc, Duration};

const JWT_SECRET: &[u8] = b"super_secret_key_change_me"; // Replace with env/config in production

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub device_id: String,
    pub user_role: String,
    pub phone_number: Option<String>,
    pub exp: usize,
}

pub fn issue_jwt(
    device_id: &str,
    user_role: &str,
    phone_number: Option<&str>,
    expires_in_secs: i64,
) -> Result<String, JwtError> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::seconds(expires_in_secs))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        device_id: device_id.to_string(),
        user_role: user_role.to_string(),
        phone_number: phone_number.map(|s| s.to_string()),
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET),
    )
}

pub fn validate_jwt(token: &str) -> Result<TokenData<Claims>, JwtError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET),
        &Validation::default(),
    )
}