pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_table;
mod m20251015_152350_create_products_table;
mod m20251015_155300_create_users_table;
mod m20251016_120155_create_reviews_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_table::Migration),
            Box::new(m20251015_152350_create_products_table::Migration),
            Box::new(m20251015_155300_create_users_table::Migration),
            Box::new(m20251016_120155_create_reviews_table::Migration),
        ]
    }
}
