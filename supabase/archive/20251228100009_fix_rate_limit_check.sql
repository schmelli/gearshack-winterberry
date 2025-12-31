-- Migration: Fix Rate Limit Side Effect
-- Feature: 001-social-graph
-- Issue: can_send_friend_request increments rate limit on check
-- Fix: Create non-incrementing check function
-- Date: 2025-12-28

-- =============================================================================
-- FUNCTION: check_rate_limit_only
-- Checks rate limit WITHOUT incrementing the counter (read-only)
-- =============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit_only(
  p_user_id UUID,
  p_action TEXT,
  p_limit INTEGER,
  p_window_hours INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_oldest_in_window TIMESTAMPTZ;
  v_resets_at TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_hours || ' hours')::INTERVAL;

  -- Count actions within the time window
  SELECT COUNT(*), MIN(created_at) INTO v_count, v_oldest_in_window
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > v_window_start;

  -- Calculate when the limit will reset (when oldest entry expires)
  IF v_count >= p_limit AND v_oldest_in_window IS NOT NULL THEN
    v_resets_at := v_oldest_in_window + (p_window_hours || ' hours')::INTERVAL;
  ELSE
    v_resets_at := NULL;
  END IF;

  RETURN json_build_object(
    'exceeded', v_count >= p_limit,
    'count', v_count,
    'limit', p_limit,
    'resets_at', v_resets_at
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Update can_send_friend_request to use non-incrementing check
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

  -- Check rate limit WITHOUT incrementing (FIXED)
  SELECT check_rate_limit_only(v_user_id, 'friend_request', 20, 24) INTO v_rate_check;

  IF (v_rate_check->>'exceeded')::BOOLEAN THEN
    RETURN json_build_object(
      'canSend', false,
      'reason', 'rate_limit_exceeded',
      'resets_at', v_rate_check->>'resets_at'
    );
  END IF;

  RETURN json_build_object('canSend', true, 'reason', 'eligible');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION check_rate_limit_only IS 'Check rate limit without incrementing counter (read-only check for UI state)';
COMMENT ON FUNCTION can_send_friend_request IS 'Check if user can send friend request - FIXED to use non-incrementing rate limit check';
