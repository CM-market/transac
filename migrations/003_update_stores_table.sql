-- Migration: Update stores table to match new entity structure
-- This migration updates the stores table to include all required fields

-- First, let's make contact fields optional
ALTER TABLE stores ALTER COLUMN contact_phone DROP NOT NULL;
ALTER TABLE stores ALTER COLUMN contact_whatsapp DROP NOT NULL;

-- Add missing columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_device_id VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS rating REAL;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS total_products INTEGER DEFAULT 0;

-- Remove the store_link column if it exists (not in our entity)
ALTER TABLE stores DROP COLUMN IF EXISTS store_link;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_stores_owner_device_id ON stores(owner_device_id);
CREATE INDEX IF NOT EXISTS idx_stores_is_verified ON stores(is_verified);

-- Update existing records to have default values
UPDATE stores SET 
    is_verified = FALSE,
    total_products = 0
WHERE is_verified IS NULL OR total_products IS NULL;
