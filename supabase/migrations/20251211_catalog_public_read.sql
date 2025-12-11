-- Migration: Allow public read access to catalog tables
-- Feature: 044-intelligence-integration
-- Date: 2025-12-11
--
-- The catalog_brands and catalog_items tables contain public reference data
-- that should be readable by anyone (including unauthenticated users) for
-- autocomplete and search functionality.

-- ============================================================================
-- PUBLIC READ POLICIES FOR CATALOG TABLES
-- ============================================================================

-- Allow anonymous/public read access to catalog_brands
CREATE POLICY "Anyone can read brands"
  ON catalog_brands
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous/public read access to catalog_items
CREATE POLICY "Anyone can read items"
  ON catalog_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Comments
COMMENT ON POLICY "Anyone can read brands" ON catalog_brands IS 'Public catalog data readable by all users for autocomplete';
COMMENT ON POLICY "Anyone can read items" ON catalog_items IS 'Public catalog data readable by all users for search';
