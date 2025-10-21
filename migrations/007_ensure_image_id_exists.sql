-- Migration: Ensure image_id column exists in products table
-- This migration adds the image_id column if it doesn't exist

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'image_id'
    ) THEN
        ALTER TABLE products ADD COLUMN image_id UUID;
        CREATE INDEX IF NOT EXISTS idx_products_image_id ON products(image_id);
    END IF;
END $$;