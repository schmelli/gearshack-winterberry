-- Migration: Create catalog_gaps table
-- Feature: Missing Gear Logging for Catalog Gap Detection
-- Purpose: Track search queries that return zero results, indicating gaps in the product catalog.
--          Enables data-driven catalog roadmap decisions.

-- =============================================================================
-- catalog_gaps table
-- =============================================================================

CREATE TABLE IF NOT EXISTS catalog_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Search query that yielded no results
  query TEXT NOT NULL CHECK (char_length(query) <= 500),
  query_normalized TEXT GENERATED ALWAYS AS (lower(trim(query))) STORED,

  -- Context from the search
  scope TEXT CHECK (scope IN ('my_gear', 'catalog', 'all')),
  category_hint TEXT,                                -- Category filter if provided
  filters_used JSONB DEFAULT '{}',                   -- Preserved filters for analysis

  -- User attribution (internal tracking only - admin-restricted table)
  -- Stored as array without FK to allow accurate unique-user tracking without cascade complexity.
  user_ids UUID[] DEFAULT '{}',                      -- All user IDs who triggered this gap
  unique_users INTEGER DEFAULT 0 NOT NULL,           -- Count of distinct users who triggered this gap

  -- Occurrence metrics
  occurrence_count INTEGER DEFAULT 1 NOT NULL,
  first_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Admin workflow
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'catalog_added', 'dismissed', 'duplicate')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,

  -- Unique constraint on normalized query for UPSERT
  UNIQUE(query_normalized)
);

