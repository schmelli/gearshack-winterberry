-- Migration: Fix SECURITY DEFINER views + Enable RLS on Mastra tables
-- Resolves 18 of 19 Supabase Database Linter warnings:
--   11 × "function_is_security_definer" (views bypass RLS)
--    7 × "rls_disabled" (Mastra tables exposed via PostgREST)
--
-- Remaining linter warnings (acceptable):
--   1 × spatial_ref_sys (PostGIS system table, owned by supabase_admin — known false positive)
--   1 × v_profiles_public (intentional SECURITY DEFINER — only exposes non-sensitive columns)
--   1 × community_availability (intentional SECURITY DEFINER — aggregate-only, needs cross-user data)
--
-- Fixes applied based on PR #276 review feedback (Sentry, Claude, Codex, Gemini):
--   - CRITICAL: Added gear_items_marketplace_read policy (marketplace view was broken)
--   - CRITICAL: Added bulletin_reports_moderator_read policy (mod view was broken)
--   - CRITICAL: Replaced blanket profiles_public_read with restricted v_profiles_public view
--   - MEDIUM: Made Mastra policies idempotent with IF NOT EXISTS
--   - MEDIUM: Guarded Mastra ALTER TABLE with table existence checks
--   - INFO: community_availability kept as SECURITY DEFINER (needs cross-user gear data)
--   - INFO: Analytics views now correctly per-user scoped (admin uses service_role)
--
-- Strategy:
--   1. Create v_profiles_public restricted view (safe columns only)
--   2. Create is_moderator_or_admin() helper function
--   3. Add missing RLS policies (gear_items marketplace, bulletin_reports moderator)
--   4. Recreate community views to JOIN on v_profiles_public instead of profiles
--   5. Switch 11 views to security_invoker (community_availability excluded)
--   6. Enable RLS + service_role policy on Mastra tables (with existence guards)

BEGIN;

-- ============================================================================
-- STEP 1: Create v_profiles_public — restricted SECURITY DEFINER view
-- ============================================================================
-- Instead of a blanket profiles_public_read policy (which would expose email,
-- location coordinates, suspension metadata, and other sensitive fields),
-- we create a restricted view that only exposes non-sensitive columns
-- needed by community views (display_name, avatar_url, trail_name, reputation).
--
-- This view intentionally remains SECURITY DEFINER (PostgreSQL default)
-- so it can read all profiles regardless of RLS. Since it only projects
-- non-sensitive columns, the security surface is minimal and well-defined.
--
-- When security_invoker views reference this SECURITY DEFINER view,
-- PostgreSQL correctly applies the definer context for v_profiles_public
-- (reading all profiles) while enforcing the invoker context for all
-- other table accesses in the outer view.

CREATE OR REPLACE VIEW v_profiles_public AS
SELECT
  id,
  display_name,
  avatar_url,
  trail_name,
  shakedown_helpful_received
FROM profiles;

COMMENT ON VIEW v_profiles_public IS
  'Restricted public profile view — only non-sensitive columns. '
  'Intentionally SECURITY DEFINER: community views JOIN on this to get '
  'display names/avatars without requiring a blanket profiles read policy. '
  'Avoids exposing email, location, suspension data, and privacy settings.';

GRANT SELECT ON v_profiles_public TO authenticated;

-- ============================================================================
-- STEP 2: Create is_moderator_or_admin() helper function
-- ============================================================================
-- SECURITY DEFINER to bypass profiles RLS when checking role.
-- Used by moderator-specific RLS policies (e.g., bulletin_reports).
-- Pattern follows existing is_admin() function.

CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
$$;

COMMENT ON FUNCTION is_moderator_or_admin() IS
  'Security definer function to check if current user is moderator or admin, bypassing RLS. '
  'Used in RLS policies where role-based access is needed.';

-- ============================================================================
-- STEP 3: Add missing RLS policies
-- ============================================================================

-- 3a. gear_items: Allow authenticated users to see marketplace items
-- -------------------------------------------------------------------------
-- Without this policy, v_marketplace_listings (security_invoker) would
-- only return the calling user's own items, since gear_items RLS defaults
-- to owner-only access (gear_items_select_own). The marketplace requires
-- cross-user visibility for items marked for sale/trade/borrow.
-- (Fix for: Sentry critical review — marketplace broken after security_invoker)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gear_items' AND policyname = 'gear_items_marketplace_read'
  ) THEN
    CREATE POLICY "gear_items_marketplace_read"
      ON public.gear_items FOR SELECT
      TO authenticated
      USING (
        (is_for_sale = true OR can_be_traded = true OR can_be_borrowed = true)
        AND status = 'own'
      );
  END IF;
END $$;

