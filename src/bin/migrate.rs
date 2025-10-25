use sea_orm::{ConnectionTrait, Database, DatabaseBackend, Statement};
use sea_orm_migration::MigratorTrait;
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use transac::config::Config;
use transac::db::create_connection;
use transac::migrator::Migrator;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Minimal logger for the migration binary
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "transac=info,sea_orm_migration=info".into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .with_line_number(true)
                .with_file(true),
        )
        .init();

    info!("Starting migration binary");

    // Load config and try to connect to the target database
    let config = Config::from_env()?;
    let conn = match create_connection(&config).await {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("{e}");
            if msg.contains("does not exist") {
                // Attempt to create the database by connecting to the 'postgres' DB
                let (admin_url, db_name) = build_admin_url_and_db_name(&config.database_url)
                    .ok_or_else(|| {
                        anyhow::anyhow!("Failed to parse DATABASE_URL for admin creation")
                    })?;
                warn!("Target database not found; attempting to create it");
                let admin_conn = Database::connect(&admin_url).await?;
                let create_db_sql = format!("CREATE DATABASE \"{db_name}\";");
                // Ignore error if it already exists (race conditions)
                let _ = admin_conn
                    .execute(Statement::from_string(
                        DatabaseBackend::Postgres,
                        create_db_sql,
                    ))
                    .await;
                // Retry connecting to the target DB
                create_connection(&config).await?
            } else {
                return Err(anyhow::anyhow!(e));
            }
        }
    };

    // Run all pending migrations
    info!("Applying migrations (up)");
    Migrator::up(&conn, None).await?;
    info!("Migrations applied successfully");

    Ok(())
}

// Very small helper to derive an admin URL pointing to the 'postgres' database
// and the final database name from the configured DATABASE_URL.
fn build_admin_url_and_db_name(db_url: &str) -> Option<(String, String)> {
    // Expect format: postgres://user:pass@host:port/dbname or postgres://host/dbname
    let idx = db_url.rfind('/')?;
    let (prefix, dbname) = db_url.split_at(idx + 1);
    if dbname.is_empty() {
        return None;
    }
    let admin_url = format!("{prefix}postgres");
    Some((admin_url, dbname.to_string()))
}
