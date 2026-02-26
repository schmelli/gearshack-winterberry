-- Migration: Create Additional VIP Indexes
-- Feature: 052-vip-loadouts
-- Description: Performance indexes for common query patterns

-- =============================================================================
-- Full-Text Search Indexes
-- =============================================================================

-- VIP name and bio search
CREATE INDEX IF NOT EXISTS idx_vip_accounts_search ON vip_accounts
  USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));

-- Loadout name, description, and trip_type search
CREATE INDEX IF NOT EXISTS idx_vip_loadouts_search ON vip_loadouts
  USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(trip_type, '')));

-- =============================================================================
-- Compound Indexes for Common Queries
-- =============================================================================

-- Featured VIPs with loadout count (for homepage)
CREATE INDEX IF NOT EXISTS idx_vip_accounts_featured_active ON vip_accounts(is_featured, created_at DESC)
  WHERE archived_at IS NULL AND is_featured = true;

-- Published loadouts by VIP with date ordering
CREATE INDEX IF NOT EXISTS idx_vip_loadouts_vip_published ON vip_loadouts(vip_id, published_at DESC)
  WHERE status = 'published';

-- Recent published loadouts (for discovery feed)
CREATE INDEX IF NOT EXISTS idx_vip_loadouts_recent_published ON vip_loadouts(published_at DESC)
  WHERE status = 'published';

-- =============================================================================
-- Foreign Key Performance Indexes
-- =============================================================================

-- Items by loadout (already exists, but ensure it's optimized)
CREATE INDEX IF NOT EXISTS idx_vip_loadout_items_loadout_order ON vip_loadout_items(vip_loadout_id, category, sort_order);

-- =============================================================================
-- Unique Constraint Indexes
-- =============================================================================

-- Ensure one active claim invitation per VIP
CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_invitations_active_per_vip ON claim_invitations(vip_id)
  WHERE status = 'pending';

-- =============================================================================
-- JSONB Indexes for Social Links
-- =============================================================================

-- Index for querying VIPs by platform presence
CREATE INDEX IF NOT EXISTS idx_vip_accounts_has_youtube ON vip_accounts((social_links ? 'youtube'))
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vip_accounts_has_instagram ON vip_accounts((social_links ? 'instagram'))
  WHERE archived_at IS NULL;

-- =============================================================================
-- Statistics Update
-- =============================================================================

-- Analyze tables for query planner optimization
ANALYZE vip_accounts;
ANALYZE vip_loadouts;
ANALYZE vip_loadout_items;
ANALYZE vip_follows;
ANALYZE vip_bookmarks;
ANALYZE claim_invitations;
