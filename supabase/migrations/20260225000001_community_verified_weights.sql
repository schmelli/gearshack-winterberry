-- Migration: Community-verified Weights
-- Feature: community-verified-weights
-- Purpose: Enable users to report actual measured weights for catalog products.
--          After 3+ independent reports, compute a community-verified average weight.

-- =============================================================================
-- Add community weight columns to catalog_products
-- =============================================================================

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS community_weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS weight_verified_by_community BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS community_weight_report_count INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN catalog_products.community_weight_grams IS 'Average weight in grams reported by community members';
COMMENT ON COLUMN catalog_products.weight_verified_by_community IS 'True when 3+ independent weight reports exist';
COMMENT ON COLUMN catalog_products.community_weight_report_count IS 'Total number of weight reports for this product';

-- =============================================================================
-- weight_reports table
-- =============================================================================

CREATE TABLE IF NOT EXISTS weight_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which catalog product this report is for
  catalog_product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,

  -- Who reported it
  reported_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The reported weight
  reported_weight_grams INTEGER NOT NULL CHECK (reported_weight_grams > 0 AND reported_weight_grams < 100000),

  -- Optional context about how the weight was measured
  measurement_context TEXT CHECK (char_length(measurement_context) <= 500),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE weight_reports IS 'User-submitted actual weight measurements for catalog products';
COMMENT ON COLUMN weight_reports.reported_weight_grams IS 'Actual measured weight in grams (1-99999)';
COMMENT ON COLUMN weight_reports.measurement_context IS 'Optional note about measurement method (e.g. "kitchen scale", "with stuff sack")';

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_weight_reports_product ON weight_reports(catalog_product_id);
CREATE INDEX idx_weight_reports_user ON weight_reports(reported_by_user_id);

-- Unique constraint: one report per user per product
CREATE UNIQUE INDEX idx_weight_reports_unique_user_product
  ON weight_reports(catalog_product_id, reported_by_user_id);

-- Index for community weight lookups on catalog_products
CREATE INDEX idx_catalog_products_community_weight
  ON catalog_products(weight_verified_by_community)
  WHERE weight_verified_by_community = TRUE;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE weight_reports ENABLE ROW LEVEL SECURITY;

-- Users can read all weight reports (community data is public)
CREATE POLICY "weight_reports_select" ON weight_reports
  FOR SELECT
  USING (TRUE);

-- Authenticated users can insert their own reports
CREATE POLICY "weight_reports_insert" ON weight_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by_user_id);

-- Users can update only their own reports
CREATE POLICY "weight_reports_update" ON weight_reports
  FOR UPDATE
  USING (auth.uid() = reported_by_user_id)
  WITH CHECK (auth.uid() = reported_by_user_id);

-- Users can delete only their own reports
CREATE POLICY "weight_reports_delete" ON weight_reports
  FOR DELETE
  USING (auth.uid() = reported_by_user_id);

-- =============================================================================
-- RPC function: Submit weight report and recalculate community weight
-- =============================================================================

CREATE OR REPLACE FUNCTION submit_weight_report(
  p_catalog_product_id UUID,
  p_reported_weight_grams INTEGER,
  p_measurement_context TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_report_id UUID;
  v_report_count INTEGER;
  v_avg_weight NUMERIC;
  v_is_verified BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Validate weight range
  IF p_reported_weight_grams <= 0 OR p_reported_weight_grams >= 100000 THEN
    RAISE EXCEPTION 'WEIGHT_OUT_OF_RANGE';
  END IF;

  -- Validate catalog product exists
  IF NOT EXISTS (SELECT 1 FROM catalog_products WHERE id = p_catalog_product_id) THEN
    RAISE EXCEPTION 'CATALOG_PRODUCT_NOT_FOUND';
  END IF;

  -- Upsert weight report (one per user per product)
  INSERT INTO weight_reports (catalog_product_id, reported_by_user_id, reported_weight_grams, measurement_context)
  VALUES (p_catalog_product_id, v_user_id, p_reported_weight_grams, p_measurement_context)
  ON CONFLICT (catalog_product_id, reported_by_user_id)
  DO UPDATE SET
    reported_weight_grams = EXCLUDED.reported_weight_grams,
    measurement_context   = EXCLUDED.measurement_context,
    updated_at            = now()
  RETURNING id INTO v_report_id;

  -- Recalculate community weight
  SELECT COUNT(*), AVG(reported_weight_grams)
  INTO v_report_count, v_avg_weight
  FROM weight_reports
  WHERE catalog_product_id = p_catalog_product_id;

  -- Update catalog_products with new community weight data
  v_is_verified := v_report_count >= 3;

  UPDATE catalog_products
  SET
    community_weight_grams = CASE WHEN v_is_verified THEN ROUND(v_avg_weight) ELSE NULL END,
    weight_verified_by_community = v_is_verified,
    community_weight_report_count = v_report_count
  WHERE id = p_catalog_product_id;

  RETURN json_build_object(
    'report_id', v_report_id,
    'report_count', v_report_count,
    'community_weight_grams', CASE WHEN v_is_verified THEN ROUND(v_avg_weight) ELSE NULL END,
    'is_verified', v_is_verified
  );
END;
$$;

COMMENT ON FUNCTION submit_weight_report IS 'Submits or updates a weight report and recalculates community average. Returns updated stats.';

-- =============================================================================
-- RPC function: Get weight reports for a product
-- =============================================================================

CREATE OR REPLACE FUNCTION get_weight_reports(p_catalog_product_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reports JSON;
  v_stats JSON;
  v_user_report JSON;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get all reports with minimal user info
  SELECT json_agg(
    json_build_object(
      'id', wr.id,
      'reported_weight_grams', wr.reported_weight_grams,
      'measurement_context', wr.measurement_context,
      'created_at', wr.created_at,
      'is_own_report', (wr.reported_by_user_id = v_user_id)
    )
    ORDER BY wr.created_at DESC
  )
  INTO v_reports
  FROM weight_reports wr
  WHERE wr.catalog_product_id = p_catalog_product_id;

  -- Get aggregate stats
  SELECT json_build_object(
    'report_count', cp.community_weight_report_count,
    'community_weight_grams', cp.community_weight_grams,
    'is_verified', cp.weight_verified_by_community,
    'manufacturer_weight_grams', cp.weight_grams
  )
  INTO v_stats
  FROM catalog_products cp
  WHERE cp.id = p_catalog_product_id;

  -- Get current user's report (if any)
  SELECT json_build_object(
    'id', wr.id,
    'reported_weight_grams', wr.reported_weight_grams,
    'measurement_context', wr.measurement_context
  )
  INTO v_user_report
  FROM weight_reports wr
  WHERE wr.catalog_product_id = p_catalog_product_id
    AND wr.reported_by_user_id = v_user_id;

  RETURN json_build_object(
    'reports', COALESCE(v_reports, '[]'::json),
    'stats', v_stats,
    'user_report', v_user_report
  );
END;
$$;

COMMENT ON FUNCTION get_weight_reports IS 'Returns all weight reports, aggregate stats, and current user report for a catalog product.';
