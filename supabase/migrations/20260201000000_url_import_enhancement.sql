-- Migration: URL Import Enhancement - Contribution Pipeline
-- Date: 2026-02-01
-- Purpose: Add Firecrawl cache table and extend user_contributions for gardener workflow

-- =============================================================================
-- 1. FIRECRAWL CACHE TABLE
-- Purpose: Cache Firecrawl API responses to reduce costs and improve latency
-- =============================================================================

CREATE TABLE IF NOT EXISTS firecrawl_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  response_json JSONB,
  source_urls JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC(3,2) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Add table and column comments
COMMENT ON TABLE firecrawl_cache IS 'Cache for Firecrawl API responses to reduce costs and improve latency';
COMMENT ON COLUMN firecrawl_cache.id IS 'Primary key - typically a UUID or generated ID';
COMMENT ON COLUMN firecrawl_cache.query_hash IS 'SHA256 hash of the normalized query for deduplication';
COMMENT ON COLUMN firecrawl_cache.query_text IS 'Original query text (brand + product name combination)';
COMMENT ON COLUMN firecrawl_cache.response_json IS 'Full Firecrawl API response as JSONB';
COMMENT ON COLUMN firecrawl_cache.source_urls IS 'Array of URLs that were scraped for this query';
COMMENT ON COLUMN firecrawl_cache.confidence IS 'Confidence score 0-1 for the extracted data quality';
COMMENT ON COLUMN firecrawl_cache.expires_at IS 'Cache expiration timestamp (typically 7-30 days)';

-- Indexes for efficient cache lookups and cleanup
CREATE INDEX idx_firecrawl_cache_hash ON firecrawl_cache(query_hash);
CREATE INDEX idx_firecrawl_cache_expires ON firecrawl_cache(expires_at);

-- =============================================================================
-- 2. USER CONTRIBUTIONS EXTENSION
-- Purpose: Add fields for contribution pipeline and gardener workflow
-- =============================================================================

-- Add contribution_type column
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS contribution_type TEXT
    CHECK (contribution_type IN ('new_product', 'incomplete_match', 'data_update'));

COMMENT ON COLUMN user_contributions.contribution_type IS 'Type of contribution: new_product (not in catalog), incomplete_match (matched but missing data), data_update (user modified existing data)';

-- Add catalog match score (more precise than existing matched_confidence)
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS catalog_match_score NUMERIC(3,2)
    CHECK (catalog_match_score IS NULL OR (catalog_match_score >= 0 AND catalog_match_score <= 1));

COMMENT ON COLUMN user_contributions.catalog_match_score IS 'Fuzzy match score 0-1 for catalog matching (NULL if no match attempted)';

-- Add catalog match ID (more explicit than existing matched_catalog_product_id)
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS catalog_match_id UUID;

COMMENT ON COLUMN user_contributions.catalog_match_id IS 'UUID of matched catalog product (NULL if new product or no match)';

-- Add enrichment data from Firecrawl
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_contributions.enrichment_data IS 'Additional product data from Firecrawl enrichment (specs, descriptions, images)';

-- Add suggestion status for gardener workflow
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS suggestion_status TEXT DEFAULT 'pending'
    CHECK (suggestion_status IN ('pending', 'queued_for_review', 'in_gardener_queue', 'processed', 'rejected'));

COMMENT ON COLUMN user_contributions.suggestion_status IS 'Status in the gardener workflow: pending (new), queued_for_review (auto-flagged), in_gardener_queue (awaiting manual review), processed (completed), rejected (invalid/spam)';

-- Add gardener task ID for tracking
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS gardener_task_id UUID;

COMMENT ON COLUMN user_contributions.gardener_task_id IS 'Reference to gardener task if this contribution is part of a batch review';

-- Add timestamp for when queued for review
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;

COMMENT ON COLUMN user_contributions.queued_at IS 'Timestamp when contribution was queued for gardener review';

-- Add timestamp for when processed
ALTER TABLE user_contributions
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

COMMENT ON COLUMN user_contributions.processed_at IS 'Timestamp when contribution was processed by gardener or auto-system';

-- =============================================================================
-- 3. INDEXES FOR NEW COLUMNS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_contributions_status ON user_contributions(suggestion_status);
CREATE INDEX IF NOT EXISTS idx_contributions_type ON user_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_contributions_queued ON user_contributions(queued_at) WHERE queued_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contributions_gardener_task ON user_contributions(gardener_task_id) WHERE gardener_task_id IS NOT NULL;

-- =============================================================================
-- 4. RLS POLICIES FOR FIRECRAWL_CACHE
-- Purpose: Only server/service role can access cache data
-- =============================================================================

ALTER TABLE firecrawl_cache ENABLE ROW LEVEL SECURITY;

