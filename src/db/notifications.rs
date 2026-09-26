use crate::entity::notification::{
    self, ActiveModel as NotificationActiveModel, Entity as NotificationEntity,
    Model as NotificationModel,
};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};
use tracing::{debug, error};
use uuid::Uuid;

/// Persisted notifications service.
#[allow(dead_code)]
pub struct Notification;

#[allow(dead_code)]
impl Notification {
    /// Insert a new notification for a seller.
    pub async fn create(
        db: &DatabaseConnection,
        seller_device_id: &str,
        title: &str,
        message: &str,
        payload: serde_json::Value,
    ) -> Result<NotificationModel, String> {
        let notification = NotificationActiveModel {
            id: Set(Uuid::new_v4()),
            seller_device_id: Set(seller_device_id.to_owned()),
            title: Set(title.to_owned()),
            message: Set(message.to_owned()),
            payload: Set(payload),
            is_read: Set(false),
            created_at: Set(Utc::now()),
        };

        let res = notification.insert(db).await.map_err(|e| {
            error!(
                "Failed to create notification for seller {}: {:?}",
                seller_device_id, e
            );
            "Failed to create notification. Please try again later.".to_string()
        })?;

        debug!(
            "Created notification {} for seller {}",
            res.id, seller_device_id
        );
        Ok(res)
    }

    /// List notifications for a seller, newest first.
    pub async fn list_for_seller(
        db: &DatabaseConnection,
        seller_device_id: &str,
    ) -> Result<Vec<NotificationModel>, String> {
        let notifications = NotificationEntity::find()
            .filter(notification::Column::SellerDeviceId.eq(seller_device_id))
            .order_by_desc(notification::Column::CreatedAt)
            .all(db)
            .await
            .map_err(|e| {
                error!(
                    "Failed to list notifications for seller {}: {:?}",
                    seller_device_id, e
                );
                "Failed to list notifications. Please try again later.".to_string()
            })?;
        Ok(notifications)
    }

    /// Mark a single notification as read, scoped to the owning seller.
    ///
    /// Returns `false` when the notification does not belong to this seller.
    pub async fn mark_read(
        db: &DatabaseConnection,
        seller_device_id: &str,
        id: Uuid,
    ) -> Result<bool, String> {
        let result = NotificationEntity::update_many()
            .col_expr(
                notification::Column::IsRead,
                sea_orm::Value::Bool(Some(true)).into(),
            )
            .filter(notification::Column::Id.eq(id))
            .filter(notification::Column::SellerDeviceId.eq(seller_device_id))
            .exec(db)
            .await
            .map_err(|e| {
                error!(
                    "Failed to mark notification {} read for seller {}: {:?}",
                    id, seller_device_id, e
                );
                "Failed to update notification. Please try again later.".to_string()
            })?;

        Ok(result.rows_affected > 0)
    }

    /// Mark all notifications for a seller as read.
    pub async fn mark_all_read(
        db: &DatabaseConnection,
        seller_device_id: &str,
    ) -> Result<u64, String> {
        let result = NotificationEntity::update_many()
            .col_expr(
                notification::Column::IsRead,
                sea_orm::Value::Bool(Some(true)).into(),
            )
            .filter(notification::Column::SellerDeviceId.eq(seller_device_id))
            .filter(notification::Column::IsRead.eq(false))
            .exec(db)
            .await
            .map_err(|e| {
                error!(
                    "Failed to mark all notifications read for seller {}: {:?}",
                    seller_device_id, e
                );
                "Failed to update notifications. Please try again later.".to_string()
            })?;

        Ok(result.rows_affected)
    }

    /// Count unread notifications for a seller.
    pub async fn unread_count(
        db: &DatabaseConnection,
        seller_device_id: &str,
    ) -> Result<u64, String> {
        let count = NotificationEntity::find()
            .filter(notification::Column::SellerDeviceId.eq(seller_device_id))
            .filter(notification::Column::IsRead.eq(false))
            .count(db)
            .await
            .map_err(|e| {
                error!(
                    "Failed to count unread notifications for seller {}: {:?}",
                    seller_device_id, e
                );
                "Failed to count notifications. Please try again later.".to_string()
            })?;
        Ok(count)
    }
}
