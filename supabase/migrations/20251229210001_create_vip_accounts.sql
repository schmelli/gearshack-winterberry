-- Migration: Create VIP Accounts Table
-- Feature: 052-vip-loadouts
-- Description: VIP accounts representing outdoor influencers whose gear content is curated on GearShack

-- =============================================================================
-- VIP Accounts Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS vip_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core profile fields
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  bio TEXT NOT NULL,
  avatar_url TEXT NOT NULL,

  -- Social media links (JSONB for flexibility)
  social_links JSONB NOT NULL DEFAULT '{}',

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'curated' CHECK (status IN ('curated', 'claimed')),
  is_featured BOOLEAN NOT NULL DEFAULT false,

  -- Claim relationship (nullable until claimed)
  claimed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete for takedown requests
  archived_at TIMESTAMPTZ,
  archive_reason TEXT
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Primary lookup by slug (for URLs)
CREATE INDEX IF NOT EXISTS idx_vip_accounts_slug ON vip_accounts(slug);

-- Status filtering (exclude archived)
CREATE INDEX IF NOT EXISTS idx_vip_accounts_status ON vip_accounts(status)
  WHERE archived_at IS NULL;

-- Featured VIPs (for homepage)
CREATE INDEX IF NOT EXISTS idx_vip_accounts_featured ON vip_accounts(is_featured)
  WHERE is_featured = true AND archived_at IS NULL;

-- Claimed accounts lookup
CREATE INDEX IF NOT EXISTS idx_vip_accounts_claimed_by ON vip_accounts(claimed_by_user_id)
  WHERE claimed_by_user_id IS NOT NULL;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vip_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vip_accounts_updated_at
  BEFORE UPDATE ON vip_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_accounts_updated_at();

-- =============================================================================
-- Constraints
-- =============================================================================

-- Validate slug format (lowercase alphanumeric + hyphens)
ALTER TABLE vip_accounts
  ADD CONSTRAINT chk_vip_accounts_slug_format
  CHECK (slug ~ '^[a-z0-9-]+$');

-- Validate name length
ALTER TABLE vip_accounts
  ADD CONSTRAINT chk_vip_accounts_name_length
  CHECK (length(trim(name)) >= 2);

-- Validate social_links has at least one link
ALTER TABLE vip_accounts
  ADD CONSTRAINT chk_vip_accounts_social_links
  CHECK (
    social_links ? 'youtube' OR
    social_links ? 'instagram' OR
    social_links ? 'website'
  );

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE vip_accounts IS 'VIP influencer accounts with curated gear content';
COMMENT ON COLUMN vip_accounts.slug IS 'URL-safe identifier for SEO-friendly URLs';
COMMENT ON COLUMN vip_accounts.status IS 'curated = admin-managed, claimed = influencer-owned';
COMMENT ON COLUMN vip_accounts.social_links IS 'JSONB with youtube, instagram, website, twitter URLs';
COMMENT ON COLUMN vip_accounts.archived_at IS 'Soft delete timestamp for takedown requests (30-day retention)';