-- No public access - cache is server-only
-- Service role bypasses RLS automatically, so no explicit policies needed for service role

-- Admin read-only access for debugging/monitoring
CREATE POLICY "admin_firecrawl_cache_read" ON firecrawl_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Note: INSERT, UPDATE, DELETE are only possible via service role (bypasses RLS)
-- This ensures cache can only be modified by server-side API routes

-- =============================================================================
-- 5. CACHE CLEANUP FUNCTION
-- Purpose: Remove expired cache entries (called by cron or maintenance)
-- =============================================================================
--
-- CACHE CLEANUP STRATEGY
-- ----------------------
-- The cleanup_firecrawl_cache() function removes expired cache entries to keep
-- the database size manageable. It should be called periodically.
--
-- RECOMMENDED FREQUENCY:
--   Daily cleanup is sufficient for most workloads. With default TTL of 7 days,
--   daily cleanup ensures expired entries are removed within 24 hours of expiry.
--
-- OPTION 1: pg_cron (Supabase/PostgreSQL extension)
--   If pg_cron is enabled on your Supabase project:
--
--   -- Enable pg_cron extension (requires Supabase Pro plan or self-hosted)
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
--   -- Schedule daily cleanup at 3:00 AM UTC
--   SELECT cron.schedule(
--     'firecrawl-cache-cleanup',      -- job name
--     '0 3 * * *',                    -- cron expression: daily at 3 AM
--     $$SELECT cleanup_firecrawl_cache()$$
--   );
--
--   -- To view scheduled jobs:
--   SELECT * FROM cron.job;
--
--   -- To remove the scheduled job:
--   SELECT cron.unschedule('firecrawl-cache-cleanup');
--
-- OPTION 2: External Scheduler (Vercel Cron, GitHub Actions, etc.)
--   Create an API endpoint that calls cleanupExpiredCache() from lib/firecrawl/cache.ts
--   and trigger it via external scheduler:
--
--   Example API route (/api/cron/firecrawl-cleanup):
--     import { cleanupExpiredCache } from '@/lib/firecrawl/cache';
--     export async function GET(request: Request) {
--       // Verify cron secret header for security
--       const deletedCount = await cleanupExpiredCache();
--       return Response.json({ deleted: deletedCount });
--     }
--
--   Vercel cron config (vercel.json):
--     { "crons": [{ "path": "/api/cron/firecrawl-cleanup", "schedule": "0 3 * * *" }] }
--
-- OPTION 3: Manual Cleanup
--   Run periodically via Supabase SQL Editor or psql:
--     SELECT cleanup_firecrawl_cache();
--
-- MONITORING:
--   The function returns the count of deleted rows for logging purposes.
--   Monitor this value to track cache churn and adjust TTL if needed.
--
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_firecrawl_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM firecrawl_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_firecrawl_cache IS 'Removes expired Firecrawl cache entries. Returns count of deleted rows.';

-- Grant execute to service role only
REVOKE ALL ON FUNCTION cleanup_firecrawl_cache FROM PUBLIC;

-- =============================================================================
-- 6. CONTRIBUTION QUEUE HELPER VIEWS
-- Purpose: Simplify gardener dashboard queries
-- =============================================================================

-- View for pending contributions that need review
CREATE OR REPLACE VIEW pending_contributions AS
SELECT
  uc.id,
  uc.brand_name,
  uc.product_name,
  uc.source_url,
  uc.contribution_type,
  uc.catalog_match_score,
  uc.enrichment_data,
  uc.created_at,
  uc.queued_at,
  uc.contributor_country_code
FROM user_contributions uc
WHERE uc.suggestion_status IN ('pending', 'queued_for_review', 'in_gardener_queue')
ORDER BY
  CASE uc.suggestion_status
    WHEN 'in_gardener_queue' THEN 1
    WHEN 'queued_for_review' THEN 2
    WHEN 'pending' THEN 3
  END,
  uc.created_at ASC;

COMMENT ON VIEW pending_contributions IS 'Contributions awaiting gardener review, prioritized by status';

-- Grant access to admins only
ALTER VIEW pending_contributions OWNER TO postgres;

-- =============================================================================
-- 7. UPDATE EXISTING RLS POLICIES ON USER_CONTRIBUTIONS
-- Purpose: Allow admins to update contribution status
-- =============================================================================

-- Drop existing update policy if it exists (safely)
DROP POLICY IF EXISTS "admin_contributions_update" ON user_contributions;

-- Create update policy for admins to change status and add gardener data
CREATE POLICY "admin_contributions_update" ON user_contributions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =============================================================================
-- 8. CONTRIBUTION STATISTICS FUNCTION
-- Purpose: Aggregate statistics for admin dashboard
-- =============================================================================