-- 3b. bulletin_reports: Allow moderators/admins to read all reports
-- -------------------------------------------------------------------------
-- Without this policy, v_bulletin_reports_for_mods (security_invoker) would
-- only show reports filed by the current user (due to bulletin_reports_read_own
-- policy). Moderators need to see ALL pending reports for moderation.
-- (Fix for: Codex + Gemini P1 review — moderator reports view broken)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bulletin_reports' AND policyname = 'bulletin_reports_moderator_read'
  ) THEN
    CREATE POLICY "bulletin_reports_moderator_read"
      ON public.bulletin_reports FOR SELECT
      TO authenticated
      USING (is_moderator_or_admin());
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Recreate community views to JOIN on v_profiles_public
-- ============================================================================
-- These views previously joined directly on the profiles table. Now they
-- JOIN on v_profiles_public (which only exposes id, display_name, avatar_url,
-- trail_name, shakedown_helpful_received). This prevents the security_invoker
-- switch from requiring a blanket profiles_public_read policy.
--
-- Note: CREATE OR REPLACE VIEW preserves existing GRANTs but resets view
-- options. security_invoker is set in Step 5 after view recreation.

-- 4a. Bulletin posts with author
CREATE OR REPLACE VIEW v_bulletin_posts_with_author AS
SELECT
  p.id,
  p.author_id,
  p.content,
  p.tag,
  p.linked_content_type,
  p.linked_content_id,
  p.is_deleted,
  p.is_archived,
  p.reply_count,
  p.content_tsvector,
  p.created_at,
  p.updated_at,
  pr.display_name AS author_name,
  pr.avatar_url AS author_avatar
FROM bulletin_posts p
JOIN v_profiles_public pr ON p.author_id = pr.id
WHERE p.is_deleted = false;

-- 4b. Bulletin replies with author
CREATE OR REPLACE VIEW v_bulletin_replies_with_author AS
SELECT
  r.id,
  r.post_id,
  r.author_id,
  r.parent_reply_id,
  r.content,
  r.depth,
  r.is_deleted,
  r.created_at,
  r.updated_at,
  pr.display_name AS author_name,
  pr.avatar_url AS author_avatar
FROM bulletin_replies r
JOIN v_profiles_public pr ON r.author_id = pr.id
WHERE r.is_deleted = false;

-- 4c. Bulletin reports for moderators
-- Subqueries for target_author_name also use v_profiles_public.
-- Access controlled by bulletin_reports_moderator_read RLS policy (Step 3b).
CREATE OR REPLACE VIEW v_bulletin_reports_for_mods AS
SELECT
  r.id,
  r.target_type,
  r.target_id,
  r.reason,
  r.details,
  r.status,
  r.created_at,
  r.resolved_at,
  r.action_taken,
  COUNT(*) OVER (PARTITION BY r.target_type, r.target_id) AS report_count,
  reporter.display_name AS reporter_name,
  CASE
    WHEN r.target_type = 'post' THEN (
      SELECT substring(content, 1, 100)
      FROM bulletin_posts
      WHERE id = r.target_id
    )
    WHEN r.target_type = 'reply' THEN (
      SELECT substring(content, 1, 100)
      FROM bulletin_replies
      WHERE id = r.target_id
    )
  END AS target_content,
  CASE
    WHEN r.target_type = 'post' THEN (
      SELECT author_id FROM bulletin_posts WHERE id = r.target_id
    )
    WHEN r.target_type = 'reply' THEN (
      SELECT author_id FROM bulletin_replies WHERE id = r.target_id
    )
  END AS target_author_id,
  CASE
    WHEN r.target_type = 'post' THEN (
      SELECT p_author.display_name
      FROM bulletin_posts bp
      JOIN v_profiles_public p_author ON bp.author_id = p_author.id
      WHERE bp.id = r.target_id
    )
    WHEN r.target_type = 'reply' THEN (
      SELECT r_author.display_name
      FROM bulletin_replies br
      JOIN v_profiles_public r_author ON br.author_id = r_author.id
      WHERE br.id = r.target_id
    )
  END AS target_author_name
FROM bulletin_reports r
JOIN v_profiles_public reporter ON r.reporter_id = reporter.id
WHERE r.status = 'pending'
ORDER BY report_count DESC, r.created_at ASC;

-- 4d. Shakedowns feed with author
-- Note: total_weight_grams and item_count subqueries may return 0 for
-- shakedowns not owned by the calling user, since loadout_items and
-- gear_items RLS restricts to owner access. This is a known limitation;
-- denormalizing weight/count onto the shakedowns table would fix it.
CREATE OR REPLACE VIEW v_shakedowns_feed AS
SELECT
  s.id,
  s.owner_id,
  s.loadout_id,
  s.trip_name,
  s.trip_start_date,
  s.trip_end_date,
  s.experience_level,
  s.concerns,
  s.privacy,
  s.status,
  s.feedback_count,
  s.helpful_count,
  s.created_at,
  s.updated_at,
  p.display_name AS author_name,
  p.avatar_url AS author_avatar,
  p.shakedown_helpful_received AS author_reputation,
  l.name AS loadout_name,
  COALESCE((
    SELECT SUM(g.weight_grams * li.quantity)
    FROM loadout_items li
    JOIN gear_items g ON li.gear_item_id = g.id
    WHERE li.loadout_id = l.id
  ), 0)::INTEGER AS total_weight_grams,
  COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM loadout_items li
    WHERE li.loadout_id = l.id
  ), 0) AS item_count
