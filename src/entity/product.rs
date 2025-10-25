use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, ToSchema)]
#[sea_orm(table_name = "products")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[schema(value_type = String, format = "uuid")]
    pub id: Uuid,
    pub sku: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[schema(value_type = Vec<String>, format = "uuid")]
    pub image_ids: Vec<Uuid>,
    pub price: f64,
    pub quantity_available: i32,
    pub category: String,
    pub return_policy: String,
    pub average_rating: Option<f64>, // New field for average rating
    pub review_count: i32,           // New field for review count
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::review::Entity")]
    Review,
}

impl Related<super::review::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Review.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
