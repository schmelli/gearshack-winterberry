-- Migration: Cleanup Old Friend Requests
-- Feature: 001-social-graph
-- Issue: Declined/expired friend requests accumulate forever
-- Fix: Add cleanup function and trigger
-- Date: 2025-12-28

-- =============================================================================
-- FUNCTION: cleanup_old_friend_requests
-- Deletes declined/expired friend requests older than 30 days
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_friend_requests()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete declined requests older than 30 days
  WITH deleted AS (
    DELETE FROM friend_requests
    WHERE status = 'declined'
      AND responded_at IS NOT NULL
      AND responded_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  -- Also delete expired requests (past expires_at)
  WITH deleted_expired AS (
    DELETE FROM friend_requests
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT v_deleted_count + COUNT(*) INTO v_deleted_count FROM deleted_expired;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: cleanup_old_friend_requests_trigger
-- Automatically runs cleanup periodically via pg_cron or can be called manually
-- =============================================================================

-- Note: This function can be called manually or via a scheduled job
-- To set up automatic cleanup with pg_cron (requires superuser):
-- SELECT cron.schedule('cleanup-friend-requests', '0 2 * * *', 'SELECT cleanup_old_friend_requests();');

-- Alternative: You can call this manually or via an edge function on a schedule
-- Example manual call: SELECT cleanup_old_friend_requests();

-- =============================================================================
-- INDEX: Speed up cleanup queries
-- =============================================================================

-- Add index on responded_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_friend_requests_responded_at
  ON friend_requests(status, responded_at)
  WHERE status = 'declined' AND responded_at IS NOT NULL;

-- Add index on expires_at for efficient expiry checks
CREATE INDEX IF NOT EXISTS idx_friend_requests_expires_at
  ON friend_requests(status, expires_at)
  WHERE status = 'pending' AND expires_at IS NOT NULL;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION cleanup_old_friend_requests IS 'Deletes declined requests older than 30 days and expired pending requests. Returns count of deleted records.';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Allow authenticated users to call cleanup function (optional - can restrict to admin)
GRANT EXECUTE ON FUNCTION cleanup_old_friend_requests() TO authenticated;
