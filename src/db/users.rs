use crate::entity::user::{
    self, ActiveModel as UserActiveModel, Entity as UserEntity, Model as UserModel,
};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use tracing::{debug, error};

pub struct User;

impl User {
    pub async fn create(db: &DatabaseConnection, relay_id: &str) -> Result<UserModel, String> {
        let user = UserActiveModel {
            relay_id: Set(relay_id.to_owned()),
            ..Default::default()
        };
        let res = user.insert(db).await.map_err(|e| {
            error!("Failed to create user: {:?}", e);
            "Failed to create user. Please try again later.".to_string()
        })?;
        debug!("User created: {:?}", res);
        Ok(res)
    }

    pub async fn get_by_relay_id(
        db: &DatabaseConnection,
        relay_id: &str,
    ) -> Result<Option<UserModel>, String> {
        UserEntity::find()
            .filter(user::Column::RelayId.eq(relay_id))
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch user by relay_id: {:?}", e);
                "Failed to fetch user. Please try again later.".to_string()
            })
    }
}
