-- Migration: Make product image_id nullable
-- This allows products to be created without images initially

ALTER TABLE products ALTER COLUMN image_id DROP NOT NULL;
