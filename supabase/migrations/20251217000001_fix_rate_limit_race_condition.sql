-- Fix race condition in rate limiting by combining check + increment atomically
-- Security fix for PR #58 review feedback

-- Drop the old function that only checks
DROP FUNCTION IF EXISTS check_ai_rate_limit(uuid, text, integer, integer);

-- Create new atomic function that checks AND increments in one operation
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window_hours integer
) RETURNS jsonb AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
  v_exceeded boolean;
  v_resets_at timestamptz;
BEGIN
  -- Acquire advisory lock to prevent concurrent execution for same user+endpoint
  -- This ensures true atomicity across concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_endpoint));

  -- Get or create rate limit record
  INSERT INTO ai_rate_limits (user_id, endpoint, count, window_start)
  VALUES (p_user_id, p_endpoint, 0, now())
  ON CONFLICT (user_id, endpoint) DO NOTHING;

  -- Get current state
  SELECT count, window_start INTO v_count, v_window_start
  FROM ai_rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint
  FOR UPDATE; -- Lock row for update

  -- Reset window if expired
  IF v_window_start + (p_window_hours * interval '1 hour') < now() THEN
    v_count := 0;
    v_window_start := now();

    UPDATE ai_rate_limits
    SET count = 0, window_start = now(), last_message_at = now()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
  END IF;

  -- Check if rate limit would be exceeded
  v_exceeded := v_count >= p_limit;
  v_resets_at := v_window_start + (p_window_hours * interval '1 hour');

  -- If NOT exceeded, increment the counter atomically
  IF NOT v_exceeded THEN
    UPDATE ai_rate_limits
    SET count = count + 1, last_message_at = now()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;

    v_count := v_count + 1;
  END IF;

  RETURN jsonb_build_object(
    'exceeded', v_exceeded,
    'count', v_count,
    'limit', p_limit,
    'resets_at', v_resets_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_and_increment_rate_limit(uuid, text, integer, integer) TO authenticated;
