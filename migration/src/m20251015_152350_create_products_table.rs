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
                    .col(ColumnDef::new(Products::Sku).string())
                    .col(ColumnDef::new(Products::Name).string().not_null())
                    .col(ColumnDef::new(Products::Description).string())
                    .col(
                        ColumnDef::new(Products::ImageIds)
                            .array(ColumnType::Uuid)
                            .not_null(),
                    )
                    .col(ColumnDef::new(Products::Price).double().not_null())
                    .col(
                        ColumnDef::new(Products::QuantityAvailable)
                            .integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Products::Category).string().not_null())
                    .col(ColumnDef::new(Products::ReturnPolicy).string().not_null())
                    .col(ColumnDef::new(Products::AverageRating).double().default(0.0))
                    .col(ColumnDef::new(Products::ReviewCount).integer().default(0))
                    .col(
                        ColumnDef::new(Products::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Products::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Products {
    Table,
    Id,
    Sku,
    Name,
    Description,
    ImageIds,
    Price,
    QuantityAvailable,
    Category,
    ReturnPolicy,
    AverageRating,
    ReviewCount,
    CreatedAt,
}
