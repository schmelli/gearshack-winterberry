-- Migration: Create VIP Follows Table
-- Feature: 052-vip-loadouts
-- Description: Tracks which users follow which VIP accounts

-- =============================================================================
-- VIP Follows Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS vip_follows (
  -- Composite primary key
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vip_id UUID NOT NULL REFERENCES vip_accounts(id) ON DELETE CASCADE,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (follower_id, vip_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- VIP's followers (for follower count queries)
CREATE INDEX IF NOT EXISTS idx_vip_follows_vip ON vip_follows(vip_id);

-- User's followed VIPs (for "VIPs I follow" list)
CREATE INDEX IF NOT EXISTS idx_vip_follows_follower ON vip_follows(follower_id);

-- Recent follows (for activity feeds)
CREATE INDEX IF NOT EXISTS idx_vip_follows_created ON vip_follows(created_at DESC);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE vip_follows IS 'User-VIP follow relationships for notifications';
COMMENT ON COLUMN vip_follows.follower_id IS 'User who is following';
COMMENT ON COLUMN vip_follows.vip_id IS 'VIP account being followed';
