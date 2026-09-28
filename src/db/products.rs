use crate::entity::product::{
    self, ActiveModel as ProductActiveModel, Entity as ProductEntity, Model as ProductModel,
};
use crate::entity::store::{self as store_entity, Entity as StoreEntity};
use sea_orm::sea_query::extension::postgres::PgExpr;
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};
use tracing::{debug, error};
use uuid::Uuid;

pub struct Product;

/// Optional filters for server-side product search.
#[derive(Debug, Default, Clone)]
pub struct ProductSearch {
    /// Case-insensitive keyword matched against name and description.
    pub q: Option<String>,
    pub category: Option<String>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    /// Matches the owning store's location (case-insensitive partial match).
    pub location: Option<String>,
}

/// Paginated search result envelope.
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub items: Vec<ProductModel>,
    pub total: u64,
    pub page: u64,
    pub page_size: u64,
    pub total_pages: u64,
}

#[allow(clippy::too_many_arguments)]
impl Product {
    pub async fn create(
        db: &DatabaseConnection,
        store_id: Uuid,
        sku: Option<&str>,
        name: &str,
        description: Option<&str>,
        category: Option<&str>,
        price: f64,
        quantity_available: i32,
        image_id: Option<Uuid>,
    ) -> Result<ProductModel, String> {
        debug!(
            "Creating product with: store_id={}, name={}",
            store_id, name
        );

        let product = ProductActiveModel {
            id: Set(Uuid::new_v4()),
            store_id: Set(store_id),
            sku: Set(sku.map(|s| s.to_owned())),
            name: Set(name.to_owned()),
            description: Set(description.map(|d| d.to_owned())),
            category: Set(category.map(|c| c.to_owned())),
            price: Set(price),
            quantity_available: Set(quantity_available),
            image_id: Set(image_id),
            ..Default::default()
        };

        debug!("Product ActiveModel created: {:?}", product);
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

    pub async fn list_by_store(
        db: &DatabaseConnection,
        store_id: Uuid,
    ) -> Result<Vec<ProductModel>, String> {
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

    /// List all products (no store filter), newest first
    #[allow(dead_code)]
    pub async fn list_all(db: &DatabaseConnection) -> Result<Vec<ProductModel>, String> {
        let products = ProductEntity::find()
            .order_by_desc(product::Column::CreatedAt)
            .all(db)
            .await
            .map_err(|e| {
                error!("Failed to list products: {:?}", e);
                "Failed to list products. Please try again later.".to_string()
            })?;
        Ok(products)
    }

    /// Server-side filtered, keyword-searchable, paginated product listing.
    /// Filters are applied at the database level for performance on large datasets.
    pub async fn search(
        db: &DatabaseConnection,
        filters: &ProductSearch,
        page: u64,
        page_size: u64,
    ) -> Result<SearchResult, String> {
        let mut query = ProductEntity::find()
            .inner_join(StoreEntity)
            .order_by_desc(product::Column::CreatedAt);

        if let Some(q) = filters
            .q
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
        {
            let pattern = format!("%{}%", q.to_lowercase());
            query = query.filter(
                Expr::col(product::Column::Name)
                    .ilike(&pattern)
                    .or(Expr::col(product::Column::Description).ilike(&pattern)),
            );
        }
        if let Some(category) = filters
            .category
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
        {
            query = query.filter(product::Column::Category.eq(category));
        }
        if let Some(min_price) = filters.min_price {
            if min_price >= 0.0 {
                query = query.filter(product::Column::Price.gte(min_price));
            }
        }
        if let Some(max_price) = filters.max_price {
            if max_price >= 0.0 {
                query = query.filter(product::Column::Price.lte(max_price));
            }
        }
        if let Some(location) = filters
            .location
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
        {
            let pattern = format!("%{}%", location.to_lowercase());
            query = query.filter(Expr::col(store_entity::Column::Location).ilike(&pattern));
        }

        let paginator = query.paginate(db, page_size);
        let total = paginator.num_items().await.map_err(|e| {
            error!("Failed to count products: {:?}", e);
            "Failed to search products. Please try again later.".to_string()
        })?;
        let items: Vec<ProductModel> = paginator.fetch_page(page).await.map_err(|e| {
            error!("Failed to fetch products page: {:?}", e);
            "Failed to search products. Please try again later.".to_string()
        })?;
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(page_size)
        };

        Ok(SearchResult {
            items,
            total,
            page,
            page_size,
            total_pages,
        })
    }

    pub async fn update(
        db: &DatabaseConnection,
        id: Uuid,
        sku: Option<&str>,
        name: &str,
        description: Option<&str>,
        category: Option<&str>,
        price: f64,
        quantity_available: i32,
        image_id: Option<Uuid>,
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
        active.category = Set(category.map(|c| c.to_owned()));
        active.price = Set(price);
        active.quantity_available = Set(quantity_available);
        active.image_id = Set(image_id);

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

    pub async fn update_image(
        db: &DatabaseConnection,
        id: Uuid,
        image_id: Option<Uuid>,
    ) -> Result<ProductModel, String> {
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

        let res = active.update(db).await.map_err(|e| {
            error!("Failed to update product image {}: {:?}", id, e);
            "Failed to update product image. Please try again later.".to_string()
        })?;
        debug!("Product image updated: {:?}", res);
        Ok(res)
    }
}
