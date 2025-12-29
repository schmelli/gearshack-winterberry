-- Migration: Shakedown Archival Cron Job
-- Feature: 001-community-shakedowns
-- Task: T056
-- Date: 2025-12-29
-- Description: Schedules nightly 90-day automatic archival for completed shakedowns

-- ============================================================================
-- ARCHIVAL FUNCTION
-- ============================================================================

-- Archive shakedowns that have been completed for over 90 days.
-- This function is designed to be called by pg_cron or a Supabase Edge Function.
-- Returns the count of archived shakedowns for logging purposes.

CREATE OR REPLACE FUNCTION archive_old_shakedowns()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Archive completed shakedowns older than 90 days
  UPDATE shakedowns
  SET
    status = 'archived',
    archived_at = NOW(),
    updated_at = NOW()
  WHERE
    status = 'completed'
    AND completed_at < NOW() - INTERVAL '90 days'
    AND archived_at IS NULL;

  -- Get the count of affected rows
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- ============================================================================
-- PERFORMANCE INDEX
-- ============================================================================

-- Index for efficient archival queries
-- Targets completed shakedowns that haven't been archived yet
CREATE INDEX IF NOT EXISTS idx_shakedowns_archival_candidates
ON shakedowns (completed_at)
WHERE status = 'completed' AND archived_at IS NULL;

-- ============================================================================
-- PG_CRON SETUP (OPTIONAL)
-- ============================================================================

-- Note: pg_cron requires the extension to be enabled in Supabase.
-- This is typically done via the Supabase Dashboard: Database > Extensions > pg_cron
-- or by running: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily archival at 3:15 AM UTC (offset from bulletin archival at 3:00 AM)
-- If pg_cron is available, uncomment the following:
--
-- SELECT cron.schedule(
--   'archive-old-shakedowns',
--   '15 3 * * *',  -- Every day at 3:15 AM UTC
--   $$SELECT archive_old_shakedowns()$$
-- );

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To unschedule the cron job (if pg_cron is enabled):
-- SELECT cron.unschedule('archive-old-shakedowns');

-- To remove the archival function:
-- DROP FUNCTION IF EXISTS archive_old_shakedowns();

-- To remove the index:
-- DROP INDEX IF EXISTS idx_shakedowns_archival_candidates;

-- ============================================================================
-- ALTERNATIVE: SUPABASE EDGE FUNCTION
-- ============================================================================

-- If pg_cron is not available, create a Supabase Edge Function:
--
-- // supabase/functions/archive-shakedowns/index.ts
-- import { createClient } from '@supabase/supabase-js';
--
-- const supabase = createClient(
--   Deno.env.get('SUPABASE_URL')!,
--   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
-- );
--
-- Deno.serve(async () => {
--   const { data, error } = await supabase.rpc('archive_old_shakedowns');
--
--   if (error) {
--     console.error('Archival failed:', error);
--     return new Response(JSON.stringify({ error: error.message }), { status: 500 });
--   }
--
--   console.log(`Archived ${data} shakedowns`);
--   return new Response(JSON.stringify({ archived_count: data }));
-- });
--
-- Configure Supabase Scheduled Functions to call this at 3:15 AM UTC daily.

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION archive_old_shakedowns IS
  'Nightly job to auto-archive completed shakedowns older than 90 days. '
  'Archived shakedowns remain accessible via direct links but are excluded from feeds. '
  'Returns the count of archived shakedowns for logging.';

COMMENT ON INDEX idx_shakedowns_archival_candidates IS
  'Partial index for efficient identification of archival candidates';
