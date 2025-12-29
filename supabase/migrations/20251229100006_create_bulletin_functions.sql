-- Migration: Create bulletin board RPC functions
-- Feature: 051-community-bulletin-board
-- Date: 2025-12-29

-- ============================================================================
-- Rate Limit Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_bulletin_rate_limit(
  p_user_id UUID,
  p_action_type VARCHAR(10) -- 'post' or 'reply'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_daily_count INTEGER;
  v_daily_limit INTEGER;
  v_account_age INTERVAL;
BEGIN
  -- Get account age
  SELECT now() - created_at INTO v_account_age
  FROM profiles
  WHERE id = p_user_id;

  -- Determine limit based on action type and account age
  IF p_action_type = 'post' THEN
    -- New accounts (<7 days) get 3 posts/day, others get 10
    v_daily_limit := CASE
      WHEN v_account_age < INTERVAL '7 days' THEN 3
      ELSE 10
    END;

    -- Count today's posts
    SELECT COUNT(*) INTO v_daily_count
    FROM bulletin_posts
    WHERE author_id = p_user_id
      AND created_at >= CURRENT_DATE
      AND is_deleted = false;
  ELSE
    -- Replies: 50 per day for all users
    v_daily_limit := 50;

    -- Count today's replies
    SELECT COUNT(*) INTO v_daily_count
    FROM bulletin_replies
    WHERE author_id = p_user_id
      AND created_at >= CURRENT_DATE
      AND is_deleted = false;
  END IF;

  RETURN v_daily_count < v_daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Duplicate Post Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_duplicate_bulletin_post(
  p_user_id UUID,
  p_content VARCHAR(500)
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Returns TRUE if content is unique (not a duplicate)
  RETURN NOT EXISTS (
    SELECT 1 FROM bulletin_posts
    WHERE author_id = p_user_id
      AND content = p_content
      AND created_at > now() - INTERVAL '1 hour'
      AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Archive Old Posts Function
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_bulletin_posts()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE bulletin_posts
  SET is_archived = true
  WHERE is_archived = false
    AND created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Get User Rate Limit Status (for UI feedback)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_bulletin_rate_limit_status(p_user_id UUID)
RETURNS TABLE (
  posts_remaining INTEGER,
  posts_limit INTEGER,
  replies_remaining INTEGER,
  replies_limit INTEGER,
  resets_at TIMESTAMPTZ
) AS $$
DECLARE
  v_account_age INTERVAL;
  v_posts_limit INTEGER;
  v_posts_used INTEGER;
  v_replies_used INTEGER;
BEGIN
  -- Get account age for post limit calculation
  SELECT now() - created_at INTO v_account_age
  FROM profiles
  WHERE id = p_user_id;

  v_posts_limit := CASE
    WHEN v_account_age < INTERVAL '7 days' THEN 3
    ELSE 10
  END;

  -- Count today's activity
  SELECT COUNT(*) INTO v_posts_used
  FROM bulletin_posts
  WHERE author_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND is_deleted = false;

  SELECT COUNT(*) INTO v_replies_used
  FROM bulletin_replies
  WHERE author_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND is_deleted = false;

  RETURN QUERY SELECT
    GREATEST(0, v_posts_limit - v_posts_used)::INTEGER,
    v_posts_limit::INTEGER,
    GREATEST(0, 50 - v_replies_used)::INTEGER,
    50::INTEGER,
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Check Edit Window
-- ============================================================================

CREATE OR REPLACE FUNCTION can_edit_bulletin_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT author_id, created_at INTO v_author_id, v_created_at
  FROM bulletin_posts
  WHERE id = p_post_id AND is_deleted = false;

  IF v_author_id IS NULL THEN
    RETURN false; -- Post not found or deleted
  END IF;

  -- Must be author and within 15-minute window
  RETURN v_author_id = p_user_id
    AND v_created_at > now() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION check_bulletin_rate_limit IS 'Atomic rate limit check for posts/replies';
COMMENT ON FUNCTION check_duplicate_bulletin_post IS 'Detect duplicate posts within 1 hour';
COMMENT ON FUNCTION archive_old_bulletin_posts IS 'Nightly job to archive posts older than 90 days';
COMMENT ON FUNCTION get_bulletin_rate_limit_status IS 'Get current rate limit usage for UI display';
COMMENT ON FUNCTION can_edit_bulletin_post IS 'Check if user can edit post (15-min window)';
