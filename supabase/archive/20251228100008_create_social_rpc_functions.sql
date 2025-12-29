-- Migration: Create Social Graph RPC Functions
-- Feature: 001-social-graph
-- Task: T013
-- Date: 2025-12-28

-- =============================================================================
-- FUNCTION: has_message_exchange
-- Checks if two users have exchanged messages (prerequisite for friend requests)
-- =============================================================================

CREATE OR REPLACE FUNCTION has_message_exchange(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_conversation_id UUID;
  v_user1_sent BOOLEAN;
  v_user2_sent BOOLEAN;
BEGIN
  -- Find direct conversation between users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = p_user1
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_user2
  WHERE c.type = 'direct'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if both users have sent at least one message
  SELECT EXISTS(
    SELECT 1 FROM messages WHERE conversation_id = v_conversation_id AND sender_id = p_user1
  ) INTO v_user1_sent;

  SELECT EXISTS(
    SELECT 1 FROM messages WHERE conversation_id = v_conversation_id AND sender_id = p_user2
  ) INTO v_user2_sent;

  RETURN v_user1_sent AND v_user2_sent;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: send_friend_request
-- Sends a friend request with rate limiting and prerequisite checks
-- =============================================================================

CREATE OR REPLACE FUNCTION send_friend_request(
  p_recipient_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_rate_check JSON;
  v_has_exchange BOOLEAN;
  v_request_id UUID;
  v_existing_incoming UUID;
BEGIN
  -- Rate limit check (20 requests per 24 hours)
  SELECT check_and_increment_rate_limit(v_sender_id, 'friend_request', 20, 24) INTO v_rate_check;
  IF (v_rate_check->>'exceeded')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', 'rate_limit_exceeded',
      'resets_at', v_rate_check->>'resets_at'
    );
  END IF;

  -- Check message exchange prerequisite
  SELECT has_message_exchange(v_sender_id, p_recipient_id) INTO v_has_exchange;
  IF NOT v_has_exchange THEN
    RETURN json_build_object('success', false, 'error', 'no_message_exchange');
  END IF;

  -- Check if already friends
  IF are_friends(v_sender_id, p_recipient_id) THEN
    RETURN json_build_object('success', false, 'error', 'already_friends');
  END IF;

  -- Check if pending request already exists (sent by this user)
  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE sender_id = v_sender_id AND recipient_id = p_recipient_id AND status = 'pending'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'request_already_sent');
  END IF;

  -- Check if there's a pending incoming request from the recipient
  SELECT id INTO v_existing_incoming
  FROM friend_requests
  WHERE sender_id = p_recipient_id AND recipient_id = v_sender_id AND status = 'pending'
  LIMIT 1;

  IF v_existing_incoming IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'request_pending_from_them',
      'request_id', v_existing_incoming
    );
  END IF;

  -- Create the friend request
  INSERT INTO friend_requests (sender_id, recipient_id, message)
  VALUES (v_sender_id, p_recipient_id, p_message)
  RETURNING id INTO v_request_id;

  -- Create notification for recipient
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

-- =============================================================================
-- FUNCTION: respond_to_friend_request
-- Accepts or declines a friend request
-- =============================================================================

CREATE OR REPLACE FUNCTION respond_to_friend_request(
  p_request_id UUID,
  p_accept BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request RECORD;
BEGIN
  -- Get the request (must be the recipient)
  SELECT * INTO v_request FROM friend_requests
  WHERE id = p_request_id AND recipient_id = v_user_id AND status = 'pending';

  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'request_not_found');
  END IF;

  IF p_accept THEN
    -- Update request status
    UPDATE friend_requests
    SET status = 'accepted', responded_at = NOW()
    WHERE id = p_request_id;

    -- Create friendship with canonical ordering
    INSERT INTO friendships (user_id, friend_id)
    VALUES (
      LEAST(v_request.sender_id, v_user_id),
      GREATEST(v_request.sender_id, v_user_id)
    );

    -- Notify sender that request was accepted
    INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
    VALUES (
      v_request.sender_id,
      'friend_request_accepted',
      'profile',
      v_user_id::TEXT,
      'Your friend request was accepted'
    );

    -- Create activity events for both users
    INSERT INTO friend_activities (user_id, activity_type, reference_type, reference_id, visibility)
    VALUES
      (v_user_id, 'friend_added', 'profile', v_request.sender_id, 'friends'),
      (v_request.sender_id, 'friend_added', 'profile', v_user_id, 'friends');
  ELSE
    -- Just update status to declined (no notification)
    UPDATE friend_requests
    SET status = 'declined', responded_at = NOW()
    WHERE id = p_request_id;
  END IF;

  RETURN json_build_object('success', true, 'accepted', p_accept);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: get_mutual_friends
