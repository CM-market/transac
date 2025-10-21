#!/bin/bash

# Database migration runner for Transac
# This script runs all SQL migrations in order

set -e

# Database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-transac_db}
DB_USER=${DB_USER:-user}
DB_PASSWORD=${DB_PASSWORD:-password}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Running Transac Database Migrations${NC}"
echo "=================================="

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql is not installed or not in PATH${NC}"
    exit 1
fi

# Test database connection
echo -e "${YELLOW}📡 Testing database connection...${NC}"
export PGPASSWORD=$DB_PASSWORD
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to database${NC}"
    echo "Connection details:"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Create migrations table if it doesn't exist
echo -e "${YELLOW}📋 Creating migrations tracking table...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
" > /dev/null

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}❌ Error: Migrations directory not found at $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Run migrations in order
echo -e "${YELLOW}🔄 Running migrations...${NC}"
migration_count=0

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        filename=$(basename "$migration_file")
        migration_name="${filename%.*}"
        
        # Check if migration has already been applied
        already_applied=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$migration_name';" | tr -d ' ')
        
        if [ "$already_applied" = "0" ]; then
            echo -e "${YELLOW}  📄 Applying migration: $filename${NC}"
            
            # Run the migration
            if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration_file" > /dev/null 2>&1; then
                # Record successful migration
                psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "INSERT INTO schema_migrations (version) VALUES ('$migration_name');" > /dev/null
                echo -e "${GREEN}  ✅ Successfully applied: $filename${NC}"
                ((migration_count++))
            else
                echo -e "${RED}  ❌ Failed to apply: $filename${NC}"
                exit 1
            fi
        else
            echo -e "${GREEN}  ⏭️  Already applied: $filename${NC}"
        fi
    fi
done

echo "=================================="
if [ $migration_count -eq 0 ]; then
    echo -e "${GREEN}✅ All migrations are up to date!${NC}"
else
    echo -e "${GREEN}✅ Successfully applied $migration_count new migration(s)!${NC}"
fi

echo -e "${YELLOW}📊 Current database schema version:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at;"
