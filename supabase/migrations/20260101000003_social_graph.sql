-- Migration: Social Graph (Friends + Follow System)
-- Feature: 001-social-graph
-- Date: 2026-01-01
--
-- This migration creates the complete social graph feature including:
-- - Friend requests and friendships (bidirectional)
-- - Following system (unidirectional)
-- - Friend activity feed
-- - Privacy settings and RLS policies

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Friend request status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friend_request_status') THEN
        CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
    END IF;
END $$;

-- Activity types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE activity_type AS ENUM (
          'new_loadout',
          'loadout_shared',
          'marketplace_listing',
          'gear_added',
          'friend_added',
          'profile_updated'
        );
    END IF;
END $$;

-- Activity visibility levels
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_visibility') THEN
        CREATE TYPE activity_visibility AS ENUM ('public', 'friends', 'private');
    END IF;
END $$;

-- Privacy presets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'privacy_preset') THEN
        CREATE TYPE privacy_preset AS ENUM ('only_me', 'friends_only', 'everyone', 'custom');
    END IF;
END $$;

-- Account types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
        CREATE TYPE account_type AS ENUM ('standard', 'vip', 'merchant');
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Friend Requests Table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status friend_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Constraints
  CONSTRAINT friend_requests_sender_recipient_unique UNIQUE(sender_id, recipient_id),
  CONSTRAINT friend_requests_no_self CHECK(sender_id != recipient_id),
  CONSTRAINT friend_requests_message_length CHECK(char_length(message) <= 500)
);

-- Friendships Table (bidirectional, canonical ordering)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT friendships_unique UNIQUE(user_id, friend_id),
  CONSTRAINT friendships_canonical_order CHECK(user_id < friend_id)
);

-- User Follows Table (unidirectional)
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Primary Key
  PRIMARY KEY (follower_id, followed_id),

  -- Constraints
  CONSTRAINT user_follows_no_self CHECK(follower_id != followed_id)
);

-- Friend Activities Table
CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  visibility activity_visibility NOT NULL DEFAULT 'friends',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Friend Requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_pending ON friend_requests(recipient_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_expires ON friend_requests(expires_at) WHERE status = 'pending';

-- Friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

-- User Follows
CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id);

-- Friend Activities
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_time ON friend_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activities_time ON friend_activities(created_at DESC);

-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

-- Add privacy columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy_preset privacy_preset DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_type account_type DEFAULT 'standard';

