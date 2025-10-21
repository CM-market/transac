-- Migration: Fix products table schema to match arc42.md specification
-- Remove the image_id column that shouldn't exist according to the docs

ALTER TABLE products DROP COLUMN IF EXISTS image_id;