FROM shakedowns s
JOIN v_profiles_public p ON s.owner_id = p.id
JOIN loadouts l ON s.loadout_id = l.id
WHERE s.is_hidden = false;

-- 4e. Shakedown feedback with author
CREATE OR REPLACE VIEW v_shakedown_feedback_with_author AS
SELECT
  f.id,
  f.shakedown_id,
  f.author_id,
  f.parent_id,
  f.gear_item_id,
  f.content,
  f.content_html,
  f.depth,
  f.helpful_count,
  f.is_hidden,
  f.is_edited,
  f.created_at,
  f.updated_at,
  p.display_name AS author_name,
  p.avatar_url AS author_avatar,
  p.shakedown_helpful_received AS author_reputation,
  g.name AS gear_item_name
FROM shakedown_feedback f
JOIN v_profiles_public p ON f.author_id = p.id
LEFT JOIN gear_items g ON f.gear_item_id = g.id
WHERE f.is_hidden = false;

-- 4f. Marketplace listings
CREATE OR REPLACE VIEW v_marketplace_listings AS
SELECT
  gi.id,
  gi.name,
  gi.brand,
  gi.primary_image_url,
  gi.condition,
  gi.price_paid,
  gi.currency,
  gi.is_for_sale,
  gi.can_be_traded,
  gi.can_be_borrowed,
  gi.created_at AS listed_at,
  gi.user_id AS seller_id,
  p.display_name AS seller_name,
  p.avatar_url AS seller_avatar
FROM gear_items gi
JOIN v_profiles_public p ON gi.user_id = p.id
WHERE
  (gi.is_for_sale = true OR gi.can_be_traded = true OR gi.can_be_borrowed = true)
  AND gi.status = 'own';

-- ============================================================================
-- STEP 5: Switch 11 views to security_invoker
-- ============================================================================
-- PostgreSQL 15+ security_invoker makes views execute with the calling user's
-- permissions, so RLS on underlying tables applies correctly via PostgREST.
--
-- EXCLUDED from security_invoker (intentionally remain SECURITY DEFINER):
--   - v_profiles_public: Needs to bypass profiles RLS (only exposes safe columns)
--   - community_availability: Needs cross-user gear_items access for aggregate
--     stats (user_count, min/max/avg price). Only returns aggregate data, no PII.

-- Bulletin board views
ALTER VIEW public.v_bulletin_posts_with_author SET (security_invoker = on);
ALTER VIEW public.v_bulletin_replies_with_author SET (security_invoker = on);
ALTER VIEW public.v_bulletin_reports_for_mods SET (security_invoker = on);

-- Shakedown views
ALTER VIEW public.v_shakedowns_feed SET (security_invoker = on);
ALTER VIEW public.v_shakedown_feedback_with_author SET (security_invoker = on);

-- Marketplace view
ALTER VIEW public.v_marketplace_listings SET (security_invoker = on);

-- Merchant views (no profile JOINs, definitions unchanged)
ALTER VIEW public.merchant_loadout_pricing SET (security_invoker = on);
ALTER VIEW public.ebay_feedback_patterns SET (security_invoker = on);

-- Contribution view (underlying user_contributions has admin-only RLS)
ALTER VIEW public.pending_contributions SET (security_invoker = on);

-- Analytics views (now correctly per-user scoped via underlying table RLS;
-- admin dashboards should use service_role which bypasses RLS)
ALTER VIEW public.tool_execution_stats SET (security_invoker = on);
ALTER VIEW public.web_search_usage_stats SET (security_invoker = on);

-- NOTE: community_availability is intentionally NOT switched to security_invoker.
-- It performs a cross-user self-join on gear_items to compute aggregate stats
-- (how many users own this item, price range). With security_invoker, the inner
-- join would return 0 rows due to owner-only RLS on gear_items. The view only
-- exposes item name and aggregate data (count, min/max/avg price) — no PII.

-- ============================================================================
-- STEP 6: Enable RLS + service_role policies on Mastra tables
-- ============================================================================
-- Mastra tables are auto-created by @mastra/pg using direct DATABASE_URL
-- (service_role credentials). They should NOT be accessible via PostgREST
-- anon/authenticated keys. Enable RLS and grant full access only to
-- service_role (which bypasses RLS by default, but explicit policy ensures
-- correct behavior).
--
-- Wrapped in existence checks since Mastra tables may not exist in fresh
-- environments where the app hasn't initialized yet.
-- Policy creation guarded with IF NOT EXISTS for idempotency.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'mastra_threads',
    'mastra_messages',
    'mastra_resources',
    'mastra_scorers',
    'mastra_agents',
    'mastra_ai_spans',
    'mastra_workflow_snapshot'
  ])
  LOOP
    -- Only alter if table exists (tables are auto-created by @mastra/pg at runtime)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- Create policy only if it doesn't exist (idempotent)
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = t AND policyname = 'service_role_full_access'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "service_role_full_access" ON public.%I '
          'FOR ALL TO service_role USING (true) WITH CHECK (true)',
          t
        );
      END IF;
    END IF;
  END LOOP;
END $$;

COMMIT;
