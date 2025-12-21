-- Migration: Rate Limit Tracking for Mastra Agentic Voice AI
-- Feature: 001-mastra-agentic-voice
-- Created: 2025-01-25
-- Description: Creates the ai_rate_limits table for tiered rate limiting (simple/workflow/voice)

-- ==================== TABLE CREATION ====================

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rate limit dimensions
  endpoint TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,

  -- Time window
  window_start TIMESTAMPTZ NOT NULL,

  UNIQUE(user_id, endpoint, window_start)
);

-- ==================== INDEXES ====================

-- Performance index for user/endpoint/window queries
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_endpoint
  ON ai_rate_limits(user_id, endpoint, window_start DESC);

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS to ensure multi-tenancy
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own rate limits
CREATE POLICY "Users can only access own rate limits"
  ON ai_rate_limits
  FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role full access"
  ON ai_rate_limits
  FOR ALL
  TO service_role
  USING (true);

-- ==================== ATOMIC CHECK AND INCREMENT FUNCTION ====================

-- Function: Atomically check rate limit and increment if allowed
-- Uses advisory locks to prevent race conditions
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_limit INTEGER,
  p_window_hours INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_count INTEGER;
  v_lock_key BIGINT;
  v_exceeded BOOLEAN;
BEGIN
  -- Calculate current window start (hourly window by default)
  v_window_start := date_trunc('hour', now());
  v_window_end := v_window_start + (p_window_hours || ' hours')::INTERVAL;

  -- Create a unique lock key from user_id and endpoint
  -- Using hashtext to convert the combination to a bigint for pg_advisory_xact_lock
  v_lock_key := hashtext(p_user_id::TEXT || ':' || p_endpoint);

  -- Acquire advisory lock for this user+endpoint combination
  -- This prevents race conditions between check and increment
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Get current count for this window
  SELECT count INTO v_current_count
  FROM ai_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = v_window_start;

  -- If no record exists, create one with count = 1
  IF v_current_count IS NULL THEN
    INSERT INTO ai_rate_limits (user_id, endpoint, count, window_start)
    VALUES (p_user_id, p_endpoint, 1, v_window_start);

    RETURN json_build_object(
      'exceeded', false,
      'count', 1,
      'limit', p_limit,
      'resets_at', v_window_end
    );
  END IF;

  -- Check if limit would be exceeded
  IF v_current_count >= p_limit THEN
    v_exceeded := true;
  ELSE
    v_exceeded := false;
    -- Increment the counter
    UPDATE ai_rate_limits
    SET count = count + 1
    WHERE user_id = p_user_id
      AND endpoint = p_endpoint
      AND window_start = v_window_start;

    v_current_count := v_current_count + 1;
  END IF;

  RETURN json_build_object(
    'exceeded', v_exceeded,
    'count', v_current_count,
    'limit', p_limit,
    'resets_at', v_window_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== CLEANUP FUNCTION ====================

-- Function: Clean up expired rate limit windows (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM ai_rate_limits
  WHERE window_start < now() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== COMMENTS ====================

COMMENT ON TABLE ai_rate_limits IS 'Implements tiered rate limiting: unlimited simple queries, 20 workflows/hour, 40 voice/hour';
COMMENT ON COLUMN ai_rate_limits.endpoint IS 'Rate limit endpoint (e.g., mastra_workflow, mastra_voice)';
COMMENT ON COLUMN ai_rate_limits.count IS 'Number of requests in current window';
COMMENT ON COLUMN ai_rate_limits.window_start IS 'Start of hourly rate limit window';
COMMENT ON FUNCTION check_and_increment_rate_limit IS 'Atomically checks rate limit and increments if not exceeded. Uses advisory locks for concurrency safety.';
COMMENT ON FUNCTION cleanup_expired_rate_limits IS 'Removes rate limit records older than 24 hours. Call periodically via cron.';
