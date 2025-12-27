-- Migration: Daily Rate Limit Tracking
-- Feature: XXX-smart-product-search
-- Created: 2025-12-27
-- Description: Creates rate_limit_tracking table for daily rate limiting
--              (separate from ai_rate_limits which uses hourly windows)

-- ==================== TABLE CREATION ====================

CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint prevents duplicate records per user/operation/window
  UNIQUE(user_id, operation_type, window_start)
);

-- ==================== INDEXES ====================

-- Index for efficient lookups by user and operation
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_op
  ON rate_limit_tracking(user_id, operation_type, window_start DESC);

-- Index for cleanup (expired windows)
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_cleanup
  ON rate_limit_tracking(window_start)
  WHERE window_start < now() - INTERVAL '7 days';

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only view their own rate limits
CREATE POLICY "Users can view own rate limits"
  ON rate_limit_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (for server-side operations)
CREATE POLICY "Service role full access on rate_limit_tracking"
  ON rate_limit_tracking
  FOR ALL
  TO service_role
  USING (true);

-- ==================== ATOMIC CHECK AND INCREMENT FUNCTION ====================

-- Function: Atomically check daily rate limit and increment if allowed
-- Uses advisory locks to prevent race conditions between check and update
CREATE OR REPLACE FUNCTION check_and_increment_daily_rate_limit(
  p_user_id UUID,
  p_operation_type TEXT,
  p_limit INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
  v_current_count INTEGER;
  v_lock_key BIGINT;
  v_exceeded BOOLEAN;
BEGIN
  -- Calculate current day start (UTC)
  v_day_start := date_trunc('day', now() AT TIME ZONE 'UTC');
  v_day_end := v_day_start + INTERVAL '1 day';

  -- Create a unique lock key from user_id and operation
  v_lock_key := hashtext(p_user_id::TEXT || ':daily:' || p_operation_type);

  -- Acquire advisory lock (transaction-scoped, automatically released on commit/rollback)
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Get current count for today's window
  SELECT request_count INTO v_current_count
  FROM rate_limit_tracking
  WHERE user_id = p_user_id
    AND operation_type = p_operation_type
    AND window_start = v_day_start;

  -- If no record exists, create one with count = 1
  IF v_current_count IS NULL THEN
    INSERT INTO rate_limit_tracking (user_id, operation_type, request_count, window_start, last_request_at)
    VALUES (p_user_id, p_operation_type, 1, v_day_start, now());

    RETURN json_build_object(
      'exceeded', false,
      'count', 1,
      'limit', p_limit,
      'remaining', p_limit - 1,
      'resets_at', v_day_end
    );
  END IF;

  -- Check if limit would be exceeded
  IF v_current_count >= p_limit THEN
    RETURN json_build_object(
      'exceeded', true,
      'count', v_current_count,
      'limit', p_limit,
      'remaining', 0,
      'resets_at', v_day_end
    );
  END IF;

  -- Increment the counter atomically
  UPDATE rate_limit_tracking
  SET request_count = request_count + 1,
      last_request_at = now()
  WHERE user_id = p_user_id
    AND operation_type = p_operation_type
    AND window_start = v_day_start;

  v_current_count := v_current_count + 1;

  RETURN json_build_object(
    'exceeded', false,
    'count', v_current_count,
    'limit', p_limit,
    'remaining', p_limit - v_current_count,
    'resets_at', v_day_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== GET RATE LIMIT STATUS FUNCTION ====================

-- Function: Get current rate limit status without incrementing
CREATE OR REPLACE FUNCTION get_daily_rate_limit_status(
  p_user_id UUID,
  p_operation_type TEXT,
  p_limit INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_day_start := date_trunc('day', now() AT TIME ZONE 'UTC');
  v_day_end := v_day_start + INTERVAL '1 day';

  SELECT request_count INTO v_current_count
  FROM rate_limit_tracking
  WHERE user_id = p_user_id
    AND operation_type = p_operation_type
    AND window_start = v_day_start;

  v_current_count := COALESCE(v_current_count, 0);

  RETURN json_build_object(
    'exceeded', v_current_count >= p_limit,
    'count', v_current_count,
    'limit', p_limit,
    'remaining', GREATEST(0, p_limit - v_current_count),
    'resets_at', v_day_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== CLEANUP FUNCTION ====================

-- Function: Clean up rate limit records older than 7 days
CREATE OR REPLACE FUNCTION cleanup_daily_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_tracking
  WHERE window_start < now() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== COMMENTS ====================

COMMENT ON TABLE rate_limit_tracking IS 'Daily rate limit tracking for various operations (e.g., product_search, weight_search)';
COMMENT ON COLUMN rate_limit_tracking.operation_type IS 'Type of operation being rate limited (e.g., product_search)';
COMMENT ON COLUMN rate_limit_tracking.request_count IS 'Number of requests in current daily window';
COMMENT ON COLUMN rate_limit_tracking.window_start IS 'Start of daily rate limit window (UTC day start)';
COMMENT ON FUNCTION check_and_increment_daily_rate_limit IS 'Atomically checks and increments daily rate limit. Uses advisory locks for concurrency safety.';
COMMENT ON FUNCTION get_daily_rate_limit_status IS 'Gets current rate limit status without incrementing the counter.';
COMMENT ON FUNCTION cleanup_daily_rate_limits IS 'Removes rate limit records older than 7 days. Should be called via cron.';
