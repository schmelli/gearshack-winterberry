-- Migration: Fix SECURITY DEFINER views + Enable RLS on Mastra tables
-- Resolves 19 Supabase Database Linter warnings:
--   12 × "function_is_security_definer" (views bypass RLS)
--    7 × "rls_disabled" (Mastra tables exposed via PostgREST)
--
-- Note: spatial_ref_sys (PostGIS system table) is excluded — owned by
-- supabase_admin, cannot be altered via pooler connection. This is a
-- known Supabase linter false positive for PostGIS extension tables.
--
-- Strategy:
--   1. Add public-read policy on profiles (needed for JOIN in security_invoker views)
--   2. ALTER all 12 views to security_invoker = on
--   3. Enable RLS + service_role policy on Mastra tables

BEGIN;

-- ============================================================================
-- STEP 1: Add profiles public-read policy
-- ============================================================================
-- 8 of the 12 views JOIN on profiles for display_name/avatar_url.
-- Currently profiles only allows users to SELECT their own row.
-- With security_invoker, JOINs would fail for other users' profiles.
-- Display names and avatars are inherently public in a community app.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_public_read'
  ) THEN
    CREATE POLICY "profiles_public_read"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Switch 12 views from security_definer to security_invoker
-- ============================================================================
-- PostgreSQL 15+ security_invoker makes views execute with the calling user's
-- permissions, so RLS on underlying tables applies correctly.

-- Bulletin board views
ALTER VIEW public.v_bulletin_posts_with_author SET (security_invoker = on);
ALTER VIEW public.v_bulletin_replies_with_author SET (security_invoker = on);
ALTER VIEW public.v_bulletin_reports_for_mods SET (security_invoker = on);

-- Shakedown views
ALTER VIEW public.v_shakedowns_feed SET (security_invoker = on);
ALTER VIEW public.v_shakedown_feedback_with_author SET (security_invoker = on);

-- Marketplace view
ALTER VIEW public.v_marketplace_listings SET (security_invoker = on);

-- Merchant views
ALTER VIEW public.merchant_loadout_pricing SET (security_invoker = on);
ALTER VIEW public.ebay_feedback_patterns SET (security_invoker = on);

-- Contribution view
ALTER VIEW public.pending_contributions SET (security_invoker = on);

-- Community availability view
ALTER VIEW public.community_availability SET (security_invoker = on);

-- Analytics views (archived data)
ALTER VIEW public.tool_execution_stats SET (security_invoker = on);
ALTER VIEW public.web_search_usage_stats SET (security_invoker = on);

-- ============================================================================
-- STEP 3: Enable RLS + service_role policies on Mastra tables
-- ============================================================================
-- Mastra tables are auto-created by @mastra/pg using direct DATABASE_URL
-- (service_role credentials). They should NOT be accessible via PostgREST
-- anon/authenticated keys. Enable RLS and grant full access only to
-- service_role (which bypasses RLS by default, but explicit policy ensures
-- correct behavior).

ALTER TABLE public.mastra_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_scorers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_ai_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastra_workflow_snapshot ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS by default in Supabase, but we add explicit
-- policies for documentation and defense-in-depth.
CREATE POLICY "service_role_full_access" ON public.mastra_threads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access" ON public.mastra_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access" ON public.mastra_resources
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access" ON public.mastra_scorers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access" ON public.mastra_agents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access" ON public.mastra_ai_spans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access" ON public.mastra_workflow_snapshot
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
