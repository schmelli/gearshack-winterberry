-- Migration: Rate Limit Tracking for Mastra Agentic Voice AI
-- Feature: 001-mastra-agentic-voice
-- Created: 2025-01-25
-- Description: Creates the rate_limit_tracking table for tiered rate limiting (simple/workflow/voice)

-- ==================== TABLE CREATION ====================

CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rate limit dimensions
  operation_type TEXT NOT NULL CHECK (operation_type IN ('simple_query', 'workflow', 'voice')),
  request_count INTEGER NOT NULL DEFAULT 0,

  -- Time window
  window_start TIMESTAMPTZ NOT NULL,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, operation_type, window_start)
);

-- ==================== INDEXES ====================

-- Performance index for user/window queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_window
  ON rate_limit_tracking(user_id, window_start DESC);

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS to ensure multi-tenancy
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own rate limits
CREATE POLICY "Users can only access own rate limits"
  ON rate_limit_tracking
  FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role full access"
  ON rate_limit_tracking
  FOR ALL
  TO service_role
  USING (true);

-- ==================== HELPER FUNCTIONS ====================

-- Function: Check if user has exceeded rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_operation_type TEXT,
  p_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_request_count INTEGER;
BEGIN
  -- Calculate current window start (hourly window)
  v_window_start := date_trunc('hour', now());

  -- Get current request count for this window
  SELECT request_count INTO v_request_count
  FROM rate_limit_tracking
  WHERE user_id = p_user_id
    AND operation_type = p_operation_type
    AND window_start = v_window_start;

  -- If no record exists or count is below limit, allow request
  IF v_request_count IS NULL OR v_request_count < p_limit THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID,
  p_operation_type TEXT
)
RETURNS VOID AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Calculate current window start (hourly window)
  v_window_start := date_trunc('hour', now());

  -- Insert or update rate limit record
  INSERT INTO rate_limit_tracking (user_id, operation_type, window_start, request_count, last_request_at)
  VALUES (p_user_id, p_operation_type, v_window_start, 1, now())
  ON CONFLICT (user_id, operation_type, window_start)
  DO UPDATE SET
    request_count = rate_limit_tracking.request_count + 1,
    last_request_at = now();
END;
$$ LANGUAGE plpgsql;

-- ==================== COMMENTS ====================

COMMENT ON TABLE rate_limit_tracking IS 'Implements tiered rate limiting: unlimited simple queries, 20 workflows/hour, 40 voice/hour';
COMMENT ON COLUMN rate_limit_tracking.operation_type IS 'Type of operation: simple_query (unlimited), workflow (20/hr), voice (40/hr)';
COMMENT ON COLUMN rate_limit_tracking.window_start IS 'Start of hourly rate limit window';
COMMENT ON FUNCTION check_rate_limit IS 'Returns TRUE if user has not exceeded rate limit for operation type';
COMMENT ON FUNCTION increment_rate_limit IS 'Increments rate limit counter for user and operation type';
