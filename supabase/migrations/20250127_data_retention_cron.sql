-- Migration: Data Retention Cron for Mastra Agentic Voice AI
-- Feature: 001-mastra-agentic-voice
-- Created: 2025-01-27
-- Description: Implements 90-day automatic data retention for conversation memory

-- ==================== HELPER FUNCTIONS ====================

-- Function: Delete conversation memory older than retention period
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_memory()
RETURNS INTEGER AS $$
DECLARE
  v_retention_days INTEGER := 90;
  v_cutoff_date TIMESTAMPTZ;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date
  v_cutoff_date := now() - (v_retention_days || ' days')::INTERVAL;

  -- Delete expired conversations
  DELETE FROM conversation_memory
  WHERE created_at < v_cutoff_date;

  -- Get count of deleted records
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Log the cleanup operation
  RAISE NOTICE 'Deleted % expired conversation records older than % (cutoff: %)',
    v_deleted_count, v_retention_days, v_cutoff_date;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== CRON JOB SETUP ====================

-- Note: This requires the pg_cron extension to be enabled in Supabase
-- Enable the extension (run once manually in Supabase SQL Editor if not already enabled):
--   CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM UTC
-- If pg_cron is available, uncomment the following:
--
-- SELECT cron.schedule(
--   'cleanup-expired-conversation-memory',
--   '0 2 * * *',  -- Every day at 2 AM UTC
--   $$SELECT cleanup_expired_conversation_memory()$$
-- );

-- ==================== ALTERNATIVE: SUPABASE EDGE FUNCTION ====================

-- If pg_cron is not available, create a Supabase Edge Function that calls this:
--
-- import { createClient } from '@supabase/supabase-js';
--
-- const supabase = createClient(
--   Deno.env.get('SUPABASE_URL')!,
--   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
-- );
--
-- Deno.serve(async () => {
--   const { data, error } = await supabase.rpc('cleanup_expired_conversation_memory');
--   return new Response(JSON.stringify({ deleted: data, error }));
-- });

-- ==================== COMMENTS ====================

COMMENT ON FUNCTION cleanup_expired_conversation_memory IS 'Deletes conversation memory records older than 90 days (GDPR retention compliance)';
