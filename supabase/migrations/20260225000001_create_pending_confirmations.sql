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

-- RLS is enabled; only service role key is used for this table
-- (all application code uses createServiceRoleClient which bypasses RLS)
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
