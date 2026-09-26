use crate::entity::order::{ActiveModel as OrderActiveModel, Model as OrderModel};
use crate::entity::product::{ActiveModel as ProductActiveModel, Entity as ProductEntity};
use crate::entity::store::Entity as StoreEntity;
use chrono::Utc;
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set};
use tracing::error;
use uuid::Uuid;

/// A buyer's order, which triggers a notification to the owning seller.
#[allow(dead_code)]
pub struct Order;

#[allow(dead_code)]
impl Order {
    /// Place an order for `quantity` of `product_id` and notify the seller.
    ///
    /// Resolves the product's store owner and persists a notification to that
    /// seller carrying the buyer + product details. Decrements the product's
    /// available stock. Returns the created order.
    pub async fn create(
        db: &DatabaseConnection,
        product_id: Uuid,
        buyer_device_id: &str,
        quantity: i32,
    ) -> Result<OrderModel, String> {
        if quantity < 1 {
            return Err("Quantity must be at least 1.".to_string());
        }

        // Resolve the product and validate stock.
        let product = ProductEntity::find_by_id(product_id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch product {}: {:?}", product_id, e);
                "Failed to place order. Please try again later.".to_string()
            })?
            .ok_or_else(|| "Product not found.".to_string())?;

        if product.quantity_available < quantity {
            return Err(format!(
                "Insufficient stock. Only {} available.",
                product.quantity_available
            ));
        }

        // Resolve the store owner (the seller to notify).
        let store = StoreEntity::find_by_id(product.store_id)
            .one(db)
            .await
            .map_err(|e| {
                error!("Failed to fetch store {}: {:?}", product.store_id, e);
                "Failed to place order. Please try again later.".to_string()
            })?
            .ok_or_else(|| "Store not found.".to_string())?;

        let owner_device_id = store
            .owner_device_id
            .clone()
            .ok_or_else(|| "Store owner not set.".to_string())?;

        let unit_price = product.price;
        let total = unit_price * quantity as f64;

        let order = OrderActiveModel {
            id: Set(Uuid::new_v4()),
            product_id: Set(product_id),
            store_id: Set(product.store_id),
            buyer_device_id: Set(buyer_device_id.to_owned()),
            seller_device_id: Set(owner_device_id.clone()),
            quantity: Set(quantity),
            unit_price: Set(unit_price),
            total: Set(total),
            product_name: Set(product.name.clone()),
            created_at: Set(Utc::now()),
        };

        let res = order.insert(db).await.map_err(|e| {
            error!("Failed to create order: {:?}", e);
            "Failed to place order. Please try again later.".to_string()
        })?;

        // Decrement available stock.
        let remaining = product.quantity_available - quantity;
        let product_active: ProductActiveModel = product.into();
        let mut updated_product = product_active;
        updated_product.quantity_available = Set(remaining);
        if let Err(e) = updated_product.update(db).await {
            error!(
                "Order {} created but failed to decrement stock for product {}: {:?}",
                res.id, product_id, e
            );
        }

        Ok(res)
    }
}
