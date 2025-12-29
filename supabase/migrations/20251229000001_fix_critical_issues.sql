-- Migration: Fix Critical Issues from Code Review
-- Feature: 001-social-graph
-- Date: 2025-12-29
-- Description: Fixes SQL injection, adds missing RPC functions, and adds performance indexes

-- =============================================================================
-- FUNCTION: unfriend_user
-- Safely removes a friendship using parameterized queries (prevents SQL injection)
-- =============================================================================

CREATE OR REPLACE FUNCTION unfriend_user(p_friend_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Due to canonical ordering, we need to handle both possible orderings
  -- Delete where current user is the smaller ID
  DELETE FROM friendships
  WHERE user_id = LEAST(v_user_id, p_friend_id)
    AND friend_id = GREATEST(v_user_id, p_friend_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unfriend_user IS 'Safely removes a friendship with canonical ordering (prevents SQL injection)';

-- =============================================================================
-- FUNCTION: get_friend_activity_feed_filtered
-- Server-side filtering version to avoid client-side filtering overhead
-- =============================================================================

CREATE OR REPLACE FUNCTION get_friend_activity_feed_filtered(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_activity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB,
  visibility TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    fa.id,
    fa.user_id,
    p.display_name,
    p.avatar_url,
    fa.activity_type,
    fa.reference_type,
    fa.reference_id,
    fa.metadata,
    fa.visibility,
    fa.created_at
  FROM friend_activities fa
  JOIN profiles p ON p.id = fa.user_id
  WHERE fa.user_id IN (
    -- Get all friend IDs
    SELECT CASE WHEN f.user_id = v_user_id THEN f.friend_id ELSE f.user_id END
    FROM friendships f
    WHERE f.user_id = v_user_id OR f.friend_id = v_user_id
  )
  AND (fa.visibility = 'public' OR fa.visibility = 'friends')
  -- Server-side activity type filter
  AND (p_activity_type IS NULL OR fa.activity_type = p_activity_type)
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_friend_activity_feed_filtered IS 'Get paginated activity feed with server-side filtering by activity type';

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Index for friend_activities query performance
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_created
  ON friend_activities(user_id, created_at DESC);

-- Index for friend_activities visibility filtering
CREATE INDEX IF NOT EXISTS idx_friend_activities_visibility_created
  ON friend_activities(visibility, created_at DESC)
  WHERE visibility IN ('public', 'friends');

-- Index for friend_requests status and expiry
CREATE INDEX IF NOT EXISTS idx_friend_requests_status_expires
  ON friend_requests(status, expires_at)
  WHERE status = 'pending';

-- Index for friend_requests recipient lookups
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_status
  ON friend_requests(recipient_id, status, created_at DESC);

-- Index for friendships lookups (both directions)
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend
  ON friendships(user_id, friend_id);

CREATE INDEX IF NOT EXISTS idx_friendships_friend_user
  ON friendships(friend_id, user_id);

-- Index for user_follows lookups
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_created
  ON user_follows(follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_follows_followed_created
  ON user_follows(followed_id, created_at DESC);

COMMENT ON INDEX idx_friend_activities_user_created IS 'Performance index for activity feed queries';
COMMENT ON INDEX idx_friend_activities_visibility_created IS 'Performance index for public/friends activity filtering';
COMMENT ON INDEX idx_friend_requests_status_expires IS 'Performance index for pending request queries';
COMMENT ON INDEX idx_friend_requests_recipient_status IS 'Performance index for recipient request lookups';
COMMENT ON INDEX idx_friendships_user_friend IS 'Performance index for friendship lookups (user perspective)';
COMMENT ON INDEX idx_friendships_friend_user IS 'Performance index for friendship lookups (friend perspective)';
COMMENT ON INDEX idx_user_follows_follower_created IS 'Performance index for following list queries';
COMMENT ON INDEX idx_user_follows_followed_created IS 'Performance index for followers list queries';
