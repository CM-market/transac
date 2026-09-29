use base64::Engine;
use chrono::{Duration, Utc};
use rand::Rng;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use super::types::{PowChallenge, PowSolution};
use crate::error::AppError;

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
            .ok_or_else(|| {
                AppError::Validation(format!("Challenge not found: {}", solution.challenge_id))
            })?;

        if Utc::now() > challenge.expires_at {
            self.challenges
                .lock()
                .unwrap()
                .remove(&solution.challenge_id);
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

        self.challenges
            .lock()
            .unwrap()
            .remove(&solution.challenge_id);

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
        let mut rng = rand::rng();
        let random_bytes: Vec<u8> = (0..num_bytes).map(|_| rng.random::<u8>()).collect();
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&random_bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    /// Compute the SHA-256 hash the same way the service does, so tests can
    /// derive a valid nonce for a known challenge.
    fn compute_hash(challenge_data: &str, nonce: u64) -> String {
        let mut hasher = Sha256::new();
        hasher.update(challenge_data.as_bytes());
        hasher.update(nonce.to_le_bytes());
        let hash = hasher.finalize();
        base64::engine::general_purpose::STANDARD.encode(hash)
    }

    /// Check whether a base64 hash meets the difficulty requirement, mirroring
    /// the private `meets_difficulty` used by the service.
    fn hash_meets_difficulty(hash: &str, difficulty: u32) -> bool {
        let hash_bytes = base64::engine::general_purpose::STANDARD
            .decode(hash)
            .expect("valid base64 hash");
        let mut leading_zeros = 0usize;
        for byte in hash_bytes {
            if byte == 0 {
                leading_zeros += 8;
            } else {
                leading_zeros += byte.leading_zeros() as usize;
                break;
            }
        }
        leading_zeros >= difficulty as usize
    }

    /// Find a nonce whose hash meets the required difficulty for the challenge.
    fn find_valid_nonce(challenge_data: &str, difficulty: u32) -> u64 {
        let mut nonce = 0u64;
        loop {
            let hash = compute_hash(challenge_data, nonce);
            if hash_meets_difficulty(&hash, difficulty) {
                return nonce;
            }
            nonce += 1;
        }
    }

    /// Find a nonce whose hash does NOT meet the difficulty requirement, so the
    /// resulting solution is deterministically rejected.
    fn find_non_matching_nonce(challenge_data: &str, difficulty: u32) -> u64 {
        let mut nonce = 0u64;
        loop {
            let hash = compute_hash(challenge_data, nonce);
            if !hash_meets_difficulty(&hash, difficulty) {
                return nonce;
            }
            nonce += 1;
        }
    }

    #[test]
    fn generate_challenge_returns_unique_challenge_with_difficulty() {
        let service = PowService::new(1, 10);

        let c1 = service.generate_challenge().expect("challenge 1");
        assert!(c1.expires_at > Utc::now());
        assert!(c1.expires_at <= Utc::now() + Duration::minutes(10));
        assert_eq!(c1.difficulty, 1);
        assert!(!c1.challenge_id.is_empty());
        assert!(!c1.challenge_data.is_empty());

        let c2 = service.generate_challenge().expect("challenge 2");
        assert_ne!(c1.challenge_id, c2.challenge_id);
        assert_ne!(c1.challenge_data, c2.challenge_data);
    }

    #[test]
    fn valid_solution_is_accepted() {
        let service = PowService::new(1, 10);
        let challenge = service.generate_challenge().expect("challenge");

        let nonce = find_valid_nonce(&challenge.challenge_data, challenge.difficulty);
        let hash = compute_hash(&challenge.challenge_data, nonce);

        let solution = PowSolution {
            challenge_id: challenge.challenge_id.clone(),
            nonce,
            hash,
        };

        service.verify_solution(&solution).expect("valid solution");
    }

    #[test]
    fn invalid_nonce_is_rejected() {
        let service = PowService::new(1, 10);
        let challenge = service.generate_challenge().expect("challenge");

        // A nonce whose hash does not meet the difficulty must be rejected.
        let wrong_nonce = find_non_matching_nonce(&challenge.challenge_data, challenge.difficulty);
        let hash = compute_hash(&challenge.challenge_data, wrong_nonce);

        let solution = PowSolution {
            challenge_id: challenge.challenge_id,
            nonce: wrong_nonce,
            hash,
        };

        match service.verify_solution(&solution) {
            Err(AppError::Validation(msg)) => assert!(msg.contains("difficulty")),
            other => panic!("expected difficulty Validation error, got {other:?}"),
        }
    }

    #[test]
    fn tampered_hash_is_rejected() {
        let service = PowService::new(1, 10);
        let challenge = service.generate_challenge().expect("challenge");

        let hash = compute_hash("unrelated-data", 0);
        let solution = PowSolution {
            challenge_id: challenge.challenge_id,
            nonce: 0,
            hash,
        };

        assert!(matches!(
            service.verify_solution(&solution),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn unknown_challenge_is_rejected() {
        let service = PowService::new(1, 10);
        let hash = compute_hash("data", 0);
        let solution = PowSolution {
            challenge_id: "does-not-exist".to_string(),
            nonce: 0,
            hash,
        };

        match service.verify_solution(&solution) {
            Err(AppError::Validation(msg)) => assert!(msg.contains("Challenge not found")),
            other => panic!("expected Validation error, got {other:?}"),
        }
    }

    #[test]
    fn expired_challenge_is_rejected_and_removed() {
        let service = PowService::new(1, -1);
        let challenge = service.generate_challenge().expect("challenge");
        assert!(challenge.expires_at < Utc::now());

        let hash = compute_hash(&challenge.challenge_data, 0);
        let solution = PowSolution {
            challenge_id: challenge.challenge_id.clone(),
            nonce: 0,
            hash,
        };

        match service.verify_solution(&solution) {
            Err(AppError::Validation(msg)) => assert!(msg.contains("expired")),
            other => panic!("expected expired Validation error, got {other:?}"),
        }

        assert!(!service
            .challenges
            .lock()
            .unwrap()
            .contains_key(&challenge.challenge_id));
    }

    #[test]
    fn replayed_solution_is_rejected() {
        let service = PowService::new(1, 10);
        let challenge = service.generate_challenge().expect("challenge");

        let nonce = find_valid_nonce(&challenge.challenge_data, challenge.difficulty);
        let hash = compute_hash(&challenge.challenge_data, nonce);
        let solution = PowSolution {
            challenge_id: challenge.challenge_id.clone(),
            nonce,
            hash,
        };

        service.verify_solution(&solution).expect("first verify");

        // The challenge was consumed, so replaying the same solution must fail.
        assert!(matches!(
            service.verify_solution(&solution),
            Err(AppError::Validation(_))
        ));
    }
}
