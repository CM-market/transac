use crate::entity::store::{
    self, ActiveModel as StoreActiveModel, Entity as StoreEntity, Model as StoreModel,
};
use sea_orm::{
    ActiveModelTrait, DatabaseConnection, EntityTrait, QueryOrder, Set,
};
use tracing::{debug, error};
use uuid::Uuid;

#[allow(dead_code)]
pub struct Store;

#[allow(dead_code)]
impl Store {

    pub async fn create(
        db: &DatabaseConnection,
        name: &str,
        description: Option<&str>,
    ) -> Result<StoreModel, String> {
        let store = StoreActiveModel {
            name: Set(name.to_owned()),
            description: Set(description.map(|d| d.to_owned())),
            ..Default::default()
        };
        let res = store.insert(db).await.map_err(|e| {
            error!("Failed to create store: {:?}", e);
            "Failed to create store. Please try again later.".to_string()
        })?;
        debug!("Store created: {:?}", res);
        Ok(res)
    }

    pub async fn get(db: &DatabaseConnection, id: Uuid) -> Result<StoreModel, String> {
        let store = StoreEntity::find_by_id(id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch store {}: {:?}", id, e);
                "Store not found.".to_string()
            })?
            .ok_or_else(|| "Store not found.".to_string())?;
        Ok(store)
    }

    pub async fn list(db: &DatabaseConnection) -> Result<Vec<StoreModel>, String> {
        let stores = StoreEntity::find()
            .order_by_desc(store::Column::CreatedAt)
            .all(db)
            .await
            .map_err(|e| {
                error!("Failed to list stores: {:?}", e);
                "Failed to list stores. Please try again later.".to_string()
            })?;
        Ok(stores)
    }

    pub async fn update(
        db: &DatabaseConnection,
        id: Uuid,
        name: &str,
        description: Option<&str>,
    ) -> Result<StoreModel, String> {
        let store = StoreEntity::find_by_id(id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch store {}: {:?}", id, e);
                "Failed to update store. Please try again later.".to_string()
            })?
            .ok_or_else(|| "Store not found.".to_string())?;

        let mut active: StoreActiveModel = store.into();
        active.name = Set(name.to_owned());
        active.description = Set(description.map(|d| d.to_owned()));

        let res = active.update(db).await.map_err(|e| {
            error!("Failed to update store {}: {:?}", id, e);
            "Failed to update store. Please try again later.".to_string()
        })?;
        debug!("Store updated: {:?}", res);
        Ok(res)
    }

    pub async fn delete(db: &DatabaseConnection, id: Uuid) -> Result<(), String> {
        let store = StoreEntity::find_by_id(id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch store {}: {:?}", id, e);
                "Failed to delete store. Please try again later.".to_string()
            })?
            .ok_or_else(|| "Store not found.".to_string())?;

        let active: StoreActiveModel = store.into();
        active.delete(db).await.map_err(|e| {
            error!("Failed to delete store {}: {:?}", id, e);
            "Failed to delete store. Please try again later.".to_string()
        })?;
        debug!("Store deleted: {}", id);
        Ok(())
    }
}
