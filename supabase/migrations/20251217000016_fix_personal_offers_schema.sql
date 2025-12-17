-- Migration: Fix personal_offers schema
-- Feature: 050-price-tracking (Review fix #6)
-- Date: 2025-12-17
-- Purpose: Replace gear_item_id with tracking_id to properly reference price_tracking

-- Drop existing constraints
ALTER TABLE personal_offers DROP CONSTRAINT IF EXISTS personal_offers_gear_item_id_fkey;
ALTER TABLE personal_offers DROP CONSTRAINT IF EXISTS personal_offers_partner_retailer_id_user_id_gear_item_id_created_at_key;

-- Drop the gear_item_id column
ALTER TABLE personal_offers DROP COLUMN IF EXISTS gear_item_id;

-- Add tracking_id column with proper foreign key
ALTER TABLE personal_offers
ADD COLUMN tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE;

-- Recreate uniqueness constraint with tracking_id
ALTER TABLE personal_offers
ADD CONSTRAINT personal_offers_partner_user_tracking_unique
UNIQUE(partner_retailer_id, user_id, tracking_id, created_at);

-- Add index for tracking_id
CREATE INDEX idx_personal_offers_tracking_id ON personal_offers(tracking_id);

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE '✓ Migration Complete: personal_offers now uses tracking_id';
END $$;
