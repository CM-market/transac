use crate::entity::review::{
    self, ActiveModel as ReviewActiveModel, Entity as ReviewEntity, Model as ReviewModel,
};
use crate::entity::store::{self, ActiveModel as StoreActiveModel};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder,
    QuerySelect, Set,
};
use tracing::{debug, error};
use uuid::Uuid;

/// Maximum valid rating value.
pub const MAX_RATING: i16 = 5;
/// Minimum valid rating value.
pub const MIN_RATING: i16 = 1;

#[allow(dead_code)]
pub struct Review;

#[allow(dead_code)]
impl Review {
    /// Insert a new review for a store and recompute the store's aggregate rating.
    pub async fn create(
        db: &DatabaseConnection,
        store_id: Uuid,
        buyer_device_id: &str,
        rating: i16,
        comment: Option<&str>,
    ) -> Result<ReviewModel, String> {
        if !(MIN_RATING..=MAX_RATING).contains(&rating) {
            return Err(format!(
                "Rating must be between {MIN_RATING} and {MAX_RATING}."
            ));
        }

        let review = ReviewActiveModel {
            id: Set(Uuid::new_v4()),
            store_id: Set(store_id),
            buyer_device_id: Set(buyer_device_id.to_owned()),
            rating: Set(rating),
            comment: Set(comment.map(|c| c.to_owned())),
            created_at: Set(Utc::now()),
        };

        let res = review.insert(db).await.map_err(|e| {
            error!("Failed to create review: {:?}", e);
            "Failed to submit review. Please try again later.".to_string()
        })?;

        // Keep the store's aggregate rating in sync.
        if let Err(e) = Self::recompute_store_rating(db, store_id).await {
            error!(
                "Review created but failed to update store {} rating: {}",
                store_id, e
            );
        }

        debug!("Review created for store {}: {:?}", store_id, res);
        Ok(res)
    }

    /// List reviews for a store, newest first.
    pub async fn list_by_store(
        db: &DatabaseConnection,
        store_id: Uuid,
    ) -> Result<Vec<ReviewModel>, String> {
        let reviews = ReviewEntity::find()
            .filter(review::Column::StoreId.eq(store_id))
            .order_by_desc(review::Column::CreatedAt)
            .all(db)
            .await
            .map_err(|e| {
                error!("Failed to list reviews for store {}: {:?}", store_id, e);
                "Failed to list reviews. Please try again later.".to_string()
            })?;
        Ok(reviews)
    }

    /// Compute the weighted average rating for a store from all of its reviews
    /// and persist it onto `stores.rating`.
    ///
    /// Each review contributes equal weight (1), so the aggregate is the arithmetic
    /// mean of all ratings, rounded to 2 decimal places. If a store has no reviews
    /// the rating is left unchanged (no-op).
    pub async fn recompute_store_rating(
        db: &DatabaseConnection,
        store_id: Uuid,
    ) -> Result<(), String> {
        // Fetch all ratings for the store.
        let ratings: Vec<i16> = ReviewEntity::find()
            .filter(review::Column::StoreId.eq(store_id))
            .select_only()
            .column(review::Column::Rating)
            .into_tuple::<i16>()
            .all(db)
            .await
            .map_err(|e| {
                error!(
                    "Failed to aggregate ratings for store {}: {:?}",
                    store_id, e
                );
                "Failed to update store rating. Please try again later.".to_string()
            })?;

        let Some(rounded) = weighted_average(&ratings) else {
            debug!("No reviews for store {store_id}, leaving rating unchanged.");
            return Ok(());
        };

        let store = store::Entity::find_by_id(store_id)
            .one(db)
            .await
            .map_err(|e| {
                error!(
                    "Failed to fetch store {} for rating update: {:?}",
                    store_id, e
                );
                "Failed to update store rating. Please try again later.".to_string()
            })?
            .ok_or_else(|| "Store not found.".to_string())?;

        let store: StoreActiveModel = store.into();
        let mut updated = store;
        updated.rating = Set(Some(rounded));

        updated.update(db).await.map_err(|e| {
            error!("Failed to persist rating for store {}: {:?}", store_id, e);
            "Failed to update store rating. Please try again later.".to_string()
        })?;

        debug!(
            "Recomputed rating for store {store_id}: {rounded} over {} reviews",
            ratings.len()
        );
        Ok(())
    }
}

/// Compute the weighted average of a set of ratings, rounded to 2 decimal places.
///
/// Every rating has equal weight (1), so this is the arithmetic mean. Returns
/// `None` when there are no ratings.
fn weighted_average(ratings: &[i16]) -> Option<f32> {
    if ratings.is_empty() {
        return None;
    }
    let sum: i64 = ratings.iter().map(|r| *r as i64).sum();
    let mean = sum as f64 / ratings.len() as f64;
    Some(((mean * 100.0).round() / 100.0) as f32)
}

#[cfg(test)]
mod tests {
    use super::weighted_average;

    #[test]
    fn weighted_average_empty_returns_none() {
        assert_eq!(weighted_average(&[]), None);
    }

    #[test]
    fn weighted_average_single_rating() {
        assert_eq!(weighted_average(&[5]), Some(5.0));
        assert_eq!(weighted_average(&[1]), Some(1.0));
    }

    #[test]
    fn weighted_average_rounds_to_two_decimals() {
        // (4 + 5) / 2 = 4.5
        assert_eq!(weighted_average(&[4, 5]), Some(4.5));
        // (1 + 2 + 3) / 3 = 2.0
        assert_eq!(weighted_average(&[1, 2, 3]), Some(2.0));
        // (4 + 4 + 5) / 3 = 4.33333... -> 4.33
        assert_eq!(weighted_average(&[4, 4, 5]), Some(4.33));
    }

    #[test]
    fn weighted_average_all_equal() {
        assert_eq!(weighted_average(&[3, 3, 3, 3]), Some(3.0));
    }
}
