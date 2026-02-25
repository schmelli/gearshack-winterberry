-- Feature: Suspend/Resume for Human-in-the-Loop Actions
-- Replaces in-memory pending confirmation store with durable Supabase storage.
-- This fixes the multi-instance (serverless) bug where a confirm_action event
-- created on Vercel instance A could not be resolved by a resume request on instance B.

CREATE TABLE IF NOT EXISTS pending_confirmations (
  run_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suspended_step TEXT         NOT NULL DEFAULT 'confirmAdd',
  message        TEXT         NOT NULL,
  payload        JSONB        NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ  NOT NULL,
  status         TEXT         NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'cancelled', 'expired'))
);

-- Composite index for efficient user + status lookups
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user_status
  ON pending_confirmations (user_id, status);

-- Index for expiry-based cleanup queries
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_expires_at
  ON pending_confirmations (expires_at);

-- RLS is enabled but NO anon/authenticated policies are defined for this table.
-- This is intentional: ALL application code uses createServiceRoleClient() which
-- bypasses RLS entirely. Defining policies would be misleading — the security
-- boundary is the server-side authentication check in the resume API endpoint,
-- not Postgres row-level policies.
--
-- If you ever need to access this table from client-side code, add explicit policies
-- and remove the service role usage in pending-confirmations.ts.
COMMENT ON TABLE pending_confirmations IS
  'Service-role access only. No anon/authenticated RLS policies — intentional design.';
ALTER TABLE pending_confirmations ENABLE ROW LEVEL SECURITY;

-- Periodic cleanup: mark expired rows as 'expired'
-- Application code also checks expires_at on read, so no data leaks even
-- if cleanup lags. This just keeps the table tidy.
CREATE OR REPLACE FUNCTION cleanup_expired_pending_confirmations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pending_confirmations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  DELETE FROM pending_confirmations
  WHERE status IN ('approved', 'cancelled', 'expired')
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- TODO: Schedule periodic cleanup via pg_cron (requires pg_cron extension enabled in Supabase).
-- Run in Supabase SQL editor after enabling pg_cron:
--
--   SELECT cron.schedule(
--     'cleanup-pending-confirmations',
--     '*/15 * * * *',
--     'SELECT cleanup_expired_pending_confirmations()'
--   );
--
-- Without this, the table will accumulate expired rows (application reads still check
-- expires_at, so no data leaks — just table bloat). An alternative is a lightweight
-- Supabase Edge Function cron job.
