use sea_orm::{DatabaseBackend, Statement};
use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20251001_create_stores::Migration),
            Box::new(m20251002_create_products::Migration),
            Box::new(m20251003_fix_price_type::Migration),
            Box::new(m20251004_create_reviews::Migration),
            Box::new(m20251005_create_profiles::Migration),
            Box::new(m20251006_create_notifications::Migration),
            Box::new(m20251007_create_orders::Migration),
        ]
    }
}

mod m20251004_create_reviews {
    use super::*;

    pub struct Migration;

    impl MigrationName for Migration {
        fn name(&self) -> &str {
            "m20251004_create_reviews"
        }
    }

    #[async_trait::async_trait]
    impl MigrationTrait for Migration {
        async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            // Create reviews table
            manager
                .create_table(
                    Table::create()
                        .table(Reviews::Table)
                        .if_not_exists()
                        .col(ColumnDef::new(Reviews::Id).uuid().not_null().primary_key())
                        .col(ColumnDef::new(Reviews::StoreId).uuid().not_null())
                        .col(
                            ColumnDef::new(Reviews::BuyerDeviceId)
                                .string_len(255)
                                .not_null(),
                        )
                        .col(
                            ColumnDef::new(Reviews::Rating)
                                .small_integer()
                                .not_null()
                                .check(Expr::col(Reviews::Rating).between(1, 5)),
                        )
                        .col(ColumnDef::new(Reviews::Comment).text())
                        .col(
                            ColumnDef::new(Reviews::CreatedAt)
                                .timestamp_with_time_zone()
                                .not_null()
                                .default(Expr::cust("now()")),
                        )
                        .foreign_key(
                            ForeignKey::create()
                                .name("fk_reviews_store")
                                .from(Reviews::Table, Reviews::StoreId)
                                .to(Stores::Table, Stores::Id)
                                .on_delete(ForeignKeyAction::Cascade),
                        )
                        .to_owned(),
                )
                .await?;

            // Index on store_id for efficient lookups/aggregation
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_reviews_store_id")
                        .table(Reviews::Table)
                        .col(Reviews::StoreId)
                        .to_owned(),
                )
                .await?;

            Ok(())
        }

        async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            manager
                .drop_table(Table::drop().table(Reviews::Table).if_exists().to_owned())
                .await
        }
    }

    #[derive(Iden)]
    enum Stores {
        Table,
        Id,
    }

    #[derive(Iden)]
    enum Reviews {
        Table,
        Id,
        StoreId,
        BuyerDeviceId,
        Rating,
        Comment,
        CreatedAt,
    }
}

mod m20251003_fix_price_type {
    use super::*;

    pub struct Migration;

    impl MigrationName for Migration {
        fn name(&self) -> &str {
            "m20251003_fix_price_type"
        }
    }

    #[async_trait::async_trait]
    impl MigrationTrait for Migration {
        async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            let conn = manager.get_connection();
            // Alter column type to DOUBLE PRECISION to match Rust f64
            let alter_type_sql = r#"
                ALTER TABLE products
                ALTER COLUMN price TYPE DOUBLE PRECISION;
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                alter_type_sql.to_string(),
            ))
            .await?;

            // Ensure non-negative price constraint exists and is compatible
            let drop_constraint_sql = r#"
                ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_check;
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                drop_constraint_sql.to_string(),
            ))
            .await?;

            let add_constraint_sql = r#"
                ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price >= 0.0);
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                add_constraint_sql.to_string(),
            ))
            .await?;

            Ok(())
        }

        async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            // Best-effort down migration: change back to DECIMAL(15,2) and restore constraint
            let conn = manager.get_connection();

            let alter_back_sql = r#"
                    ALTER TABLE products
                    ALTER COLUMN price TYPE DECIMAL(15,2) USING price::DECIMAL(15,2);
                "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                alter_back_sql.to_string(),
            ))
            .await?;

            let drop_constraint_sql = r#"
                    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_check;
                "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                drop_constraint_sql.to_string(),
            ))
            .await?;

            let add_constraint_sql = r#"
                    ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price >= 0);
                "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                add_constraint_sql.to_string(),
            ))
            .await?;

            Ok(())
        }
    }
}

mod m20251001_create_stores {
    use super::*;

    pub struct Migration;

    impl MigrationName for Migration {
        fn name(&self) -> &str {
            "m20251001_create_stores"
        }
    }

