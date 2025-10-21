-- Migration: Add image_id back to products table
-- This allows products to have associated images

ALTER TABLE products ADD COLUMN image_id UUID;
CREATE INDEX IF NOT EXISTS idx_products_image_id ON products(image_id);