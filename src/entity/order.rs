use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// A buyer's order for a product, and the trigger for notifying the seller.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, ToSchema)]
#[sea_orm(table_name = "orders")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[schema(value_type = String, format = "uuid")]
    pub id: Uuid,
    /// Product being ordered.
    #[schema(value_type = String, format = "uuid")]
    pub product_id: Uuid,
    /// Store owning the product.
    #[schema(value_type = String, format = "uuid")]
    pub store_id: Uuid,
    /// Device certificate ID of the buyer placing the order (JWT `relay_id`).
    pub buyer_device_id: String,
    /// Device certificate ID of the store owner (seller) receiving it.
    pub seller_device_id: String,
    /// Number of units ordered.
    pub quantity: i32,
    /// Unit price at the time of ordering.
    pub unit_price: f64,
    /// Total = quantity * unit_price.
    pub total: f64,
    /// Denormalized product name captured at order time.
    pub product_name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
