use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// A user's editable profile (name, phone, location).
///
/// Profiles are keyed to a user via `device_id`, which is the `relay_id`
/// extracted from the user's bearer JWT.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, ToSchema)]
#[sea_orm(table_name = "profiles")]
pub struct Model {
    #[sea_orm(primary_key)]
    #[schema(value_type = String, format = "uuid")]
    pub id: Uuid,
    /// The user's device certificate ID (JWT `relay_id`). Unique: one profile per user.
    pub device_id: String,
    /// Display name shown to other users.
    pub name: String,
    /// Contact phone in Cameroon format (`237` + 9 digits) when present.
    pub phone: Option<String>,
    /// Free-text location.
    pub location: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
