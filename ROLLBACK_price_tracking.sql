-- =============================================================================
-- Rollback Script for Price Tracking Feature
-- Feature: 050-price-tracking (Review fix #20)
-- Date: 2025-12-17
-- =============================================================================
--
-- INSTRUCTIONS:
-- Run this script in reverse order to rollback the price tracking feature
-- ONLY use in emergency situations when feature needs to be completely removed
--
-- WARNING: This will permanently delete all price tracking data!
--
-- =============================================================================

-- Rollback Migration 20251217000016 (Fix personal_offers schema)
ALTER TABLE personal_offers DROP COLUMN IF EXISTS tracking_id;
ALTER TABLE personal_offers ADD COLUMN IF NOT EXISTS gear_item_id UUID REFERENCES gear_items(id) ON DELETE CASCADE;

-- Rollback Migration 20251217000015 (RLS Policies)
DROP POLICY IF EXISTS "Users can view their own price tracking" ON price_tracking;
DROP POLICY IF EXISTS "Users can insert their own price tracking" ON price_tracking;
DROP POLICY IF EXISTS "Users can update their own price tracking" ON price_tracking;
DROP POLICY IF EXISTS "Users can delete their own price tracking" ON price_tracking;
DROP POLICY IF EXISTS "Users can view their price results" ON price_results;
DROP POLICY IF EXISTS "Users can view their price history" ON price_history;
DROP POLICY IF EXISTS "Users can view their own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can view their own preferences" ON alert_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON alert_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON alert_preferences;
DROP POLICY IF EXISTS "Anyone can view active partner retailers" ON partner_retailers;
DROP POLICY IF EXISTS "Users can view their own offers" ON personal_offers;
DROP POLICY IF EXISTS "Users can update their own offers" ON personal_offers;

ALTER TABLE price_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE partner_retailers DISABLE ROW LEVEL SECURITY;
ALTER TABLE personal_offers DISABLE ROW LEVEL SECURITY;

-- Rollback Migration 20251217000014 (Views and Functions)
DROP VIEW IF EXISTS community_availability CASCADE;
DROP FUNCTION IF EXISTS fuzzy_search_products CASCADE;

-- Rollback Migration 20251217000013 (Alerts)
DROP TRIGGER IF EXISTS price_tracking_updated_at ON price_tracking;
DROP FUNCTION IF EXISTS update_price_tracking_updated_at CASCADE;

DROP TABLE IF EXISTS alert_preferences CASCADE;
DROP TABLE IF EXISTS price_alerts CASCADE;

-- Rollback Migration 20251217000012 (Partner Retailers)
DROP TRIGGER IF EXISTS update_partner_retailers_updated_at ON partner_retailers;

DROP TABLE IF EXISTS personal_offers CASCADE;
DROP TABLE IF EXISTS partner_retailers CASCADE;

-- Rollback Migration 20251217000011 (Price Tracking Tables)
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS price_results CASCADE;
DROP TABLE IF EXISTS price_tracking CASCADE;

-- Rollback Migration 20251217000010 (Extensions)
DROP INDEX IF EXISTS idx_gear_items_name_trgm;
-- Note: We don't drop pg_trgm extension as it might be used elsewhere

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Rollback Complete: All price tracking tables and functions removed';
  RAISE NOTICE '⚠ WARNING: All price tracking data has been permanently deleted!';
END $$;
