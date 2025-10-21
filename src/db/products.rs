use crate::entity::product::{
    self, ActiveModel as ProductActiveModel, Entity as ProductEntity, Model as ProductModel,
};
use sea_orm::{
    ActiveModelTrait, DatabaseConnection, EntityTrait, QueryOrder, Set,
};
use tracing::{debug, error};
use uuid::Uuid;

pub struct Product;

#[allow(clippy::too_many_arguments)]
impl Product {
    pub async fn create(
        db: &DatabaseConnection,
        sku: Option<&str>,
        name: &str,
        description: Option<&str>,
        image_ids: Vec<Uuid>,
        price: f64,
        quantity_available: i32,
        category: &str,
        return_policy: &str,
    ) -> Result<ProductModel, String> {
        let product = ProductActiveModel {
            sku: Set(sku.map(|s| s.to_owned())),
            name: Set(name.to_owned()),
            description: Set(description.map(|d| d.to_owned())),
            image_ids: Set(image_ids),
            price: Set(price),
            quantity_available: Set(quantity_available),
            category: Set(category.to_owned()),
            return_policy: Set(return_policy.to_owned()),
            average_rating: Set(Some(0.0)), // Initialize with 0.0
            review_count: Set(0),          // Initialize with 0
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


    pub async fn list_all(db: &DatabaseConnection) -> Result<Vec<ProductModel>, String> {
        let products = ProductEntity::find()
            .order_by_desc(product::Column::CreatedAt)
            .all(db)
            .await
            .map_err(|e| {
                error!("Failed to list all products: {:?}", e);
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
        image_ids: Vec<Uuid>,
        price: f64,
        quantity_available: i32,
        category: &str,
        return_policy: &str,
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
        active.image_ids = Set(image_ids);
        active.price = Set(price);
        active.quantity_available = Set(quantity_available);
        active.category = Set(category.to_owned());
        active.return_policy = Set(return_policy.to_owned());
        // average_rating and review_count are updated by review creation, not directly here

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

        let active: ProductActiveModel = product.into();
        active.delete(db).await.map_err(|e| {
            error!("Failed to delete product {}: {:?}", id, e);
            "Failed to delete product. Please try again later.".to_string()
        })?;
        debug!("Product deleted: {}", id);
        Ok(())
    }
    pub async fn update_image_ids(
        db: &DatabaseConnection,
        id: Uuid,
        image_ids: Vec<Uuid>,
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
        active.image_ids = Set(image_ids);

        active.update(db).await.map_err(|e| {
            error!("Failed to update product image {}: {:?}", id, e);
            "Failed to update product image. Please try again later.".to_string()
        })?;
        Ok(())
    }
}

impl Product {
    pub async fn update_rating_and_review_count(
        db: &DatabaseConnection,
        product_id: Uuid,
    ) -> Result<(), String> {
        let reviews = crate::db::reviews::Review::get_by_product_id(db, product_id).await?;

        let total_rating: i32 = reviews.iter().map(|r| r.rating).sum();
        let review_count = reviews.len() as i32;
        let average_rating = if review_count > 0 {
            Some(total_rating as f64 / review_count as f64)
        } else {
            None
        };

        let product = ProductEntity::find_by_id(product_id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch product {}: {:?}", product_id, e);
                "Failed to update product rating and review count. Please try again later."
                    .to_string()
            })?
            .ok_or_else(|| "Product not found.".to_string())?;

        let mut active: ProductActiveModel = product.into();
        active.average_rating = Set(average_rating);
        active.review_count = Set(review_count);

        active.update(db).await.map_err(|e| {
            error!(
                "Failed to update product rating and review count {}: {:?}",
                product_id, e
            );
            "Failed to update product rating and review count. Please try again later."
                .to_string()
        })?;
        Ok(())
    }
}
