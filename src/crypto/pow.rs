use base64::Engine;
use chrono::{Duration, Utc};
use rand::Rng;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::error::AppError;
use super::types::{PowChallenge, PowSolution};

#[derive(Debug, Clone)]
pub struct PowService {
    challenges: Arc<Mutex<HashMap<String, PowChallenge>>>,
    default_difficulty: u32,
    challenge_lifetime: Duration,
}

impl PowService {
    pub fn new(difficulty: u32, timeout_minutes: i64) -> Self {
        Self {
            challenges: Arc::new(Mutex::new(HashMap::new())),
            default_difficulty: difficulty,
            challenge_lifetime: Duration::minutes(timeout_minutes),
        }
    }

    pub fn generate_challenge(&self) -> Result<PowChallenge, AppError> {
        let challenge_id = self.generate_secure_random_string(16);
        let challenge_data = self.generate_secure_random_string(32);
        let now = Utc::now();

        let challenge = PowChallenge {
            challenge_id: challenge_id.clone(),
            challenge_data,
            difficulty: self.default_difficulty,
            expires_at: now + self.challenge_lifetime,
            created_at: now,
        };

        self.challenges
            .lock()
            .unwrap()
            .insert(challenge_id, challenge.clone());

        Ok(challenge)
    }

    pub fn verify_solution(&self, solution: &PowSolution) -> Result<(), AppError> {
        let challenge = self
            .challenges
            .lock()
            .unwrap()
            .get(&solution.challenge_id)
            .cloned()
            .ok_or_else(|| AppError::Validation(format!("Challenge not found: {}", solution.challenge_id)))?;

        if Utc::now() > challenge.expires_at {
            self.challenges.lock().unwrap().remove(&solution.challenge_id);
            return Err(AppError::Validation("Challenge has expired".to_string()));
        }

        let computed_hash = self.compute_hash(&challenge.challenge_data, solution.nonce)?;
        if computed_hash != solution.hash {
            return Err(AppError::Validation("Invalid hash in solution".to_string()));
        }

        if !self.meets_difficulty(&computed_hash, challenge.difficulty)? {
            return Err(AppError::Validation(format!(
                "Hash does not meet difficulty requirement of {} leading zeros",
                challenge.difficulty
            )));
        }

        self.challenges.lock().unwrap().remove(&solution.challenge_id);

        Ok(())
    }

    fn compute_hash(&self, challenge_data: &str, nonce: u64) -> Result<String, AppError> {
        let mut hasher = Sha256::new();
        hasher.update(challenge_data.as_bytes());
        hasher.update(nonce.to_le_bytes());
        let hash = hasher.finalize();
        Ok(base64::engine::general_purpose::STANDARD.encode(hash))
    }

    fn meets_difficulty(&self, hash: &str, difficulty: u32) -> Result<bool, AppError> {
        let hash_bytes = base64::engine::general_purpose::STANDARD
            .decode(hash)
            .map_err(|e| AppError::Validation(format!("Invalid base64 hash: {e}")))?;

        let required_leading_zeros = difficulty as usize;
        let mut leading_zeros = 0;

        for byte in hash_bytes {
            if byte == 0 {
                leading_zeros += 8;
            } else {
                leading_zeros += byte.leading_zeros() as usize;
                break;
            }
        }

        Ok(leading_zeros >= required_leading_zeros)
    }

    fn generate_secure_random_string(&self, num_bytes: usize) -> String {
        let mut rng = rand::thread_rng();
        let random_bytes: Vec<u8> = (0..num_bytes).map(|_| rng.gen::<u8>()).collect();
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&random_bytes)
    }
}
