use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set, QueryOrder,
};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tracing::{error, debug};
use entity::product::{self, Entity as ProductEntity, Model as ProductModel, ActiveModel as ProductActiveModel};

pub struct Product;

impl Product {
    pub async fn create(
        db: &DatabaseConnection,
        store_id: Uuid,
        sku: Option<&str>,
        name: &str,
        description: Option<&str>,
        image_id: Uuid,
        price: f64,
        quantity_available: i32,
    ) -> Result<ProductModel, String> {
        let mut product = ProductActiveModel {
            store_id: Set(store_id),
            sku: Set(sku.map(|s| s.to_owned())),
            name: Set(name.to_owned()),
            description: Set(description.map(|d| d.to_owned())),
            image_id: Set(image_id),
            price: Set(price),
            quantity_available: Set(quantity_available),
            ..Default::default()
        };
        let res = product.insert(db).await.map_err(|e| {
            error!("Failed to create product: {:?}", e);
            "Failed to create product. Please try again later.".to_string()
        })?;
        debug!("Product created: {:?}", res);
        Ok(res)
    }

    pub async fn get(db: &DatabaseConnection, id: Uuid) -> Result<ProductModel, String> {
        let product = ProductEntity::find_by_id(id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch product {}: {:?}", id, e);
                "Product not found.".to_string()
            })?
            .ok_or_else(|| "Product not found.".to_string())?;
        Ok(product)
    }

    pub async fn list_by_store(db: &DatabaseConnection, store_id: Uuid) -> Result<Vec<ProductModel>, String> {
        let products = ProductEntity::find()
            .filter(product::Column::StoreId.eq(store_id))
            .order_by_desc(product::Column::CreatedAt)
            .all(db)
            .await
            .map_err(|e| {
                error!("Failed to list products for store {}: {:?}", store_id, e);
                "Failed to list products. Please try again later.".to_string()
            })?;
        Ok(products)
    }

    pub async fn update(
        db: &DatabaseConnection,
        id: Uuid,
        sku: Option<&str>,
        name: &str,
        description: Option<&str>,
        image_id: Uuid,
        price: f64,
        quantity_available: i32,
    ) -> Result<ProductModel, String> {
        let product = ProductEntity::find_by_id(id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch product {}: {:?}", id, e);
                "Failed to update product. Please try again later.".to_string()
            })?
            .ok_or_else(|| "Product not found.".to_string())?;

        let mut active: ProductActiveModel = product.into();
        active.sku = Set(sku.map(|s| s.to_owned()));
        active.name = Set(name.to_owned());
        active.description = Set(description.map(|d| d.to_owned()));
        active.image_id = Set(image_id);
        active.price = Set(price);
        active.quantity_available = Set(quantity_available);

        let res = active.update(db).await.map_err(|e| {
            error!("Failed to update product {}: {:?}", id, e);
            "Failed to update product. Please try again later.".to_string()
        })?;
        debug!("Product updated: {:?}", res);
        Ok(res)
    }

    pub async fn delete(db: &DatabaseConnection, id: Uuid) -> Result<(), String> {
        let product = ProductEntity::find_by_id(id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch product {}: {:?}", id, e);
                "Failed to delete product. Please try again later.".to_string()
            })?
            .ok_or_else(|| "Product not found.".to_string())?;

        let mut active: ProductActiveModel = product.into();
        active.delete(db).await.map_err(|e| {
            error!("Failed to delete product {}: {:?}", id, e);
            "Failed to delete product. Please try again later.".to_string()
        })?;
        debug!("Product deleted: {}", id);
        Ok(())
    }
    pub async fn update_image_id(
        db: &DatabaseConnection,
        id: Uuid,
        image_id: Uuid,
    ) -> Result<(), String> {
        let product = ProductEntity::find_by_id(id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch product {}: {:?}", id, e);
                "Failed to update product image. Please try again later.".to_string()
            })?
            .ok_or_else(|| "Product not found.".to_string())?;

        let mut active: ProductActiveModel = product.into();
        active.image_id = Set(image_id);

        active.update(db).await.map_err(|e| {
            error!("Failed to update product image {}: {:?}", id, e);
            "Failed to update product image. Please try again later.".to_string()
        })?;
        Ok(())
    }
}