-- Add table comments
COMMENT ON TABLE catalog_gaps IS 'Tracks search queries with zero results to identify missing products/categories in the catalog';
COMMENT ON COLUMN catalog_gaps.query_normalized IS 'Auto-generated lowercase trimmed query for deduplication';
COMMENT ON COLUMN catalog_gaps.category_hint IS 'Category filter from original search, hints at what kind of product was expected';
COMMENT ON COLUMN catalog_gaps.filters_used IS 'JSON snapshot of filters applied during search (weight, price, brand, etc.)';
COMMENT ON COLUMN catalog_gaps.user_ids IS 'Array of all user IDs who triggered this gap (no FK, admin-only access via RLS)';
COMMENT ON COLUMN catalog_gaps.unique_users IS 'Count of distinct users who triggered this gap, derived from user_ids array';

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_catalog_gaps_status ON catalog_gaps(status);
CREATE INDEX idx_catalog_gaps_count ON catalog_gaps(occurrence_count DESC);
CREATE INDEX idx_catalog_gaps_recent ON catalog_gaps(last_seen_at DESC);
-- NOTE: No explicit index on query_normalized — the UNIQUE(query_normalized) constraint
-- already creates a btree index on that column. A duplicate index would waste storage
-- and add overhead on every write.
CREATE INDEX idx_catalog_gaps_first_seen ON catalog_gaps(first_seen_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE catalog_gaps ENABLE ROW LEVEL SECURITY;

-- Only admins can view catalog gaps
CREATE POLICY "admin_catalog_gaps_select" ON catalog_gaps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update catalog gaps (for status resolution workflow)
CREATE POLICY "admin_catalog_gaps_update" ON catalog_gaps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- NOTE: No INSERT policy is defined here. The upsert_catalog_gap function below
-- uses SECURITY DEFINER, so it executes with superuser privileges and bypasses RLS.
-- The service role client used by Mastra tools also bypasses RLS by design.
-- A WITH CHECK (TRUE) INSERT policy would incorrectly grant INSERT to ALL
-- authenticated users, opening a write vector for data pollution.

-- =============================================================================
-- Function to upsert a catalog gap (atomic increment + deduplication)
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_catalog_gap(
  p_query TEXT,
  p_scope TEXT DEFAULT NULL,
  p_category_hint TEXT DEFAULT NULL,
  p_filters JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO catalog_gaps (query, scope, category_hint, filters_used, user_ids, unique_users)
  VALUES (
    p_query,
    p_scope,
    p_category_hint,
    COALESCE(p_filters, '{}'),
    CASE WHEN p_user_id IS NOT NULL THEN ARRAY[p_user_id] ELSE '{}'::UUID[] END,
    CASE WHEN p_user_id IS NOT NULL THEN 1 ELSE 0 END
  )
  ON CONFLICT (query_normalized) DO UPDATE SET
    occurrence_count = catalog_gaps.occurrence_count + 1,
    last_seen_at = now(),
    -- Track unique users via array containment check to prevent overcounting.
    -- Without this, sequential searches A→B→A would count 3 unique users instead of 2.
    -- The array is capped at 100 entries to bound storage growth for popular gaps;
    -- beyond that we still increment unique_users via the count (approximate).
    user_ids = CASE
      WHEN p_user_id IS NOT NULL
        AND NOT (p_user_id = ANY(COALESCE(catalog_gaps.user_ids, '{}'::UUID[])))
        AND array_length(COALESCE(catalog_gaps.user_ids, '{}'::UUID[]), 1) < 100
      THEN array_append(COALESCE(catalog_gaps.user_ids, '{}'::UUID[]), p_user_id)
      ELSE COALESCE(catalog_gaps.user_ids, '{}'::UUID[])
    END,
    unique_users = CASE
      WHEN p_user_id IS NOT NULL
        AND NOT (p_user_id = ANY(COALESCE(catalog_gaps.user_ids, '{}'::UUID[])))
      THEN catalog_gaps.unique_users + 1
      ELSE catalog_gaps.unique_users
    END,
    -- Use new scope if provided, otherwise keep existing
    scope = COALESCE(EXCLUDED.scope, catalog_gaps.scope),
    -- Update category_hint if we have a new one
    category_hint = COALESCE(EXCLUDED.category_hint, catalog_gaps.category_hint),
    -- Update filters if new ones are provided (replaces previous snapshot)
    filters_used = CASE
      WHEN EXCLUDED.filters_used != '{}' THEN EXCLUDED.filters_used
      ELSE catalog_gaps.filters_used
    END
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_catalog_gap IS 'Inserts or updates a catalog gap entry, incrementing occurrence count and accurately tracking unique users via array containment check';

-- Restrict direct RPC execution of upsert_catalog_gap to the service_role only.
-- The function uses SECURITY DEFINER, so any authenticated user who can call it
-- via PostgREST would bypass RLS and pollute the catalog_gaps table.
-- Mastra tools use createServiceRoleClient() which has service_role grants.
REVOKE EXECUTE ON FUNCTION upsert_catalog_gap FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION upsert_catalog_gap FROM authenticated;
GRANT EXECUTE ON FUNCTION upsert_catalog_gap TO service_role;

-- =============================================================================
-- Aggregation function for admin summary stats (used by admin API to avoid
-- fetching all rows and summing client-side)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_catalog_gap_summary(p_since_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE(total_open_gaps BIGINT, total_searches_missed BIGINT)
LANGUAGE sql
-- No SECURITY DEFINER: runs under caller's RLS context.
-- Non-admin callers are blocked by the admin_catalog_gaps_select RLS policy,
-- so they receive zero/null aggregates instead of real data.
-- The admin API already verifies admin role before calling this RPC.
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_open_gaps,
    COALESCE(SUM(occurrence_count), 0)::BIGINT AS total_searches_missed
  FROM catalog_gaps
  WHERE status = 'open'
    AND (p_since_date IS NULL OR last_seen_at >= p_since_date);
$$;

COMMENT ON FUNCTION get_catalog_gap_summary IS 'Returns aggregate stats for open catalog gaps: total count and total occurrences missed. Accepts optional p_since_date to align summary with the period filter used in the admin API list query. Used to avoid client-side aggregation.';

-- =============================================================================
-- Convenience view: Weekly catalog gap report (top 20)
-- =============================================================================

-- security_invoker = true ensures the view runs under the caller's RLS context,
-- not the view creator's. Without this, any authenticated user who knows the view
-- name could bypass the admin_catalog_gaps_select RLS policy (views created by
-- the postgres role execute as the definer, which has BYPASSRLS).
-- Requires PostgreSQL 15+ (Supabase supports this).
CREATE OR REPLACE VIEW catalog_gaps_weekly_report WITH (security_invoker = true) AS
SELECT
  query,
  category_hint,
  scope,
  occurrence_count AS frequency,
  unique_users,
  first_seen_at,
  last_seen_at,
  status
FROM catalog_gaps
WHERE last_seen_at > now() - interval '7 days'
  AND status = 'open'
ORDER BY occurrence_count DESC
LIMIT 20;

COMMENT ON VIEW catalog_gaps_weekly_report IS 'Weekly report of top 20 unresolved catalog gaps by search frequency. Uses security_invoker to respect RLS policies.';
