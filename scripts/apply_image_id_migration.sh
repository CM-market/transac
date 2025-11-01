#!/bin/bash

# Script to apply the image_id migration
# This script specifically runs the migration to ensure the image_id column exists

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

echo -e "${YELLOW}🚀 Running Image ID Migration for Transac${NC}"
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

# Check if image_id column exists
echo -e "${YELLOW}🔍 Checking if image_id column exists...${NC}"
column_exists=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'image_id'
    );
" | tr -d ' ')

if [ "$column_exists" = "t" ]; then
    echo -e "${GREEN}✅ image_id column already exists in products table${NC}"
else
    echo -e "${YELLOW}📝 Adding image_id column to products table...${NC}"
    
    # Add the image_id column
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        ALTER TABLE products ADD COLUMN image_id UUID;
        CREATE INDEX IF NOT EXISTS idx_products_image_id ON products(image_id);
    "
    
    echo -e "${GREEN}✅ Successfully added image_id column to products table${NC}"
    
    # Update schema_migrations table
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        INSERT INTO schema_migrations (version) 
        VALUES ('007_ensure_image_id_exists')
        ON CONFLICT (version) DO NOTHING;
    "
    
    echo -e "${GREEN}✅ Updated schema_migrations table${NC}"
fi

echo "=================================="
echo -e "${GREEN}✅ Migration complete!${NC}"

# Make the script executable
chmod +x "$0"