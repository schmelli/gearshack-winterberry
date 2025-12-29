-- Migration: Bulletin Board Archival Cron Job
-- Feature: 051-community-bulletin-board
-- Task: T075
-- Date: 2025-12-29
-- Description: Schedules nightly 90-day soft archival for bulletin posts

-- ==================== CRON JOB SETUP ====================

-- Note: This requires the pg_cron extension to be enabled in Supabase
-- Enable the extension (run once manually in Supabase SQL Editor if not already enabled):
--   CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3 AM UTC (offset from other jobs)
-- If pg_cron is available, uncomment the following:
--
-- SELECT cron.schedule(
--   'archive-old-bulletin-posts',
--   '0 3 * * *',  -- Every day at 3 AM UTC
--   $$SELECT archive_old_bulletin_posts()$$
-- );

-- ==================== ALTERNATIVE: SUPABASE EDGE FUNCTION ====================

-- If pg_cron is not available, create a Supabase Edge Function:
--
-- import { createClient } from '@supabase/supabase-js';
--
-- const supabase = createClient(
--   Deno.env.get('SUPABASE_URL')!,
--   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
-- );
--
-- Deno.serve(async () => {
--   const { data, error } = await supabase.rpc('archive_old_bulletin_posts');
--   return new Response(JSON.stringify({ archived: data, error }));
-- });
--
-- Configure Supabase Scheduled Functions to call this at 3 AM UTC daily.

-- ==================== COMMENTS ====================

COMMENT ON FUNCTION archive_old_bulletin_posts IS 'Nightly job to soft-archive bulletin posts older than 90 days. Archived posts are excluded from main feed but remain accessible via direct links.';