    #[async_trait::async_trait]
    impl MigrationTrait for Migration {
        async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            // Create stores table
            manager
                .create_table(
                    Table::create()
                        .table(Stores::Table)
                        .if_not_exists()
                        .col(ColumnDef::new(Stores::Id).uuid().not_null().primary_key())
                        .col(ColumnDef::new(Stores::Name).string_len(255).not_null())
                        .col(ColumnDef::new(Stores::Description).text())
                        .col(ColumnDef::new(Stores::LogoUrl).string_len(500))
                        .col(ColumnDef::new(Stores::Location).string_len(255))
                        .col(ColumnDef::new(Stores::ContactPhone).string_len(50))
                        .col(ColumnDef::new(Stores::ContactEmail).string_len(255))
                        .col(ColumnDef::new(Stores::ContactWhatsapp).string_len(50))
                        .col(ColumnDef::new(Stores::OwnerDeviceId).string_len(255))
                        .col(
                            ColumnDef::new(Stores::IsVerified)
                                .boolean()
                                .not_null()
                                .default(false),
                        )
                        .col(ColumnDef::new(Stores::Rating).float())
                        .col(
                            ColumnDef::new(Stores::TotalProducts)
                                .integer()
                                .not_null()
                                .default(0),
                        )
                        .col(
                            ColumnDef::new(Stores::CreatedAt)
                                .timestamp_with_time_zone()
                                .not_null()
                                .default(Expr::cust("now()")),
                        )
                        .col(
                            ColumnDef::new(Stores::UpdatedAt)
                                .timestamp_with_time_zone()
                                .not_null()
                                .default(Expr::cust("now()")),
                        )
                        .to_owned(),
                )
                .await?;

            // Indexes
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_stores_owner_device_id")
                        .table(Stores::Table)
                        .col(Stores::OwnerDeviceId)
                        .to_owned(),
                )
                .await?;
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_stores_location")
                        .table(Stores::Table)
                        .col(Stores::Location)
                        .to_owned(),
                )
                .await?;
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_stores_is_verified")
                        .table(Stores::Table)
                        .col(Stores::IsVerified)
                        .to_owned(),
                )
                .await?;
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_stores_created_at")
                        .table(Stores::Table)
                        .col(Stores::CreatedAt)
                        .to_owned(),
                )
                .await?;

            // Trigger function and trigger to update updated_at on UPDATE
            let conn = manager.get_connection();
            let func_sql = r#"
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                func_sql.to_string(),
            ))
            .await?;

            let trigger_sql = r#"
                CREATE TRIGGER update_stores_updated_at
                    BEFORE UPDATE ON stores
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                trigger_sql.to_string(),
            ))
            .await?;

            Ok(())
        }

        async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            manager
                .drop_table(Table::drop().table(Stores::Table).if_exists().to_owned())
                .await
        }
    }

    #[derive(Iden)]
    enum Stores {
        Table,
        Id,
        Name,
        Description,
        LogoUrl,
        Location,
        ContactPhone,
        ContactEmail,
        ContactWhatsapp,
        OwnerDeviceId,
        IsVerified,
        Rating,
        TotalProducts,
        CreatedAt,
        UpdatedAt,
    }
}

mod m20251002_create_products {
    use super::*;

    pub struct Migration;

    impl MigrationName for Migration {
        fn name(&self) -> &str {
            "m20251002_create_products"
        }
    }

    #[async_trait::async_trait]
    impl MigrationTrait for Migration {
        async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            manager
                .create_table(
                    Table::create()
                        .table(Products::Table)
                        .if_not_exists()
                        .col(ColumnDef::new(Products::Id).uuid().not_null().primary_key())
                        .col(ColumnDef::new(Products::StoreId).uuid().not_null())
                        .col(ColumnDef::new(Products::Sku).string_len(100))
                        .col(ColumnDef::new(Products::Name).string_len(255).not_null())
                        .col(ColumnDef::new(Products::Description).text())
                        .col(ColumnDef::new(Products::ImageId).uuid()) // nullable per current model
                        .col(ColumnDef::new(Products::Price).double().not_null())
                        .col(
                            ColumnDef::new(Products::QuantityAvailable)
                                .integer()
                                .not_null()
                                .default(0),
                        )
                        .col(
                            ColumnDef::new(Products::CreatedAt)
                                .timestamp_with_time_zone()
                                .not_null()
                                .default(Expr::cust("now()")),
                        )
                        .foreign_key(
                            ForeignKey::create()
                                .name("fk_products_store")
                                .from(Products::Table, Products::StoreId)
                                .to(Stores::Table, Stores::Id)
                                .on_delete(ForeignKeyAction::Cascade),
                        )
                        .to_owned(),
                )
                .await?;

