-- Migration: Add marketplace flags to gear_items
-- Feature: 045-gear-editor-tabs-marketplace
-- Date: 2025-12-11

-- Add boolean flags for marketplace features
ALTER TABLE gear_items
ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS can_be_borrowed BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS can_be_traded BOOLEAN DEFAULT false NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN gear_items.is_for_sale IS 'Whether this item is available for sale';
COMMENT ON COLUMN gear_items.can_be_borrowed IS 'Whether this item can be borrowed by others';
COMMENT ON COLUMN gear_items.can_be_traded IS 'Whether this item can be traded';
