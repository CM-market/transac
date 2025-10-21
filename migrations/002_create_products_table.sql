-- Migration: Create products table with store relationship
-- This migration creates the products table that references stores

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_id UUID NOT NULL, -- Reference to media storage
    price DECIMAL(15,2) NOT NULL CHECK (price >= 0),
    quantity_available INTEGER DEFAULT 0 CHECK (quantity_available >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity_available);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Create trigger to update store's total_products count
CREATE OR REPLACE FUNCTION update_store_product_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE stores 
        SET total_products = total_products + 1,
            updated_at = NOW()
        WHERE id = NEW.store_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE stores 
        SET total_products = total_products - 1,
            updated_at = NOW()
        WHERE id = OLD.store_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_store_product_count_trigger
    AFTER INSERT OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_store_product_count();
