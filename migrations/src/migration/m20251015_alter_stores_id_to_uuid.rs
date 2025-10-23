use sea_orm_migration::prelude::*;
use uuid::Uuid;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Add new UUID column
        manager
            .alter_table(
                Table::alter()
                    .table(Stores::Table)
                    .add_column(
                        ColumnDef::new(Stores::IdUuid)
                            .uuid()
                            .not_null()
                            .unique_key(),
                    )
                    .to_owned(),
            )
            .await?;

        // 2. For each store, generate a UUID and update the new column
        // (This is pseudo-SQL, actual implementation may require a custom script or raw SQL)
        // For SQLite, you may need to use a raw SQL statement or handle in application code.

        // 3. Update products.store_id to reference the new UUIDs
        // (This step is required if there is existing data. If not, skip.)

        // 4. Drop old INTEGER PK, rename new UUID column to id, and update PK
        manager
            .alter_table(
                Table::alter()
                    .table(Stores::Table)
                    .drop_column(Stores::Id)
                    .rename_column(Stores::IdUuid, Stores::Id)
                    .to_owned(),
            )
            .await?;

        // 5. Update products table foreign key to reference stores.id as UUID
        manager
            .alter_table(
                Table::alter()
                    .table(Products::Table)
                    .modify_column(
                        ColumnDef::new(Products::StoreId)
                            .uuid()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Reverse: add INTEGER id, drop UUID id, revert products.store_id to INTEGER
        manager
            .alter_table(
                Table::alter()
                    .table(Stores::Table)
                    .add_column(
                        ColumnDef::new(Stores::IdInt)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Stores::Table)
                    .drop_column(Stores::Id)
                    .rename_column(Stores::IdInt, Stores::Id)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Products::Table)
                    .modify_column(
                        ColumnDef::new(Products::StoreId)
                            .integer()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Stores {
    Table,
    Id,
    IdUuid,
    IdInt,
}

#[derive(Iden)]
enum Products {
    Table,
    StoreId,
}