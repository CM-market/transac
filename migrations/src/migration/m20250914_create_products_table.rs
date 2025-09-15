use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Products::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Products::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Products::StoreId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Products::Name)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Products::Description)
                            .string()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Products::ImageId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Products::Price)
                            .double()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Products::QuantityAvailable)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Products::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned()
                    // Add foreign key constraint to stores.id
                    .foreign_key(
                        ForeignKey::create()
                            .from(Products::Table, Products::StoreId)
                            .to(super::Stores::Table, super::Stores::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    ),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Products::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Products {
    Table,
    Id,
    StoreId,
    Name,
    Description,
    ImageId,
    Price,
    QuantityAvailable,
    CreatedAt,
}