-- Migration: Merchant Performance Optimization Indexes
-- Feature: 053-merchant-integration
-- Task: T095
-- Date: 2025-12-29
--
-- Additional indexes for common query patterns identified in hooks.

-- ============================================================================
-- 1. Rate limit check optimization (useMerchantOffers.ts)
-- Query: merchant_offers WHERE merchant_id = ? AND catalog_item_id = ? AND created_at >= ?
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_offers_rate_limit
  ON merchant_offers(merchant_id, catalog_item_id, created_at DESC);

-- ============================================================================
-- 2. Source attribution queries (MerchantSourceBadge.tsx)
-- Query: gear_items WHERE source_merchant_id = ? or source_loadout_id = ?
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_gear_items_source_merchant
  ON gear_items(source_merchant_id) WHERE source_merchant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gear_items_source_loadout
  ON gear_items(source_loadout_id) WHERE source_loadout_id IS NOT NULL;

-- ============================================================================
-- 3. Published loadouts filtering (useMerchantLoadoutsPublic.ts)
-- Query: merchant_loadouts WHERE status = 'published' AND trip_type = ?
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_loadouts_published_trip
  ON merchant_loadouts(trip_type, published_at DESC)
  WHERE status = 'published';

-- Note: GIN index for season array queries
CREATE INDEX IF NOT EXISTS idx_loadouts_published_season
  ON merchant_loadouts USING GIN(season)
  WHERE status = 'published';

-- ============================================================================
-- 4. Catalog item text search (useMerchantCatalog.ts, useWishlistInsights.ts)
-- Query: merchant_catalog_items WHERE merchant_id = ? AND (name ILIKE ? OR brand ILIKE ?)
-- ============================================================================

-- Extension for trigram search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for text search on name and brand
CREATE INDEX IF NOT EXISTS idx_catalog_name_trgm
  ON merchant_catalog_items USING GIN(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_catalog_brand_trgm
  ON merchant_catalog_items USING GIN(brand gin_trgm_ops)
  WHERE brand IS NOT NULL;

-- Composite index for merchant + active status filtering
CREATE INDEX IF NOT EXISTS idx_catalog_merchant_active
  ON merchant_catalog_items(merchant_id, is_active)
  WHERE is_active = true;

-- ============================================================================
-- 5. User offers listing (useUserOffers.ts)
-- Query: merchant_offers WHERE user_id = ? ORDER BY created_at DESC
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_offers_user_created
  ON merchant_offers(user_id, created_at DESC);

-- ============================================================================
-- 6. Merchant billing queries (useMerchantBilling.ts)
-- Query: merchant_transactions WHERE merchant_id = ? AND billing_cycle_start >= ?
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_merchant_cycle
  ON merchant_transactions(merchant_id, billing_cycle_start DESC, billing_cycle_end);

-- ============================================================================
-- COMPLETE
-- ============================================================================