CREATE OR REPLACE FUNCTION get_contribution_stats()
RETURNS TABLE (
  total_contributions BIGINT,
  pending_count BIGINT,
  queued_count BIGINT,
  processed_count BIGINT,
  rejected_count BIGINT,
  new_product_count BIGINT,
  incomplete_match_count BIGINT,
  data_update_count BIGINT,
  avg_match_score NUMERIC,
  contributions_today BIGINT,
  contributions_this_week BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_contributions,
    COUNT(*) FILTER (WHERE suggestion_status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE suggestion_status IN ('queued_for_review', 'in_gardener_queue'))::BIGINT as queued_count,
    COUNT(*) FILTER (WHERE suggestion_status = 'processed')::BIGINT as processed_count,
    COUNT(*) FILTER (WHERE suggestion_status = 'rejected')::BIGINT as rejected_count,
    COUNT(*) FILTER (WHERE contribution_type = 'new_product')::BIGINT as new_product_count,
    COUNT(*) FILTER (WHERE contribution_type = 'incomplete_match')::BIGINT as incomplete_match_count,
    COUNT(*) FILTER (WHERE contribution_type = 'data_update')::BIGINT as data_update_count,
    ROUND(AVG(catalog_match_score), 2) as avg_match_score,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT as contributions_today,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as contributions_this_week
  FROM user_contributions;
END;
$$;

COMMENT ON FUNCTION get_contribution_stats IS 'Returns aggregated contribution statistics for admin dashboard';

-- Grant execute to admins only (no public access)
REVOKE ALL ON FUNCTION get_contribution_stats FROM PUBLIC;

-- =============================================================================
-- ROLLBACK PROCEDURE (Manual)
-- =============================================================================
-- WARNING: Rolling back this migration will result in DATA LOSS!
-- - All cached Firecrawl responses will be permanently deleted
-- - All contribution pipeline data (enrichment_data, status tracking, etc.) will be lost
-- - Any gardener workflow state will be destroyed
--
-- DEPENDENCIES TO CHECK BEFORE ROLLBACK:
-- 1. Verify no active gardener tasks are in progress
-- 2. Check if any server-side code depends on firecrawl_cache table
-- 3. Ensure no API routes reference the new user_contributions columns
-- 4. Confirm get_contribution_stats() is not used in any dashboards
-- 5. Check if cleanup_firecrawl_cache() is scheduled in any cron jobs
--
-- RUN IN REVERSE ORDER:
-- =============================================================================
--
-- Step 1: Revoke function permissions (already revoked, but for completeness)
-- REVOKE ALL ON FUNCTION get_contribution_stats FROM PUBLIC;
--
-- Step 2: Drop functions
-- DROP FUNCTION IF EXISTS get_contribution_stats();
-- DROP FUNCTION IF EXISTS cleanup_firecrawl_cache();
--
-- Step 3: Drop views
-- DROP VIEW IF EXISTS pending_contributions;
--
-- Step 4: Drop RLS policies
-- DROP POLICY IF EXISTS "admin_contributions_update" ON user_contributions;
-- DROP POLICY IF EXISTS "admin_firecrawl_cache_read" ON firecrawl_cache;
--
-- Step 5: Drop indexes on user_contributions (new columns)
-- DROP INDEX IF EXISTS idx_contributions_gardener_task;
-- DROP INDEX IF EXISTS idx_contributions_queued;
-- DROP INDEX IF EXISTS idx_contributions_type;
-- DROP INDEX IF EXISTS idx_contributions_status;
--
-- Step 6: Remove columns from user_contributions (DATA LOSS!)
-- ALTER TABLE user_contributions DROP COLUMN IF EXISTS processed_at;
-- ALTER TABLE user_contributions DROP COLUMN IF EXISTS queued_at;
-- ALTER TABLE user_contributions DROP COLUMN IF EXISTS gardener_task_id;
-- ALTER TABLE user_contributions DROP COLUMN IF EXISTS suggestion_status;
-- ALTER TABLE user_contributions DROP COLUMN IF EXISTS enrichment_data;
-- ALTER TABLE user_contributions DROP COLUMN IF EXISTS catalog_match_id;
-- ALTER TABLE user_contributions DROP COLUMN IF EXISTS catalog_match_score;
-- ALTER TABLE user_contributions DROP COLUMN IF EXISTS contribution_type;
--
-- Step 7: Drop firecrawl_cache indexes
-- DROP INDEX IF EXISTS idx_firecrawl_cache_expires;
-- DROP INDEX IF EXISTS idx_firecrawl_cache_hash;
--
-- Step 8: Drop firecrawl_cache table (DATA LOSS!)
-- DROP TABLE IF EXISTS firecrawl_cache CASCADE;
--
-- =============================================================================
-- END ROLLBACK PROCEDURE
-- =============================================================================
