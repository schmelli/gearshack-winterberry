-- Migration: Create eBay price cache table
-- Feature: 057-wishlist-pricing-enhancements
-- Purpose: Cache eBay search results per country/query for 6 hours

-- =============================================================================
-- Table: ebay_price_cache
-- =============================================================================

CREATE TABLE IF NOT EXISTS ebay_price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Search key (composite unique)
  search_query TEXT NOT NULL,
  ebay_site TEXT NOT NULL,  -- 'de', 'com', 'co.uk', 'fr', 'it', 'es', 'at', 'ch'
  country_code TEXT NOT NULL,  -- ISO 3166-1 alpha-2

  -- Cached results
  results JSONB NOT NULL DEFAULT '[]',
  result_count INTEGER NOT NULL DEFAULT 0,

  -- Cache management
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '6 hours'),

  -- Ensure unique cache entries
  CONSTRAINT ebay_cache_unique UNIQUE (search_query, ebay_site)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Fast cache lookup
CREATE INDEX IF NOT EXISTS idx_ebay_cache_lookup
ON ebay_price_cache(search_query, ebay_site, expires_at);

-- For cache cleanup cron job
CREATE INDEX IF NOT EXISTS idx_ebay_cache_expires
ON ebay_price_cache(expires_at);

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE ebay_price_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cache (public data)
CREATE POLICY "ebay_cache_select_all"
ON ebay_price_cache
FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert/update (API routes)
CREATE POLICY "ebay_cache_insert_service"
ON ebay_price_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "ebay_cache_update_service"
ON ebay_price_cache
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "ebay_cache_delete_service"
ON ebay_price_cache
FOR DELETE
TO service_role
USING (true);

-- =============================================================================
-- Documentation
-- =============================================================================

COMMENT ON TABLE ebay_price_cache IS 'Cached eBay search results per country/query with 6-hour TTL';
COMMENT ON COLUMN ebay_price_cache.search_query IS 'Normalized search query (lowercase, trimmed)';
COMMENT ON COLUMN ebay_price_cache.ebay_site IS 'eBay site domain suffix (de, com, co.uk, fr, etc.)';
COMMENT ON COLUMN ebay_price_cache.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN ebay_price_cache.results IS 'JSON array of EbayListing objects';
COMMENT ON COLUMN ebay_price_cache.expires_at IS 'Cache expiration timestamp (6 hours from creation)';
