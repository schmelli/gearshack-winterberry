-- ============================================================================
-- Migration: VIP Loadouts Admin RLS Policies
-- Feature: 052-vip-loadouts
--
-- Adds RLS policies for admin to manage VIP loadouts in the regular loadouts table.
-- This enables admin to create loadouts on behalf of VIP users.
-- ============================================================================

-- ============================================================================
-- Enable RLS on loadouts table (if not already enabled)
-- ============================================================================

DO $$
BEGIN
  -- Check if RLS is already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'loadouts'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE loadouts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- Admin Policies for Loadouts
-- ============================================================================

-- Drop existing admin policy if it exists (for idempotency)
DROP POLICY IF EXISTS "loadouts_admin_all" ON loadouts;

-- Admins can manage all loadouts (create, read, update, delete)
-- This enables admin to create VIP loadouts for VIP users
CREATE POLICY "loadouts_admin_all" ON loadouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Public Read Policy for VIP Loadouts
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "loadouts_vip_public_read" ON loadouts;

-- Public can view VIP loadouts (is_vip_loadout = true)
CREATE POLICY "loadouts_vip_public_read" ON loadouts
  FOR SELECT
  USING (is_vip_loadout = true);

-- ============================================================================
-- Owner Policies (existing users managing their own loadouts)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "loadouts_owner_select" ON loadouts;
DROP POLICY IF EXISTS "loadouts_owner_insert" ON loadouts;
DROP POLICY IF EXISTS "loadouts_owner_update" ON loadouts;
DROP POLICY IF EXISTS "loadouts_owner_delete" ON loadouts;

-- Users can view their own loadouts
CREATE POLICY "loadouts_owner_select" ON loadouts
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own loadouts
CREATE POLICY "loadouts_owner_insert" ON loadouts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own loadouts
CREATE POLICY "loadouts_owner_update" ON loadouts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own loadouts
CREATE POLICY "loadouts_owner_delete" ON loadouts
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "loadouts_admin_all" ON loadouts IS
  'Admins can manage all loadouts, including VIP loadouts for other users';

COMMENT ON POLICY "loadouts_vip_public_read" ON loadouts IS
  'Public can view VIP published loadouts (is_vip_loadout = true)';

COMMENT ON POLICY "loadouts_owner_select" ON loadouts IS
  'Users can view their own loadouts';

COMMENT ON POLICY "loadouts_owner_insert" ON loadouts IS
  'Users can create loadouts for themselves';

COMMENT ON POLICY "loadouts_owner_update" ON loadouts IS
  'Users can update their own loadouts';

COMMENT ON POLICY "loadouts_owner_delete" ON loadouts IS
  'Users can delete their own loadouts';
