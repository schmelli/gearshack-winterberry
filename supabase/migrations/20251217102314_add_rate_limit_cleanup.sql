/**
 * Rate Limit Cleanup Cron Job
 * Feature 050: AI Assistant - Maintenance
 *
 * Adds scheduled cleanup of old rate limit records to prevent
 * unbounded table growth. Removes records older than 7 days.
 *
 * Uses pg_cron extension for scheduling (runs daily at 2:00 AM UTC).
 */

-- Enable pg_cron extension (if not already enabled)
-- Note: This requires superuser privileges and may already be enabled in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_rate_limits
  WHERE window_start < now() - interval '7 days'
    AND (last_message_at IS NULL OR last_message_at < now() - interval '7 days');

  -- Log cleanup for monitoring
  RAISE NOTICE 'Cleaned up old rate limit records';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run daily at 2:00 AM UTC
-- Note: pg_cron.schedule requires superuser privileges
-- If this fails in Supabase, you can schedule via Supabase dashboard instead
DO $$
BEGIN
  PERFORM cron.schedule(
    'cleanup-rate-limits',           -- job name
    '0 2 * * *',                     -- cron schedule (2 AM daily)
    $$SELECT cleanup_old_rate_limits()$$
  );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron scheduling requires superuser. Please schedule via Supabase dashboard.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %. Please schedule manually.', SQLERRM;
END;
$$;

-- Alternative: If pg_cron is not available, you can run this manually or via API
COMMENT ON FUNCTION cleanup_old_rate_limits() IS
  'Cleans up rate limit records older than 7 days. Run daily via cron or API.';
