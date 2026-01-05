-- Migration: Create Community Banners Table
-- Feature: 056-community-hub-enhancements
-- Purpose: Admin-managed promotional banners for community page carousel

-- =============================================================================
-- Table: community_banners
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_image_url TEXT NOT NULL,
  cta_text VARCHAR(200) NOT NULL,
  button_text VARCHAR(50) NOT NULL,
  target_url TEXT NOT NULL,
  visibility_start TIMESTAMPTZ NOT NULL,
  visibility_end TIMESTAMPTZ NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: End date must be after start date
  CONSTRAINT community_banners_valid_date_range
    CHECK (visibility_end > visibility_start)
);

-- Add comment for documentation
COMMENT ON TABLE community_banners IS 'Promotional banners displayed in community page carousel. Admin-managed with visibility windows.';
COMMENT ON COLUMN community_banners.cta_text IS 'Call-to-action headline text (5-200 characters)';
COMMENT ON COLUMN community_banners.button_text IS 'Button label text (2-50 characters)';
COMMENT ON COLUMN community_banners.visibility_start IS 'When banner becomes visible';
COMMENT ON COLUMN community_banners.visibility_end IS 'When banner stops being visible';
COMMENT ON COLUMN community_banners.display_order IS 'Manual sort order (lower = first)';

-- =============================================================================
-- Indexes
-- =============================================================================

-- Index for fetching active banners efficiently
CREATE INDEX idx_community_banners_active
  ON community_banners (visibility_start, visibility_end, is_active)
  WHERE is_active = true;

-- Index for sorting by display order
CREATE INDEX idx_community_banners_order
  ON community_banners (display_order, created_at);

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_community_banners_updated_at
  BEFORE UPDATE ON community_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE community_banners ENABLE ROW LEVEL SECURITY;

-- Public read for active banners within visibility window
CREATE POLICY "Active banners are viewable by authenticated users"
  ON community_banners FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND visibility_start <= NOW()
    AND visibility_end >= NOW()
  );

-- Admin operations (create, update, delete) are performed via service role
-- which bypasses RLS. This is the standard pattern used across the codebase.
-- See: 20251231000001_community_announcements.sql for similar approach.
