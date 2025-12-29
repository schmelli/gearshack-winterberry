-- Migration: Create VIP Bookmarks Table
-- Feature: 052-vip-loadouts
-- Description: Tracks which VIP loadouts users have bookmarked

-- =============================================================================
-- VIP Bookmarks Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS vip_bookmarks (
  -- Composite primary key
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vip_loadout_id UUID NOT NULL REFERENCES vip_loadouts(id) ON DELETE CASCADE,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, vip_loadout_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- User's bookmarks (for "Saved Loadouts" list)
CREATE INDEX IF NOT EXISTS idx_vip_bookmarks_user ON vip_bookmarks(user_id);

-- Loadout's bookmark count
CREATE INDEX IF NOT EXISTS idx_vip_bookmarks_loadout ON vip_bookmarks(vip_loadout_id);

-- Recent bookmarks
CREATE INDEX IF NOT EXISTS idx_vip_bookmarks_created ON vip_bookmarks(created_at DESC);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE vip_bookmarks IS 'User-saved VIP loadouts for future reference';
COMMENT ON COLUMN vip_bookmarks.user_id IS 'User who bookmarked the loadout';
COMMENT ON COLUMN vip_bookmarks.vip_loadout_id IS 'VIP loadout that was bookmarked';
