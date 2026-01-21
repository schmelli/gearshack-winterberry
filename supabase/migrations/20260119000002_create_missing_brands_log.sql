-- Migration: Create missing_brands_log table
-- Feature: URL-Import & Contributions Tracking
-- Purpose: Track brand names users enter that do not exist in GearGraph

-- =============================================================================
-- missing_brands_log table
-- =============================================================================

CREATE TABLE IF NOT EXISTS missing_brands_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Brand info
  brand_name TEXT NOT NULL,
  brand_name_normalized TEXT GENERATED ALWAYS AS (lower(trim(brand_name))) STORED,

  -- Source tracking
  source_urls TEXT[] DEFAULT '{}',             -- Array of URLs where brand was seen

  -- Occurrence metrics
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Countries where brand was submitted from
  countries_seen CHAR(2)[] DEFAULT '{}',

  -- Admin workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'added_to_catalog', 'rejected', 'merged')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_note TEXT,
  merged_into_brand_id UUID,                   -- If merged into existing catalog brand

  -- Unique constraint on normalized name
  UNIQUE(brand_name_normalized)
);

-- Add table comment
COMMENT ON TABLE missing_brands_log IS 'Tracks brand names submitted by users that do not exist in GearGraph catalog';
COMMENT ON COLUMN missing_brands_log.brand_name_normalized IS 'Auto-generated lowercase trimmed brand name for deduplication';
COMMENT ON COLUMN missing_brands_log.source_urls IS 'Array of product URLs where this brand was encountered';
COMMENT ON COLUMN missing_brands_log.countries_seen IS 'Array of country codes where this brand was submitted from';

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_missing_brands_status ON missing_brands_log(status);
CREATE INDEX idx_missing_brands_count ON missing_brands_log(occurrence_count DESC);
CREATE INDEX idx_missing_brands_recent ON missing_brands_log(last_seen_at DESC);
CREATE INDEX idx_missing_brands_normalized ON missing_brands_log(brand_name_normalized);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE missing_brands_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage missing brands
CREATE POLICY "admin_missing_brands_select" ON missing_brands_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_missing_brands_update" ON missing_brands_log
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert/update (from API routes)
CREATE POLICY "service_missing_brands_insert" ON missing_brands_log
  FOR INSERT
  WITH CHECK (TRUE);

-- =============================================================================
-- Function to upsert missing brand
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_missing_brand(
  p_brand_name TEXT,
  p_source_url TEXT DEFAULT NULL,
  p_country_code CHAR(2) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_normalized TEXT;
BEGIN
  v_normalized := lower(trim(p_brand_name));

  INSERT INTO missing_brands_log (brand_name, source_urls, countries_seen)
  VALUES (
    p_brand_name,
    CASE WHEN p_source_url IS NOT NULL THEN ARRAY[p_source_url] ELSE '{}' END,
    CASE WHEN p_country_code IS NOT NULL THEN ARRAY[p_country_code] ELSE '{}' END
  )
  ON CONFLICT (brand_name_normalized) DO UPDATE SET
    occurrence_count = missing_brands_log.occurrence_count + 1,
    last_seen_at = now(),
    source_urls = CASE
      WHEN p_source_url IS NOT NULL AND NOT (p_source_url = ANY(missing_brands_log.source_urls))
      THEN array_append(missing_brands_log.source_urls, p_source_url)
      ELSE missing_brands_log.source_urls
    END,
    countries_seen = CASE
      WHEN p_country_code IS NOT NULL AND NOT (p_country_code = ANY(missing_brands_log.countries_seen))
      THEN array_append(missing_brands_log.countries_seen, p_country_code)
      ELSE missing_brands_log.countries_seen
    END
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_missing_brand IS 'Inserts or updates a missing brand entry, incrementing count and adding source URL/country if new';
