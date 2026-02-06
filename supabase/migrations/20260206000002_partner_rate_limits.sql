-- ============================================================================
-- Migration: Partner Rate Limiting via Supabase
-- Feature: Code Quality Review - Production Hardening
--
-- Replaces in-memory rate limiting with database-backed sliding window.
-- ============================================================================

-- Table to track partner API request counts
CREATE TABLE IF NOT EXISTS partner_rate_limits (
  partner_id UUID NOT NULL REFERENCES partner_retailers(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (partner_id, window_start)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_partner_rate_limits_window
  ON partner_rate_limits (partner_id, window_start DESC);

-- RPC function for atomic rate limit check-and-increment
CREATE OR REPLACE FUNCTION check_partner_rate_limit(
  p_partner_id UUID,
  p_max_requests INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 3600
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_window_start := date_trunc('hour', NOW());

  -- Clean up old entries (older than 2 windows)
  DELETE FROM partner_rate_limits
  WHERE partner_id = p_partner_id
    AND window_start < NOW() - (p_window_seconds * 2 || ' seconds')::INTERVAL;

  -- Try to increment existing window
  UPDATE partner_rate_limits
  SET request_count = request_count + 1
  WHERE partner_id = p_partner_id
    AND window_start = v_window_start
  RETURNING request_count INTO v_current_count;

  -- If no row exists, create one
  IF v_current_count IS NULL THEN
    INSERT INTO partner_rate_limits (partner_id, window_start, request_count)
    VALUES (p_partner_id, v_window_start, 1)
    ON CONFLICT (partner_id, window_start)
    DO UPDATE SET request_count = partner_rate_limits.request_count + 1
    RETURNING request_count INTO v_current_count;
  END IF;

  -- Return true if within limit
  RETURN v_current_count <= p_max_requests;
END;
$$;

-- Enable RLS
ALTER TABLE partner_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access (API routes use service role)
CREATE POLICY "service_role_only" ON partner_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');
