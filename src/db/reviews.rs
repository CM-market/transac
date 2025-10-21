use crate::entity::review::{
    self, ActiveModel as ReviewActiveModel, Entity as ReviewEntity, Model as ReviewModel,
};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set};
use tracing::{debug, error};
use uuid::Uuid;

pub struct Review;

impl Review {
    pub async fn create(
        db: &DatabaseConnection,
        product_id: Uuid,
        user_id: Uuid,
        rating: i32,
        comment: &str,
    ) -> Result<ReviewModel, String> {
        let review = ReviewActiveModel {
            id: Set(Uuid::new_v4()),
            product_id: Set(product_id),
            user_id: Set(user_id),
            rating: Set(rating),
            comment: Set(comment.to_owned()),
            ..Default::default()
        };
        let res = review.insert(db).await.map_err(|e| {
            error!("Failed to create review: {:?}", e);
            "Failed to create review. Please try again later.".to_string()
        })?;
        debug!("Review created: {:?}", res);
        Ok(res)
    }

    pub async fn get_by_product_id(
        db: &DatabaseConnection,
        product_id: Uuid,
    ) -> Result<Vec<ReviewModel>, String> {
        ReviewEntity::find()
            .filter(review::Column::ProductId.eq(product_id))
            .all(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch reviews for product {}: {:?}", product_id, e);
                "Failed to fetch reviews. Please try again later.".to_string()
            })
    }
}