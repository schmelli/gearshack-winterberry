-- Migration: Extend schema for new VIP system
-- Date: 2026-01-02
-- Description: Add VIP-related fields to profiles, gear_items, and loadouts tables
--              VIPs will use regular user tables instead of separate vip_loadout_items/vip_loadouts

-- ============================================================================
-- 1. Extend profiles table with account_type
-- ============================================================================

-- Create account_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('standard', 'vip', 'merchant');
  END IF;
END $$;

-- Add account_type column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_type account_type DEFAULT 'standard';

-- Create index for VIP filtering (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_profiles_account_type
ON profiles (account_type) WHERE account_type = 'vip';

COMMENT ON COLUMN profiles.account_type IS 'User account type: standard (regular user), vip (VIP curator), merchant (gear retailer)';

-- ============================================================================
-- 2. Extend gear_items table with source attribution
-- ============================================================================

-- Add source attribution for VIP curated items
ALTER TABLE gear_items
ADD COLUMN IF NOT EXISTS source_attribution JSONB;

COMMENT ON COLUMN gear_items.source_attribution IS 'Attribution for VIP curated items: {"type": "vip_curated", "url": "https://youtube.com/...", "checked_at": "2026-01-02T12:00:00Z"}';

-- Create index for VIP item filtering
CREATE INDEX IF NOT EXISTS idx_gear_items_vip_attribution
ON gear_items (user_id, source_attribution)
WHERE source_attribution IS NOT NULL;

-- ============================================================================
-- 3. Extend loadouts table with VIP fields
-- ============================================================================

-- Add VIP loadout flag
ALTER TABLE loadouts
ADD COLUMN IF NOT EXISTS is_vip_loadout BOOLEAN DEFAULT false;

-- Add source attribution
ALTER TABLE loadouts
ADD COLUMN IF NOT EXISTS source_attribution JSONB;

COMMENT ON COLUMN loadouts.is_vip_loadout IS 'Flag indicating this is a VIP curated loadout (visible to all users)';
COMMENT ON COLUMN loadouts.source_attribution IS 'Source URL and metadata for VIP loadouts: {"type": "vip_curated", "url": "...", "checked_at": "..."}';

-- Create index for VIP loadout filtering (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_loadouts_vip
ON loadouts (is_vip_loadout, user_id) WHERE is_vip_loadout = true;

-- ============================================================================
-- 4. Migration notes
-- ============================================================================

-- This migration does NOT migrate existing vip_loadouts/vip_loadout_items data
-- User will manually recreate VIP loadouts in the new system
-- Old tables will be dropped in a subsequent migration after validation
