-- Migration: Create enhanced stores table
-- This migration creates the stores table with all required fields for the seller workflow

CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    location VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    contact_whatsapp VARCHAR(50),
    owner_device_id VARCHAR(255), -- Device certificate ID of the owner
    is_verified BOOLEAN DEFAULT FALSE,
    rating REAL,
    total_products INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stores_owner_device_id ON stores(owner_device_id);
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores(location);
CREATE INDEX IF NOT EXISTS idx_stores_is_verified ON stores(is_verified);
CREATE INDEX IF NOT EXISTS idx_stores_created_at ON stores(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stores_updated_at 
    BEFORE UPDATE ON stores 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
