-- Migration: Add start page preference to profiles table
-- Feature: Community Section Restructure
-- Date: 2026-01-05
--
-- Allows users to select their default landing page after login:
-- - inventory: Go to gear inventory
-- - loadouts: Go to loadouts
-- - community: Go to community dashboard

-- =============================================================================
-- Start Page Preference
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  start_page TEXT DEFAULT 'inventory';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_start_page_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_start_page_check
  CHECK (start_page IN ('inventory', 'loadouts', 'community'));

COMMENT ON COLUMN profiles.start_page IS 'Default page to redirect to after login: inventory, loadouts, or community';
