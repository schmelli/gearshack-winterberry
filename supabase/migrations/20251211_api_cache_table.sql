-- Migration: 20251211_api_cache_table.sql
-- Feature: 045-gear-detail-modal
-- Task: T004
--
-- Creates the api_cache table for caching external API responses
-- (YouTube reviews, GearGraph insights) with a 7-day TTL.

-- =============================================================================
-- API Cache Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('youtube', 'geargraph')),
  cache_key TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Composite unique constraint for upsert operations
  UNIQUE(service, cache_key)
);

-- Index for fast cache lookups by service, key, and expiration
CREATE INDEX IF NOT EXISTS idx_api_cache_lookup
  ON api_cache(service, cache_key, expires_at);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_api_cache_expires
  ON api_cache(expires_at);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (cache is shared across all users for efficiency)
CREATE POLICY "api_cache_select" ON api_cache
  FOR SELECT USING (true);

-- Only authenticated users can insert (prevent anonymous abuse)
CREATE POLICY "api_cache_insert" ON api_cache
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users can update (for cache refresh)
CREATE POLICY "api_cache_update" ON api_cache
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- Cleanup Note
-- =============================================================================

-- To periodically clean up expired cache entries, run:
-- DELETE FROM api_cache WHERE expires_at < NOW();
--
-- This can be scheduled via:
-- 1. Supabase Edge Function with cron trigger
-- 2. pg_cron extension if available
-- 3. External scheduled job
