use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Reviews::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Reviews::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Reviews::ProductId).uuid().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-reviews-product_id")
                            .from(Reviews::Table, Reviews::ProductId)
                            .to(Products::Table, Products::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(ColumnDef::new(Reviews::UserId).uuid().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-reviews-user_id")
                            .from(Reviews::Table, Reviews::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .col(ColumnDef::new(Reviews::Rating).integer().not_null())
                    .col(ColumnDef::new(Reviews::Comment).text().not_null())
                    .col(
                        ColumnDef::new(Reviews::CreatedAt)
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
            .drop_table(Table::drop().table(Reviews::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Reviews {
    Table,
    Id,
    ProductId,
    UserId,
    Rating,
    Comment,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Products {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}