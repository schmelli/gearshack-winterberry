-- Add image_url column to catalog_products for GearGraph product images
-- Feature: 044-intelligence-integration

ALTER TABLE catalog_products
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN catalog_products.image_url IS 'Product image URL from GearGraph catalog';
