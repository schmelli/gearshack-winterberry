-- Migration: T001 - Add source_share_token to gear_items
-- Feature: 048-shared-loadout-enhancement
-- Purpose: Track gear items imported from shared loadouts to wishlist
-- Date: 2025-12-14

-- Add source reference column to existing gear_items table
ALTER TABLE gear_items ADD COLUMN IF NOT EXISTS
  source_share_token TEXT REFERENCES loadout_shares(share_token) ON DELETE SET NULL;

-- Index for querying items by source
CREATE INDEX IF NOT EXISTS idx_gear_items_source_share ON gear_items(source_share_token)
  WHERE source_share_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN gear_items.source_share_token IS
  'Foreign key to loadout_shares for wishlist items imported from shared loadouts. NULL for all other items.';
