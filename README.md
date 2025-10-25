# Transac

## Overview
Transac is a marketplace platform with buyer and seller functionality.

## Getting Started
See the documentation in the `docs` folder for detailed information about the project.

## Database Migrations
If you encounter database-related errors, you may need to run migrations:

- For issues with the `image_id` column in the `products` table, see [Migration Instructions](scripts/README_MIGRATION.md)
- For general migration information, run `./scripts/run_migrations.sh`

## Development
- Backend: Rust with Axum framework
- Frontend: TypeScript
- Database: PostgreSQL
- Storage: MinIO (S3-compatible)
