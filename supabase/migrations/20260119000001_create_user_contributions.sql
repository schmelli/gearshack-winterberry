-- Migration: Create user_contributions table
-- Feature: URL-Import & Contributions Tracking
-- Purpose: Anonymous tracking of user gear additions for admin analytics

-- =============================================================================
-- user_contributions table
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Anonymous contributor info (no direct user_id reference for privacy)
  contributor_hash TEXT NOT NULL,              -- SHA256(user_id + salt) for deduplication
  contributor_country_code CHAR(2),            -- ISO 3166-1 alpha-2 (from CF-IPCountry or profile)

  -- What was added
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  source_url TEXT,                             -- Original import URL (NULL if manual entry)

  -- GearGraph matching status
  geargraph_matched BOOLEAN DEFAULT FALSE,
  matched_catalog_product_id UUID,             -- Reference to catalog_products if matched
  matched_confidence FLOAT,                    -- Fuzzy match score (0-1)

  -- What user contributed beyond catalog data
  user_added_fields JSONB DEFAULT '{}',        -- Fields user provided that catalog lacked
  user_modified_fields JSONB DEFAULT '{}',     -- Fields user changed from catalog values

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE user_contributions IS 'Anonymous tracking of user gear additions for admin analytics';
COMMENT ON COLUMN user_contributions.contributor_hash IS 'SHA256 hash of user_id for anonymous deduplication';
COMMENT ON COLUMN user_contributions.contributor_country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN user_contributions.user_added_fields IS 'JSON object with field names that user provided but catalog lacked';
COMMENT ON COLUMN user_contributions.user_modified_fields IS 'JSON object with field names that user changed from catalog values';

-- =============================================================================
-- Indexes for admin dashboard queries
-- =============================================================================

CREATE INDEX idx_contributions_country ON user_contributions(contributor_country_code);
CREATE INDEX idx_contributions_brand ON user_contributions(brand_name);
CREATE INDEX idx_contributions_matched ON user_contributions(geargraph_matched);
CREATE INDEX idx_contributions_created ON user_contributions(created_at DESC);
CREATE INDEX idx_contributions_created_country ON user_contributions(created_at, contributor_country_code);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE user_contributions ENABLE ROW LEVEL SECURITY;

-- Only admins can read contribution data
CREATE POLICY "admin_contributions_read" ON user_contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert (from API routes)
-- Note: This policy allows inserts through the service role client
CREATE POLICY "service_contributions_insert" ON user_contributions
  FOR INSERT
  WITH CHECK (TRUE);

-- No UPDATE or DELETE policies - this is an immutable audit log