            // Indexes
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_products_store_id")
                        .table(Products::Table)
                        .col(Products::StoreId)
                        .to_owned(),
                )
                .await?;
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_products_name")
                        .table(Products::Table)
                        .col(Products::Name)
                        .to_owned(),
                )
                .await?;
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_products_price")
                        .table(Products::Table)
                        .col(Products::Price)
                        .to_owned(),
                )
                .await?;
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_products_quantity")
                        .table(Products::Table)
                        .col(Products::QuantityAvailable)
                        .to_owned(),
                )
                .await?;
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_products_created_at")
                        .table(Products::Table)
                        .col(Products::CreatedAt)
                        .to_owned(),
                )
                .await?;

            // Trigger to update store total_products on insert/delete
            let conn = manager.get_connection();
            let func_sql = r#"
                CREATE OR REPLACE FUNCTION update_store_product_count()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF TG_OP = 'INSERT' THEN
                        UPDATE stores SET total_products = total_products + 1, updated_at = NOW() WHERE id = NEW.store_id;
                        RETURN NEW;
                    ELSIF TG_OP = 'DELETE' THEN
                        UPDATE stores SET total_products = total_products - 1, updated_at = NOW() WHERE id = OLD.store_id;
                        RETURN OLD;
                    END IF;
                    RETURN NULL;
                END;
                $$ language 'plpgsql';
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                func_sql.to_string(),
            ))
            .await?;

            let trigger_sql = r#"
                CREATE TRIGGER update_store_product_count_trigger
                    AFTER INSERT OR DELETE ON products
                    FOR EACH ROW
                    EXECUTE FUNCTION update_store_product_count();
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                trigger_sql.to_string(),
            ))
            .await?;

            Ok(())
        }

        async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            manager
                .drop_table(Table::drop().table(Products::Table).if_exists().to_owned())
                .await
        }
    }

    #[derive(Iden)]
    enum Stores {
        Table,
        Id,
    }

    #[derive(Iden)]
    enum Products {
        Table,
        Id,
        StoreId,
        Sku,
        Name,
        Description,
        ImageId,
        Price,
        QuantityAvailable,
        CreatedAt,
    }
}

mod m20251005_create_profiles {
    use super::*;

    pub struct Migration;

    impl MigrationName for Migration {
        fn name(&self) -> &str {
            "m20251005_create_profiles"
        }
    }

    #[async_trait::async_trait]
    impl MigrationTrait for Migration {
        async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            // Create profiles table
            manager
                .create_table(
                    Table::create()
                        .table(Profiles::Table)
                        .if_not_exists()
                        .col(ColumnDef::new(Profiles::Id).uuid().not_null().primary_key())
                        .col(
                            ColumnDef::new(Profiles::DeviceId)
                                .string_len(255)
                                .not_null(),
                        )
                        .col(ColumnDef::new(Profiles::Name).string_len(255).not_null())
                        .col(ColumnDef::new(Profiles::Phone).string_len(32))
                        .col(ColumnDef::new(Profiles::Location).string_len(255))
                        .col(
                            ColumnDef::new(Profiles::CreatedAt)
                                .timestamp_with_time_zone()
                                .not_null()
                                .default(Expr::cust("now()")),
                        )
                        .col(
                            ColumnDef::new(Profiles::UpdatedAt)
                                .timestamp_with_time_zone()
                                .not_null()
                                .default(Expr::cust("now()")),
                        )
                        .to_owned(),
                )
                .await?;

            // Unique index on device_id: one profile per user.
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_profiles_device_id")
                        .unique()
                        .table(Profiles::Table)
                        .col(Profiles::DeviceId)
                        .to_owned(),
                )
                .await?;

            // Trigger to keep updated_at in sync on UPDATE.
            let conn = manager.get_connection();
            let func_sql = r#"
                CREATE OR REPLACE FUNCTION update_profiles_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                func_sql.to_string(),
            ))
            .await?;

            let trigger_sql = r#"
                CREATE TRIGGER update_profiles_updated_at
                    BEFORE UPDATE ON profiles
                    FOR EACH ROW
                    EXECUTE FUNCTION update_profiles_updated_at();
            "#;
            conn.execute(Statement::from_string(
                DatabaseBackend::Postgres,
                trigger_sql.to_string(),
            ))
            .await?;

            Ok(())
        }

        async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            manager
                .drop_table(Table::drop().table(Profiles::Table).if_exists().to_owned())
                .await
        }
    }

    #[derive(Iden)]
    enum Profiles {
        Table,
        Id,
        DeviceId,
        Name,
        Phone,
        Location,
        CreatedAt,
        UpdatedAt,
    }
}

mod m20251006_create_notifications {
    use super::*;

    pub struct Migration;

    impl MigrationName for Migration {
        fn name(&self) -> &str {
            "m20251006_create_notifications"
        }
    }

