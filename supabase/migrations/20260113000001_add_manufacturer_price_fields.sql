-- Migration: Add manufacturer_price fields to gear_items
-- Feature: 057-wishlist-pricing-enhancements
-- Purpose: Store manufacturer/MSRP price for wishlist items separately from purchase price

-- =============================================================================
-- Add manufacturer_price fields
-- =============================================================================

ALTER TABLE gear_items
ADD COLUMN IF NOT EXISTS manufacturer_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS manufacturer_currency TEXT DEFAULT 'EUR';

-- Add comment for documentation
COMMENT ON COLUMN gear_items.manufacturer_price IS 'Manufacturer suggested retail price (MSRP) for wishlist items';
COMMENT ON COLUMN gear_items.manufacturer_currency IS 'Currency code for manufacturer_price (ISO 4217)';

-- =============================================================================
-- Create index for performance
-- =============================================================================

-- Index for wishlist items with manufacturer price
CREATE INDEX IF NOT EXISTS idx_gear_items_manufacturer_price
ON gear_items(manufacturer_price)
WHERE status = 'wishlist' AND manufacturer_price IS NOT NULL;
