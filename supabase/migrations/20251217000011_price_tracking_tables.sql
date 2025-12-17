-- Migration: Create price tracking tables
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Core tables for price tracking, results, and history

-- ==================== price_tracking table ====================
-- Tracks which wishlist items have price tracking enabled
CREATE TABLE price_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,

  -- Tracking status
  enabled BOOLEAN NOT NULL DEFAULT true,
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Product matching
  confirmed_product_id TEXT, -- External product ID after fuzzy match confirmation
  match_confidence DECIMAL(3,2), -- 0.00-1.00 from fuzzy matching
  manual_product_url TEXT, -- User-provided product URL if fuzzy match failed

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(user_id, gear_item_id)
);

-- Indexes
CREATE INDEX idx_price_tracking_user ON price_tracking(user_id);
CREATE INDEX idx_price_tracking_enabled ON price_tracking(enabled) WHERE enabled = true;
CREATE INDEX idx_price_tracking_last_checked ON price_tracking(last_checked_at);

-- ==================== price_results table ====================
-- Current price data from external sources
CREATE TABLE price_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,

  -- Source information
  source_type TEXT NOT NULL CHECK (source_type IN ('google_shopping', 'ebay', 'retailer', 'local_shop')),
  source_name TEXT NOT NULL, -- e.g., 'Bergfreunde.de', 'eBay Germany'
  source_url TEXT NOT NULL, -- Direct link to product page

  -- Pricing
  price_amount DECIMAL(10,2) NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'EUR',
  shipping_cost DECIMAL(10,2),
  shipping_currency TEXT DEFAULT 'EUR',
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (price_amount + COALESCE(shipping_cost, 0)) STORED,

  -- Product details
  product_name TEXT NOT NULL,
  product_image_url TEXT,
  product_condition TEXT, -- 'new', 'used', 'refurbished'

  -- Local shop specific
  is_local BOOLEAN NOT NULL DEFAULT false,
  shop_latitude DECIMAL(9,6),
  shop_longitude DECIMAL(9,6),
  distance_km DECIMAL(6,2), -- Calculated at query time, stored for sorting

  -- Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'), -- Cache TTL

  -- Constraints
  CHECK (
    (is_local = false) OR
    (is_local = true AND shop_latitude IS NOT NULL AND shop_longitude IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_price_results_tracking ON price_results(tracking_id);
CREATE INDEX idx_price_results_expires ON price_results(expires_at);
CREATE INDEX idx_price_results_source_type ON price_results(source_type);

-- ==================== price_history table ====================
-- Historical price data for trend analysis (90-day retention)
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,

  -- Historical data point
  lowest_price DECIMAL(10,2) NOT NULL,
  highest_price DECIMAL(10,2) NOT NULL,
  average_price DECIMAL(10,2) NOT NULL,
  num_sources INTEGER NOT NULL, -- How many sources returned data

  -- Snapshot metadata
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (lowest_price <= highest_price)
);

-- Indexes
CREATE INDEX idx_price_history_tracking ON price_history(tracking_id);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);

-- ==================== Automatic cleanup function ====================
-- Purge price history older than 90 days
CREATE OR REPLACE FUNCTION purge_old_price_history()
RETURNS void AS $$
BEGIN
  DELETE FROM price_history
  WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ==================== Update timestamp trigger ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_price_tracking_updated_at
  BEFORE UPDATE ON price_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
