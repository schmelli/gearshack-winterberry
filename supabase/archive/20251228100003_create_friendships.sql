-- Migration: Create Friendships Table
-- Feature: 001-social-graph
-- Task: T008
-- Date: 2025-12-28

-- =============================================================================
-- FRIENDSHIPS TABLE
-- Stores confirmed bidirectional friendships with canonical ordering (user_id < friend_id)
-- Each friendship is stored exactly once to prevent duplicates
-- =============================================================================

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT friendships_canonical_order CHECK (user_id < friend_id),
  CONSTRAINT friendships_unique_pair UNIQUE (user_id, friend_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for querying user's friends (both directions)
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships
CREATE POLICY "friendships_select_own" ON friendships
  FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Friendships are created via RPC only (no direct insert)
-- Using service_role for RPC functions
CREATE POLICY "friendships_insert_via_rpc" ON friendships
  FOR INSERT
  WITH CHECK (false); -- Block direct inserts, use RPC

-- Users can delete friendships they're part of (unfriend)
CREATE POLICY "friendships_delete_own" ON friendships
  FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- =============================================================================
-- HELPER FUNCTION: are_friends
-- Checks if two users are friends (handles canonical ordering)
-- =============================================================================

CREATE OR REPLACE FUNCTION are_friends(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = LEAST(p_user1, p_user2)
      AND friend_id = GREATEST(p_user1, p_user2)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE friendships IS 'Confirmed bidirectional friendships. Each pair stored once with user_id < friend_id.';
COMMENT ON COLUMN friendships.user_id IS 'First user in the friendship (lower UUID)';
COMMENT ON COLUMN friendships.friend_id IS 'Second user in the friendship (higher UUID)';
COMMENT ON FUNCTION are_friends IS 'Check if two users are friends (handles canonical ordering internally)';
