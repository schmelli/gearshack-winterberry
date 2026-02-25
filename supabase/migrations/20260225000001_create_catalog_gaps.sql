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
  query TEXT NOT NULL,
  query_normalized TEXT GENERATED ALWAYS AS (lower(trim(query))) STORED,

  -- Context from the search
  scope TEXT CHECK (scope IN ('my_gear', 'catalog', 'all')),
  category_hint TEXT,                                -- Category filter if provided
  filters_used JSONB DEFAULT '{}',                   -- Preserved filters for analysis

  -- User attribution (nullable for privacy - we track the gap, not the user)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Occurrence metrics
  occurrence_count INTEGER DEFAULT 1 NOT NULL,
  unique_users INTEGER DEFAULT 1 NOT NULL,           -- Approximate unique users who searched this
  first_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Admin workflow
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'catalog_added', 'dismissed', 'duplicate')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_note TEXT,

  -- Unique constraint on normalized query for UPSERT
  UNIQUE(query_normalized)
);

-- Add table comments
COMMENT ON TABLE catalog_gaps IS 'Tracks search queries with zero results to identify missing products/categories in the catalog';
COMMENT ON COLUMN catalog_gaps.query_normalized IS 'Auto-generated lowercase trimmed query for deduplication';
COMMENT ON COLUMN catalog_gaps.category_hint IS 'Category filter from original search, hints at what kind of product was expected';
COMMENT ON COLUMN catalog_gaps.filters_used IS 'JSON snapshot of filters applied during search (weight, price, brand, etc.)';
COMMENT ON COLUMN catalog_gaps.unique_users IS 'Approximate count of distinct users who triggered this gap';

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_catalog_gaps_status ON catalog_gaps(status);
CREATE INDEX idx_catalog_gaps_count ON catalog_gaps(occurrence_count DESC);
CREATE INDEX idx_catalog_gaps_recent ON catalog_gaps(last_seen_at DESC);
CREATE INDEX idx_catalog_gaps_normalized ON catalog_gaps(query_normalized);
CREATE INDEX idx_catalog_gaps_first_seen ON catalog_gaps(first_seen_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE catalog_gaps ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage catalog gaps
CREATE POLICY "admin_catalog_gaps_select" ON catalog_gaps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_catalog_gaps_update" ON catalog_gaps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert (from tool execution context)
CREATE POLICY "service_catalog_gaps_insert" ON catalog_gaps
  FOR INSERT
  WITH CHECK (TRUE);

-- =============================================================================
-- Function to upsert a catalog gap
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
  v_normalized TEXT;
  v_existing_user_id UUID;
BEGIN
  v_normalized := lower(trim(p_query));

  -- Check if this query already exists and if the user is the same
  SELECT user_id INTO v_existing_user_id
  FROM catalog_gaps
  WHERE query_normalized = v_normalized;

  INSERT INTO catalog_gaps (query, scope, category_hint, filters_used, user_id)
  VALUES (
    p_query,
    p_scope,
    p_category_hint,
    COALESCE(p_filters, '{}'),
    p_user_id
  )
  ON CONFLICT (query_normalized) DO UPDATE SET
    occurrence_count = catalog_gaps.occurrence_count + 1,
    last_seen_at = now(),
    -- Increment unique_users only if this is a different user (or first user)
    unique_users = CASE
      WHEN p_user_id IS NOT NULL
        AND (catalog_gaps.user_id IS NULL OR catalog_gaps.user_id != p_user_id)
      THEN catalog_gaps.unique_users + 1
      ELSE catalog_gaps.unique_users
    END,
    -- Update scope if it was broader
    scope = COALESCE(EXCLUDED.scope, catalog_gaps.scope),
    -- Update category_hint if we have a new one
    category_hint = COALESCE(EXCLUDED.category_hint, catalog_gaps.category_hint),
    -- Merge filters
    filters_used = CASE
      WHEN EXCLUDED.filters_used != '{}' THEN EXCLUDED.filters_used
      ELSE catalog_gaps.filters_used
    END
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_catalog_gap IS 'Inserts or updates a catalog gap entry, incrementing occurrence count and tracking unique users';

-- =============================================================================
-- Convenience view: Weekly catalog gap report (top 20)
-- =============================================================================

CREATE OR REPLACE VIEW catalog_gaps_weekly_report AS
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

COMMENT ON VIEW catalog_gaps_weekly_report IS 'Weekly report of top 20 unresolved catalog gaps by search frequency';
