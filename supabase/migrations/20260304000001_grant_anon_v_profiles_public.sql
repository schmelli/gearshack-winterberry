-- Migration: Grant anon role SELECT on v_profiles_public
-- Fix: Loadout share links return 404 for anonymous viewers
--
-- The v_profiles_public view (SECURITY DEFINER) was only granted to
-- `authenticated` role. Anonymous users visiting shared loadout links
-- could not fetch the owner's display name / avatar, causing the
-- PostgREST embedded-resource query to fail and the share page to 404.
--
-- This grant allows anonymous users to read the restricted public
-- profile columns (id, display_name, avatar_url, trail_name,
-- shakedown_helpful_received) — the same non-sensitive subset already
-- visible to authenticated users. No sensitive data is exposed.

-- GRANT is idempotent in PostgreSQL — safe to re-run without errors.
GRANT SELECT ON v_profiles_public TO anon;
