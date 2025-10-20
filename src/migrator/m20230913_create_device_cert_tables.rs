use sea_orm_migration::prelude::*;

#[allow(dead_code)]
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Revocation::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Revocation::DeviceId)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Revocation::IsRevocked)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Revocation::Table).to_owned())
            .await
    }
}

#[allow(dead_code)]
#[derive(Iden)]
enum Revocation {
    Table,
    DeviceId,
    IsRevocked,
}
