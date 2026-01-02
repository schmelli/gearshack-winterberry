-- Migration: Drop old VIP loadout tables
-- Date: 2026-01-02
-- Description: Remove deprecated vip_loadouts and vip_loadout_items tables
--              VIPs now use regular loadouts/gear_items tables with account_type='vip'

-- ============================================================================
-- Drop Old VIP Loadout Tables
-- ============================================================================

-- Drop vip_loadout_items table (foreign key to vip_loadouts)
DROP TABLE IF EXISTS vip_loadout_items CASCADE;

-- Drop vip_loadouts table
DROP TABLE IF EXISTS vip_loadouts CASCADE;

-- ============================================================================
-- Keep vip_accounts table
-- ============================================================================

-- DO NOT DROP vip_accounts - still needed for VIP profile metadata (slug, bio, avatar, etc.)
-- vip_accounts now links to regular profiles table via user_id

-- ============================================================================
-- Migration notes
-- ============================================================================

-- This migration completes the VIP system refactor (Feature 052)
-- VIPs are now regular users with:
--   - profiles.account_type = 'vip'
--   - gear_items with source_attribution (their curated gear)
--   - loadouts with is_vip_loadout = true (their published loadouts)