-- Update notifications type constraint to include social notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'loadout_comment',
    'message_received',
    'friend_request',
    'friend_request_accepted',
    'new_follower',
    'friend_activity',
    'gear_trade',
    'system',
    'gear_enrichment'
  ));

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Check if two users have exchanged messages (prerequisite for friend requests)
CREATE OR REPLACE FUNCTION has_message_exchange(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM messages
    WHERE (sender_id = p_user1 AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = p_user2
    ))
    OR (sender_id = p_user2 AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = p_user1
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if two users are friends
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

-- Send friend request with validation
CREATE OR REPLACE FUNCTION send_friend_request(
  p_recipient_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_has_exchange BOOLEAN;
  v_request_id UUID;
BEGIN
  -- Check if users have exchanged messages
  SELECT has_message_exchange(v_sender_id, p_recipient_id) INTO v_has_exchange;
  IF NOT v_has_exchange THEN
    RETURN json_build_object('success', false, 'error', 'no_message_exchange');
  END IF;

  -- Check not already friends
  IF are_friends(v_sender_id, p_recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'already_friends');
  END IF;

  -- Check no pending request exists
  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE sender_id = v_sender_id
      AND recipient_id = p_recipient_id
      AND status = 'pending'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'request_already_sent');
  END IF;

  -- Create request
  INSERT INTO friend_requests (sender_id, recipient_id, message)
  VALUES (v_sender_id, p_recipient_id, p_message)
  RETURNING id INTO v_request_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
  VALUES (
    p_recipient_id,
    'friend_request',
    'friend_request',
    v_request_id::TEXT,
    'You have a new friend request'
  );

  RETURN json_build_object('success', true, 'request_id', v_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Respond to friend request
CREATE OR REPLACE FUNCTION respond_to_friend_request(
  p_request_id UUID,
  p_accept BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request RECORD;
BEGIN
  -- Get request (must be recipient)
  SELECT * INTO v_request
  FROM friend_requests
  WHERE id = p_request_id
    AND recipient_id = v_user_id
    AND status = 'pending';

  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'request_not_found');
  END IF;

  IF p_accept THEN
    -- Update request status
    UPDATE friend_requests
    SET status = 'accepted', responded_at = NOW()
    WHERE id = p_request_id;

    -- Create friendship (canonical ordering)
    INSERT INTO friendships (user_id, friend_id)
    VALUES (
      LEAST(v_request.sender_id, v_user_id),
      GREATEST(v_request.sender_id, v_user_id)
    );

    -- Notify sender
    INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
    VALUES (
      v_request.sender_id,
      'friend_request_accepted',
      'profile',
      v_user_id::TEXT,
      'Your friend request was accepted'
    );

    -- Create activity events
    INSERT INTO friend_activities (user_id, activity_type, reference_type, reference_id, visibility)
    VALUES
      (v_user_id, 'friend_added', 'profile', v_request.sender_id, 'friends'),
      (v_request.sender_id, 'friend_added', 'profile', v_user_id, 'friends');
  ELSE
    -- Decline request
    UPDATE friend_requests
    SET status = 'declined', responded_at = NOW()
    WHERE id = p_request_id;
  END IF;

  RETURN json_build_object('success', true, 'accepted', p_accept);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get mutual friends between two users
CREATE OR REPLACE FUNCTION get_mutual_friends(p_user1 UUID, p_user2 UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user1_friends AS (
    SELECT CASE
      WHEN f.user_id = p_user1 THEN f.friend_id
      ELSE f.user_id
    END AS fid
    FROM friendships f
    WHERE f.user_id = p_user1 OR f.friend_id = p_user1
  ),
  user2_friends AS (
    SELECT CASE
      WHEN f.user_id = p_user2 THEN f.friend_id
      ELSE f.user_id
    END AS fid
    FROM friendships f
    WHERE f.user_id = p_user2 OR f.friend_id = p_user2
  )
  SELECT p.id, p.display_name, p.avatar_url
  FROM user1_friends u1
  JOIN user2_friends u2 ON u1.fid = u2.fid
  JOIN profiles p ON p.id = u1.fid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get friend activity feed
CREATE OR REPLACE FUNCTION get_friend_activity_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  activity_type activity_type,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB,
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
    fa.created_at
  FROM friend_activities fa
  JOIN profiles p ON p.id = fa.user_id
  WHERE fa.user_id IN (
    SELECT CASE
      WHEN f.user_id = v_user_id THEN f.friend_id
      ELSE f.user_id
    END
    FROM friendships f
    WHERE f.user_id = v_user_id OR f.friend_id = v_user_id
  )
  AND (fa.visibility = 'public' OR fa.visibility = 'friends')
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get friend activity feed with type filter
CREATE OR REPLACE FUNCTION get_friend_activity_feed_filtered(
  p_activity_type activity_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  activity_type activity_type,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB,
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
    fa.created_at
  FROM friend_activities fa
  JOIN profiles p ON p.id = fa.user_id
  WHERE fa.user_id IN (
    SELECT CASE
      WHEN f.user_id = v_user_id THEN f.friend_id
      ELSE f.user_id
    END
    FROM friendships f
    WHERE f.user_id = v_user_id OR f.friend_id = v_user_id
  )
  AND (fa.visibility = 'public' OR fa.visibility = 'friends')
  AND (p_activity_type IS NULL OR fa.activity_type = p_activity_type)
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- Friend Requests Policies
CREATE POLICY "friend_requests_select_own" ON friend_requests FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "friend_requests_insert_sender" ON friend_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "friend_requests_update_recipient" ON friend_requests FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "friend_requests_delete_sender" ON friend_requests FOR DELETE
  USING (sender_id = auth.uid() AND status = 'pending');

-- Friendships Policies
CREATE POLICY "friendships_select_own" ON friendships FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friendships_delete_own" ON friendships FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- User Follows Policies
CREATE POLICY "user_follows_select_own" ON user_follows FOR SELECT
  USING (follower_id = auth.uid() OR followed_id = auth.uid());

CREATE POLICY "user_follows_insert_own" ON user_follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "user_follows_delete_own" ON user_follows FOR DELETE
  USING (follower_id = auth.uid());

-- Friend Activities Policies
CREATE POLICY "friend_activities_select" ON friend_activities FOR SELECT
  USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'friends' AND are_friends(user_id, auth.uid()))
  );

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Enable realtime for friend activities
ALTER PUBLICATION supabase_realtime ADD TABLE friend_activities;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE friend_requests IS 'Stores pending friend requests with 30-day auto-expiration';
COMMENT ON TABLE friendships IS 'Bidirectional friendships with canonical ordering (user_id < friend_id)';
COMMENT ON TABLE user_follows IS 'Unidirectional follow relationships';
COMMENT ON TABLE friend_activities IS 'Denormalized activity feed for friends with realtime updates';

COMMENT ON FUNCTION are_friends IS 'Checks if two users are friends (handles canonical ordering)';
COMMENT ON FUNCTION send_friend_request IS 'Sends friend request with prerequisite validation';
COMMENT ON FUNCTION respond_to_friend_request IS 'Accepts or declines friend request, creating friendship on accept';
COMMENT ON FUNCTION get_friend_activity_feed IS 'Returns paginated activity feed from user''s friends';
COMMENT ON FUNCTION get_friend_activity_feed_filtered IS 'Returns filtered activity feed by activity type';
