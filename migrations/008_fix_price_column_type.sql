-- Migration: Fix price column type to match Rust f64 type
-- Change from DECIMAL(15,2) to DOUBLE PRECISION to match f64

ALTER TABLE products ALTER COLUMN price TYPE DOUBLE PRECISION;

-- Update the check constraint to work with the new type
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_check;
ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price >= 0.0);
