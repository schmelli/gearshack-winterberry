-- ============================================================================
-- Migration: Add source_attribution filter to VIP Loadouts public read policy
-- Feature: Code Quality Review - Security Hardening
--
-- The loadouts table uses a unified schema where is_vip_loadout=true indicates
-- a published VIP loadout. However, the previous public read policy only
-- checked is_vip_loadout=true, which could allow visibility of improperly
-- configured loadouts (e.g., a regular user manipulating the flag via API).
--
-- This migration adds source_attribution IS NOT NULL as an additional guard:
-- legitimate VIP loadouts always have source attribution (YouTube/blog URL)
-- set by admins, so this prevents regular user loadouts from becoming
-- publicly visible even if is_vip_loadout were set to true.
--
-- Note: The loadouts table does not have a separate 'status' column.
-- The is_vip_loadout boolean serves as the publish flag in the unified schema.
-- source_attribution IS NOT NULL acts as a completeness/integrity check.
-- ============================================================================

-- Drop existing public read policy
DROP POLICY IF EXISTS "loadouts_vip_public_read" ON loadouts;

-- Recreate with source_attribution filter
-- Only VIP loadouts with proper source attribution are publicly visible
CREATE POLICY "loadouts_vip_public_read" ON loadouts
  FOR SELECT
  USING (is_vip_loadout = true AND source_attribution IS NOT NULL);

-- Update comment to reflect the tighter policy
COMMENT ON POLICY "loadouts_vip_public_read" ON loadouts IS
  'Public can view VIP loadouts that have source attribution (is_vip_loadout = true AND source_attribution IS NOT NULL)';
