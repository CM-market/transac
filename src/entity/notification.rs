use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// A persisted, seller-scoped notification (e.g. "a buyer placed an order").
///
/// Notifications are keyed to a seller via `seller_device_id`, which is the
/// `relay_id` extracted from the seller's bearer JWT (equal to
/// `stores.owner_device_id` for the owning seller). The `payload` JSON carries
/// the buyer info and product details described in the ticket.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, ToSchema)]
#[sea_orm(table_name = "notifications")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[schema(value_type = String, format = "uuid")]
    pub id: Uuid,
    /// Device certificate ID of the seller receiving the notification (JWT `relay_id`).
    pub seller_device_id: String,
    /// Short title shown in the notification list header.
    pub title: String,
    /// Human-readable body including buyer + product details.
    pub message: String,
    /// Raw JSON payload (buyer info, product details, links).
    pub payload: serde_json::Value,
    /// Whether the seller has seen this notification.
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
