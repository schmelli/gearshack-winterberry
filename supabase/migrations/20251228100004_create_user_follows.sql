-- Migration: Create User Follows Table
-- Feature: 001-social-graph
-- Task: T009
-- Date: 2025-12-28

-- =============================================================================
-- USER FOLLOWS TABLE
-- Stores unidirectional follow relationships (no approval needed)
-- Note: This replaces/supplements the existing user_friends table for following
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Primary key is the relationship itself
  PRIMARY KEY (follower_id, followed_id),

  -- Cannot follow yourself
  CONSTRAINT user_follows_no_self_follow CHECK (follower_id != followed_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for follower count queries (get all followers of a user)
CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id);

-- Index for checking if user follows someone
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Users can see who they follow and who follows them
CREATE POLICY "user_follows_select_own" ON user_follows
  FOR SELECT
  USING (follower_id = auth.uid() OR followed_id = auth.uid());

-- Users can follow others
CREATE POLICY "user_follows_insert_own" ON user_follows
  FOR INSERT
  WITH CHECK (follower_id = auth.uid());

-- Users can unfollow
CREATE POLICY "user_follows_delete_own" ON user_follows
  FOR DELETE
  USING (follower_id = auth.uid());

-- =============================================================================
-- HELPER FUNCTION: Get follower count (for VIP accounts)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_follower_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_is_vip BOOLEAN;
BEGIN
  -- Check if user is VIP (only VIPs expose follower count)
  SELECT account_type = 'vip' INTO v_is_vip
  FROM profiles
  WHERE id = p_user_id;

  IF NOT COALESCE(v_is_vip, false) THEN
    RETURN NULL; -- Non-VIPs don't expose follower count
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM user_follows
  WHERE followed_id = p_user_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE user_follows IS 'Unidirectional follow relationships (no approval needed)';
COMMENT ON COLUMN user_follows.follower_id IS 'User who is following';
COMMENT ON COLUMN user_follows.followed_id IS 'User being followed';
COMMENT ON FUNCTION get_follower_count IS 'Get follower count for VIP accounts only (returns NULL for non-VIP)';
