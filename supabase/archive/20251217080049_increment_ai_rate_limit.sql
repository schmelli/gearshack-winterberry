-- Feature 050: AI Assistant - Rate Limit Increment Function
-- Fixes critical bug where rate limit counter was never incremented
-- This migration adds the missing increment_ai_rate_limit function

-- =====================================================
-- FUNCTION: Increment AI Rate Limit Counter
-- =====================================================

-- Atomically increment the rate limit counter after a successful message send
-- This function should be called immediately after check_ai_rate_limit passes
CREATE OR REPLACE FUNCTION increment_ai_rate_limit(
  p_user_id uuid,
  p_endpoint text
) RETURNS void AS $$
BEGIN
  -- Atomically increment count and update last_message_at timestamp
  UPDATE ai_rate_limits
  SET
    count = count + 1,
    last_message_at = now()
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint;

  -- If no row was updated (shouldn't happen if check was called first),
  -- create the record with count = 1
  IF NOT FOUND THEN
    INSERT INTO ai_rate_limits (user_id, endpoint, count, window_start, last_message_at)
    VALUES (p_user_id, p_endpoint, 1, now(), now())
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET
      count = ai_rate_limits.count + 1,
      last_message_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_ai_rate_limit(uuid, text) TO authenticated;