    #[async_trait::async_trait]
    impl MigrationTrait for Migration {
        async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            // Create notifications table
            manager
                .create_table(
                    Table::create()
                        .table(Notifications::Table)
                        .if_not_exists()
                        .col(
                            ColumnDef::new(Notifications::Id)
                                .uuid()
                                .not_null()
                                .primary_key(),
                        )
                        .col(
                            ColumnDef::new(Notifications::SellerDeviceId)
                                .string_len(255)
                                .not_null(),
                        )
                        .col(
                            ColumnDef::new(Notifications::Title)
                                .string_len(255)
                                .not_null(),
                        )
                        .col(ColumnDef::new(Notifications::Message).text().not_null())
                        .col(
                            ColumnDef::new(Notifications::Payload)
                                .json_binary()
                                .not_null(),
                        )
                        .col(
                            ColumnDef::new(Notifications::IsRead)
                                .boolean()
                                .not_null()
                                .default(false),
                        )
                        .col(
                            ColumnDef::new(Notifications::CreatedAt)
                                .timestamp_with_time_zone()
                                .not_null()
                                .default(Expr::cust("now()")),
                        )
                        .to_owned(),
                )
                .await?;

            // Index on seller_device_id for efficient per-seller lookups.
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_notifications_seller")
                        .table(Notifications::Table)
                        .col(Notifications::SellerDeviceId)
                        .to_owned(),
                )
                .await?;

            Ok(())
        }

        async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            manager
                .drop_table(
                    Table::drop()
                        .table(Notifications::Table)
                        .if_exists()
                        .to_owned(),
                )
                .await
        }
    }

    #[derive(Iden)]
    enum Notifications {
        Table,
        Id,
        SellerDeviceId,
        Title,
        Message,
        Payload,
        IsRead,
        CreatedAt,
    }
}

mod m20251007_create_orders {
    use super::*;

    pub struct Migration;

    impl MigrationName for Migration {
        fn name(&self) -> &str {
            "m20251007_create_orders"
        }
    }

    #[async_trait::async_trait]
    impl MigrationTrait for Migration {
        async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            // Create orders table
            manager
                .create_table(
                    Table::create()
                        .table(Orders::Table)
                        .if_not_exists()
                        .col(ColumnDef::new(Orders::Id).uuid().not_null().primary_key())
                        .col(ColumnDef::new(Orders::ProductId).uuid().not_null())
                        .col(ColumnDef::new(Orders::StoreId).uuid().not_null())
                        .col(
                            ColumnDef::new(Orders::BuyerDeviceId)
                                .string_len(255)
                                .not_null(),
                        )
                        .col(
                            ColumnDef::new(Orders::SellerDeviceId)
                                .string_len(255)
                                .not_null(),
                        )
                        .col(ColumnDef::new(Orders::Quantity).integer().not_null())
                        .col(
                            ColumnDef::new(Orders::UnitPrice)
                                .double()
                                .not_null()
                                .default(0.0),
                        )
                        .col(
                            ColumnDef::new(Orders::Total)
                                .double()
                                .not_null()
                                .default(0.0),
                        )
                        .col(
                            ColumnDef::new(Orders::ProductName)
                                .string_len(255)
                                .not_null(),
                        )
                        .col(
                            ColumnDef::new(Orders::CreatedAt)
                                .timestamp_with_time_zone()
                                .not_null()
                                .default(Expr::cust("now()")),
                        )
                        .foreign_key(
                            ForeignKey::create()
                                .name("fk_orders_product")
                                .from(Orders::Table, Orders::ProductId)
                                .to(Products::Table, Products::Id)
                                .on_delete(ForeignKeyAction::Cascade),
                        )
                        .foreign_key(
                            ForeignKey::create()
                                .name("fk_orders_store")
                                .from(Orders::Table, Orders::StoreId)
                                .to(Stores::Table, Stores::Id)
                                .on_delete(ForeignKeyAction::Cascade),
                        )
                        .to_owned(),
                )
                .await?;

            // Index on seller_device_id for listing a seller's orders.
            manager
                .create_index(
                    Index::create()
                        .if_not_exists()
                        .name("idx_orders_seller")
                        .table(Orders::Table)
                        .col(Orders::SellerDeviceId)
                        .to_owned(),
                )
                .await?;

            Ok(())
        }

        async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
            manager
                .drop_table(Table::drop().table(Orders::Table).if_exists().to_owned())
                .await
        }
    }

    #[derive(Iden)]
    enum Orders {
        Table,
        Id,
        ProductId,
        StoreId,
        BuyerDeviceId,
        SellerDeviceId,
        Quantity,
        UnitPrice,
        Total,
        ProductName,
        CreatedAt,
    }

    #[derive(Iden)]
    enum Products {
        Table,
        Id,
    }

    #[derive(Iden)]
    enum Stores {
        Table,
        Id,
    }
}
