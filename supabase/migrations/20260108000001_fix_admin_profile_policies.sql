-- ============================================================================
-- Migration: Fix Admin Profile RLS Policies
-- Issue: Circular RLS reference causing profile read failures
--
-- The original admin policies queried the profiles table in their USING clause,
-- which can cause RLS evaluation issues. This migration fixes that by:
-- 1. Dropping the problematic admin policies on profiles
-- 2. The existing profiles_select_own policy handles normal profile access
-- 3. Admin functionality will use service role or security definer functions
-- ============================================================================

-- Drop the problematic admin policies on profiles
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update_any" ON profiles;

-- ============================================================================
-- Create a security definer function for admin profile access
-- This bypasses RLS safely for admin operations
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION is_admin() IS 'Security definer function to check if current user is admin, bypassing RLS';

-- ============================================================================
-- Recreate admin policies using the security definer function
-- ============================================================================

-- Admins can SELECT all profiles (using security definer function)
CREATE POLICY "profiles_admin_select_all" ON profiles
    FOR SELECT USING (is_admin());

-- Admins can UPDATE any profile (using security definer function)
CREATE POLICY "profiles_admin_update_any" ON profiles
    FOR UPDATE USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON POLICY "profiles_admin_select_all" ON profiles IS 'Admins can view all user profiles (uses security definer)';
COMMENT ON POLICY "profiles_admin_update_any" ON profiles IS 'Admins can modify any user profile (uses security definer)';
