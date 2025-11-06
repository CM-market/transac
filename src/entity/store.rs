use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;


#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, ToSchema)]
#[sea_orm(table_name = "stores")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    #[sea_orm(nullable)]
    pub description: Option<String>,
    #[sea_orm(nullable)]
    pub location: Option<String>,
    #[sea_orm(nullable)]
    pub contact_phone: Option<String>,
    pub is_verified: bool,
    #[sea_orm(nullable)]
    pub user_id: Uuid,
    pub created_at: ChronoDateTime,
    pub updated_at: ChronoDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::entity::user::Entity",
        from = "Column::UserId",
        to = "crate::entity::user::Column::Id"
    )]
    User,
}

impl Related<crate::entity::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}