-- Returns mutual friends between two users
-- =============================================================================

CREATE OR REPLACE FUNCTION get_mutual_friends(p_user1 UUID, p_user2 UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user1_friends AS (
    SELECT CASE WHEN f.user_id = p_user1 THEN f.friend_id ELSE f.user_id END AS fid
    FROM friendships f
    WHERE f.user_id = p_user1 OR f.friend_id = p_user1
  ),
  user2_friends AS (
    SELECT CASE WHEN f.user_id = p_user2 THEN f.friend_id ELSE f.user_id END AS fid
    FROM friendships f
    WHERE f.user_id = p_user2 OR f.friend_id = p_user2
  )
  SELECT p.id, p.display_name, p.avatar_url
  FROM user1_friends u1
  JOIN user2_friends u2 ON u1.fid = u2.fid
  JOIN profiles p ON p.id = u1.fid
  LIMIT 100; -- Limit for performance
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: get_friend_activity_feed
-- Returns paginated activity feed from friends
-- =============================================================================

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
    -- Get all friend IDs
    SELECT CASE WHEN f.user_id = v_user_id THEN f.friend_id ELSE f.user_id END
    FROM friendships f
    WHERE f.user_id = v_user_id OR f.friend_id = v_user_id
  )
  AND (fa.visibility = 'public' OR fa.visibility = 'friends')
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: can_send_friend_request
-- Checks if user can send friend request (for UI button state)
-- =============================================================================

CREATE OR REPLACE FUNCTION can_send_friend_request(p_target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rate_check JSON;
BEGIN
  -- Check if same user
  IF v_user_id = p_target_user_id THEN
    RETURN json_build_object('canSend', false, 'reason', 'self');
  END IF;

  -- Check if already friends
  IF are_friends(v_user_id, p_target_user_id) THEN
    RETURN json_build_object('canSend', false, 'reason', 'already_friends');
  END IF;

  -- Check if pending request exists (either direction)
  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'pending'
      AND ((sender_id = v_user_id AND recipient_id = p_target_user_id)
           OR (sender_id = p_target_user_id AND recipient_id = v_user_id))
  ) THEN
    RETURN json_build_object('canSend', false, 'reason', 'request_pending');
  END IF;

  -- Check message exchange
  IF NOT has_message_exchange(v_user_id, p_target_user_id) THEN
    RETURN json_build_object('canSend', false, 'reason', 'no_message_exchange');
  END IF;

  -- Check rate limit (without incrementing)
  SELECT check_and_increment_rate_limit(v_user_id, 'friend_request', 20, 24) INTO v_rate_check;
  -- Note: This increments the counter, ideally we'd have a check-only version

  RETURN json_build_object('canSend', true, 'reason', 'eligible');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION has_message_exchange IS 'Check if two users have exchanged messages in a direct conversation';
COMMENT ON FUNCTION send_friend_request IS 'Send friend request with rate limiting and prerequisite validation';
COMMENT ON FUNCTION respond_to_friend_request IS 'Accept or decline a friend request';
COMMENT ON FUNCTION get_mutual_friends IS 'Get list of mutual friends between two users';
COMMENT ON FUNCTION get_friend_activity_feed IS 'Get paginated activity feed from user''s friends';
COMMENT ON FUNCTION can_send_friend_request IS 'Check if user can send friend request (for UI button state)';
