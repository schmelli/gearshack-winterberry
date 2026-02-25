-- Migration: Create VIP Loadouts Table
-- Feature: 052-vip-loadouts
-- Description: Gear lists attributed to VIPs, sourced from YouTube videos or blog posts

-- =============================================================================
-- VIP Loadouts Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS vip_loadouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent VIP account
  vip_id UUID NOT NULL REFERENCES vip_accounts(id) ON DELETE CASCADE,

  -- Loadout details
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  source_url TEXT NOT NULL,
  description TEXT,
  trip_type VARCHAR(100),
  date_range VARCHAR(100),

  -- Publication status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  -- Source URL health tracking
  is_source_available BOOLEAN NOT NULL DEFAULT true,
  source_checked_at TIMESTAMPTZ,

  -- Audit fields
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- VIP's loadouts lookup
CREATE INDEX IF NOT EXISTS idx_vip_loadouts_vip_id ON vip_loadouts(vip_id);

-- Unique slug per VIP
CREATE UNIQUE INDEX IF NOT EXISTS idx_vip_loadouts_slug ON vip_loadouts(vip_id, slug);

-- Published loadouts (for public queries)
CREATE INDEX IF NOT EXISTS idx_vip_loadouts_status ON vip_loadouts(status)
  WHERE status = 'published';

-- Source URL health monitoring
CREATE INDEX IF NOT EXISTS idx_vip_loadouts_source_check ON vip_loadouts(source_checked_at)
  WHERE is_source_available = false;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vip_loadouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vip_loadouts_updated_at
  BEFORE UPDATE ON vip_loadouts
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_loadouts_updated_at();

-- Auto-set published_at when status changes to published
CREATE OR REPLACE FUNCTION set_vip_loadout_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published' OR OLD.status IS NULL) THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vip_loadout_published_at
  BEFORE UPDATE ON vip_loadouts
  FOR EACH ROW
  EXECUTE FUNCTION set_vip_loadout_published_at();

-- =============================================================================
-- Constraints
-- =============================================================================

-- Validate slug format
ALTER TABLE vip_loadouts
  ADD CONSTRAINT chk_vip_loadouts_slug_format
  CHECK (slug ~ '^[a-z0-9-]+$');

-- Validate name length
ALTER TABLE vip_loadouts
  ADD CONSTRAINT chk_vip_loadouts_name_length
  CHECK (length(trim(name)) >= 2);

-- Validate source_url is a valid URL pattern
ALTER TABLE vip_loadouts
  ADD CONSTRAINT chk_vip_loadouts_source_url
  CHECK (source_url ~ '^https?://');

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE vip_loadouts IS 'Gear lists attributed to VIP influencers with source attribution';
COMMENT ON COLUMN vip_loadouts.source_url IS 'Original YouTube video or blog post URL';
COMMENT ON COLUMN vip_loadouts.is_source_available IS 'Tracks if source URL is still accessible';
COMMENT ON COLUMN vip_loadouts.trip_type IS 'Trail or activity type (e.g., Pacific Crest Trail)';
COMMENT ON COLUMN vip_loadouts.published_at IS 'Timestamp when loadout was first published';
