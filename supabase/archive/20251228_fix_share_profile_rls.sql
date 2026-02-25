-- Migration: Fix profiles RLS for anonymous shared loadout viewing
-- Issue: Anonymous users cannot view shared loadouts because the profiles table
-- blocks reads when JOINed from loadout_shares.getSharedLoadoutWithOwner()
--
-- Solution: Add a permissive policy that allows reading profile data for users
-- who own at least one shared loadout.

-- Allow anonymous users to read profile data for share owners
-- This enables the JOIN in getSharedLoadoutWithOwner to succeed for anonymous visitors
CREATE POLICY "profiles_select_share_owner"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT owner_id FROM loadout_shares WHERE owner_id IS NOT NULL)
  );

-- Add a comment explaining the policy
COMMENT ON POLICY "profiles_select_share_owner" ON profiles IS
  'Allow anyone to read profile data for users who have created shared loadouts. Required for anonymous visitors to view shared loadout pages.';
