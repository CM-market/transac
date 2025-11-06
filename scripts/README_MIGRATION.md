# Database Migration Instructions

## Image ID Migration Fix

If you're experiencing errors related to the `image_id` column in the `products` table, you need to run the migration script to add this column to your database.

### Error Symptoms

You might see errors like:

```
column "image_id" of relation "products" does not exist
```

This happens because the database schema needs to be updated to include the `image_id` column that the application code expects.

### Running the Migration

1. Make sure you have PostgreSQL client tools installed (`psql`)

2. Run the migration script:

```bash
# If running locally with default settings
./scripts/apply_image_id_migration.sh

# If using custom database settings
DB_HOST=your_host DB_PORT=your_port DB_NAME=your_db DB_USER=your_user DB_PASSWORD=your_password ./scripts/apply_image_id_migration.sh
```

3. If you're using Docker, you can run the script inside the container:

```bash
# First, copy the script to the container
docker cp scripts/apply_image_id_migration.sh transac_postgres:/tmp/

# Then execute it inside the container
docker exec -it transac_postgres bash -c "cd /tmp && ./apply_image_id_migration.sh"
```

### Verifying the Fix

After running the migration, restart your application and try creating a product again. The error should be resolved.

## Running All Migrations

If you need to run all migrations (not just the image_id fix), use the main migration runner:

```bash
./scripts/run_migrations.sh
```

This will apply all pending migrations in the correct order.