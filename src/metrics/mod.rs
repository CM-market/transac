//! Metrics module.
//!
//! This module tracks system-level metrics. Currently it provides a rolling-window
//! counter of **active users** — distinct authenticated users (identified by their
//! JWT `relay_id`) that have made a request within recent windows of time.

use axum::{extract::State, response::IntoResponse, routing::get, Json, Router};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use utoipa::ToSchema;

/// Default window (in seconds) that defines a user as "currently active".
pub const CURRENT_WINDOW_SECS: u64 = 5 * 60; // 5 minutes

/// Default window (in seconds) that defines a user as "active within the last day".
pub const LAST_24H_WINDOW_SECS: u64 = 24 * 60 * 60; // 24 hours

/// Tracks the most recent activity timestamp for each known user key.
///
/// The tracker is intentionally allocation-light and in-process. It does not
/// survive restarts, which is acceptable for a live "active users" gauge. Stale
/// entries are pruned lazily on every read/mutation so the map does not grow
/// without bound.
#[derive(Debug)]
pub struct ActiveUsersTracker {
    activity: Mutex<HashMap<String, Instant>>,
}

impl ActiveUsersTracker {
    /// Create a new, empty tracker.
    pub fn new() -> Self {
        Self {
            activity: Mutex::new(HashMap::new()),
        }
    }

    /// Record an activity heartbeat for the given user key at the current time.
    pub fn record(&self, user_key: impl Into<String>) {
        let now = Instant::now();
        let mut map = match self.activity.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        map.insert(user_key.into(), now);
    }

    /// Number of distinct users active within `window`.
    ///
    /// Stale entries (older than `window`) are pruned lazily here, so the map
    /// never grows without bound for a fixed interrogation window.
    pub fn active_within(&self, window: Duration) -> usize {
        let now = Instant::now();
        let mut map = match self.activity.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        map.retain(|_, last_seen| now.duration_since(*last_seen) <= window);
        map.len()
    }

    /// Number of distinct users currently active (within [`CURRENT_WINDOW_SECS`]).
    pub fn active_current(&self) -> usize {
        self.active_within(Duration::from_secs(CURRENT_WINDOW_SECS))
    }

    /// Number of distinct users active within the last 24 hours.
    pub fn active_last_24h(&self) -> usize {
        self.active_within(Duration::from_secs(LAST_24H_WINDOW_SECS))
    }
}

impl Default for ActiveUsersTracker {
    fn default() -> Self {
        Self::new()
    }
}

/// Snapshot of active-user counts returned by the metrics endpoint.
#[derive(Debug, Serialize, ToSchema)]
pub struct ActiveUsersResponse {
    /// Distinct users that have made an authenticated request within the last
    /// [`CURRENT_WINDOW_SECS`] seconds.
    pub active_users_current: usize,
    /// Distinct users that have made an authenticated request within the last
    /// [`LAST_24H_WINDOW_SECS`] seconds.
    pub active_users_last_24h: usize,
}

/// HTTP handler for `GET /api/v1/metrics/active-users`.
#[utoipa::path(
    get,
    path = "/api/v1/metrics/active-users",
    responses(
        (status = 200, description = "Active user counts", body = ActiveUsersResponse)
    ),
    tag = "Metrics"
)]
pub async fn get_active_users(State(tracker): State<Arc<ActiveUsersTracker>>) -> impl IntoResponse {
    Json(ActiveUsersResponse {
        active_users_current: tracker.active_current(),
        active_users_last_24h: tracker.active_last_24h(),
    })
}

/// Build the metrics router with the shared active-user tracker as its state.
pub fn router(tracker: Arc<ActiveUsersTracker>) -> Router<()> {
    Router::new()
        .route("/api/v1/metrics/active-users", get(get_active_users))
        .with_state(tracker)
}

/// Extract an authenticated subject (`relay_id`) from a request's authorization
/// header, returning `None` when the token is missing or invalid.
///
/// This is the shared helper used by the request-recording middleware in
/// `main.rs`. It is `pub` (rather than `pub(crate)`) because `main.rs` and
/// `lib.rs` are compiled as independent crates that share this source file.
pub fn extract_valid_relay_id(headers: &axum::http::HeaderMap) -> Option<String> {
    let token = headers
        .get("Authorization")?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")?;

    let jwt = crate::auth::JwtService::new().ok()?;
    jwt.validate_token(token).ok().map(|claims| claims.relay_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starts_empty() {
        let tracker = ActiveUsersTracker::new();
        assert_eq!(tracker.active_current(), 0);
        assert_eq!(tracker.active_last_24h(), 0);
    }

    #[test]
    fn records_a_single_user() {
        let tracker = ActiveUsersTracker::new();
        tracker.record("user-a");
        assert_eq!(tracker.active_current(), 1);
        assert_eq!(tracker.active_last_24h(), 1);
    }

    #[test]
    fn counts_distinct_users() {
        let tracker = ActiveUsersTracker::new();
        tracker.record("user-a");
        tracker.record("user-b");
        tracker.record("user-c");
        assert_eq!(tracker.active_current(), 3);
    }

    #[test]
    fn deduplicates_repeated_activity_from_same_user() {
        let tracker = ActiveUsersTracker::new();
        tracker.record("user-a");
        tracker.record("user-a");
        tracker.record("user-a");
        assert_eq!(tracker.active_current(), 1);
    }

    #[test]
    fn prunes_stale_users_lazily() {
        let tracker = ActiveUsersTracker::new();
        tracker.record("fresh-user");

        // Simulate a user whose last activity is older than the 24h window by
        // writing an old timestamp directly into the tracker's internals.
        {
            let mut map = tracker.activity.lock().unwrap();
            map.insert(
                "stale-user".to_string(),
                Instant::now() - Duration::from_secs(LAST_24H_WINDOW_SECS + 1),
            );
        }

        // The stale user is pruned and must not be counted in the 24h window.
        assert_eq!(tracker.active_last_24h(), 1);
        assert_eq!(tracker.active_current(), 1);
    }

    #[test]
    fn default_tracker_is_empty() {
        // Exercise the Default impl.
        let tracker: ActiveUsersTracker = Default::default();
        assert_eq!(tracker.active_current(), 0);
    }
}
