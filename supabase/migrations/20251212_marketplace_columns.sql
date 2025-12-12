-- Migration: Add marketplace columns to gear_items
-- Feature: 045-gear-editor-tabs-marketplace
-- 
-- Adds columns for marketplace features:
-- - is_for_sale: Whether item is available for sale
-- - can_be_borrowed: Whether item can be borrowed by others
-- - can_be_traded: Whether item can be traded

ALTER TABLE gear_items
ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_be_borrowed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_be_traded BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN gear_items.is_for_sale IS 'Whether this item is available for sale - Feature 045';
COMMENT ON COLUMN gear_items.can_be_borrowed IS 'Whether this item can be borrowed by others - Feature 045';
COMMENT ON COLUMN gear_items.can_be_traded IS 'Whether this item can be traded - Feature 045';
