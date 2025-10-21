use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, ToSchema)]
#[sea_orm(table_name = "stores")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[schema(value_type = String, format = "uuid")]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub logo_url: Option<String>,
    pub location: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub contact_whatsapp: Option<String>,
    #[schema(value_type = String, format = "uuid")]
    pub owner_device_id: Option<String>, // Device certificate ID of the owner
    pub is_verified: bool,
    pub rating: Option<f32>,
    pub total_products: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "crate::entity::product::Entity")]
    Products,
}

impl Related<crate::entity::product::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Products.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
