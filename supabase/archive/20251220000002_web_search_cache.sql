-- Migration: Extend api_cache table for web searches
-- Feature: Agentic AI Assistant System
-- Date: 2025-12-20
-- Purpose: Add columns to api_cache for web search caching with type-specific TTL

-- ==================== Extend api_cache Service Types ====================

-- First, drop the existing CHECK constraint to add new service types
ALTER TABLE api_cache
DROP CONSTRAINT IF EXISTS api_cache_service_check;

-- Add new CHECK constraint including web search types
ALTER TABLE api_cache
ADD CONSTRAINT api_cache_service_check
CHECK (service IN ('youtube', 'geargraph', 'web_search'));

-- ==================== New Columns for Web Search ====================

-- Add search_type column for categorizing web searches
ALTER TABLE api_cache
ADD COLUMN IF NOT EXISTS search_type VARCHAR(50);

COMMENT ON COLUMN api_cache.search_type IS
  'Type of web search: general, news, reviews, conditions, products, local_shops';

-- Add search_query column for the normalized search query
ALTER TABLE api_cache
ADD COLUMN IF NOT EXISTS search_query TEXT;

COMMENT ON COLUMN api_cache.search_query IS
  'Normalized search query for fast lookups and deduplication';

-- Add ttl_hours column for configurable cache duration
ALTER TABLE api_cache
ADD COLUMN IF NOT EXISTS ttl_hours INTEGER DEFAULT 168;

COMMENT ON COLUMN api_cache.ttl_hours IS
  'Cache duration in hours. Default 168 (7 days). Weather/conditions may use shorter TTL.';

-- ==================== Indexes for Fast Lookup ====================

-- Index for web search lookups by service and search type
CREATE INDEX IF NOT EXISTS idx_api_cache_web_search
  ON api_cache(service, search_type)
  WHERE service = 'web_search';

-- Index for search query lookups (using trigram for fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_api_cache_search_query
  ON api_cache USING gin(search_query gin_trgm_ops)
  WHERE search_query IS NOT NULL;

-- Composite index for exact cache key lookups on web searches
CREATE INDEX IF NOT EXISTS idx_api_cache_web_lookup
  ON api_cache(service, search_type, cache_key, expires_at)
  WHERE service = 'web_search';

-- ==================== Helper Function for Web Search Cache ====================

-- Function to get or create web search cache entry
CREATE OR REPLACE FUNCTION get_or_create_web_search_cache(
  p_cache_key TEXT,
  p_search_type VARCHAR(50),
  p_search_query TEXT,
  p_ttl_hours INTEGER DEFAULT 168
) RETURNS TABLE (
  cached_data JSONB,
  is_expired BOOLEAN,
  cache_id UUID
) AS $$
DECLARE
  v_cache_record RECORD;
BEGIN
  -- Look for existing cache entry
  SELECT id, response_data, expires_at
  INTO v_cache_record
  FROM api_cache
  WHERE service = 'web_search'
    AND cache_key = p_cache_key
    AND search_type = p_search_type
  LIMIT 1;

  -- Return results
  IF v_cache_record.id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_cache_record.response_data,
      v_cache_record.expires_at < NOW(),
      v_cache_record.id;
  ELSE
    RETURN QUERY SELECT
      NULL::JSONB,
      TRUE,
      NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
