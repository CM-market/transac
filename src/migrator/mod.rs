use sea_orm_migration::prelude::*;
mod m20230913_create_device_cert_tables;

#[derive(DeriveMigrationName)]
pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20230913_create_device_cert_tables::Migration),
        ]
    }
}