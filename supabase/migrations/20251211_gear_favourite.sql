-- Migration: Add favourite field to gear_items table
-- Feature: 041-loadout-ux-profile (extended)
-- Date: 2025-12-11

-- Add favourite column (default false for existing items)
ALTER TABLE gear_items
  ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for efficient favourite queries
CREATE INDEX IF NOT EXISTS idx_gear_items_favourite
  ON gear_items(user_id, is_favourite)
  WHERE is_favourite = TRUE;
