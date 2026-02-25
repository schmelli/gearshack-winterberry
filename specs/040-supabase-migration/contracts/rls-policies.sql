-- ============================================================================
-- Row Level Security Policies for Gearshack Winterberry
-- Feature: 040-supabase-migration
-- Date: 2025-12-10
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profiles are created via trigger, no direct insert policy needed

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================

-- Categories are system-defined, public read for all authenticated users
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_authenticated"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- No insert/update/delete policies - admin only via service role

-- ============================================================================
-- GEAR ITEMS TABLE
-- ============================================================================

ALTER TABLE gear_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own items
CREATE POLICY "gear_items_select_own"
  ON gear_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert items for themselves
CREATE POLICY "gear_items_insert_own"
  ON gear_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own items
CREATE POLICY "gear_items_update_own"
  ON gear_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own items
CREATE POLICY "gear_items_delete_own"
  ON gear_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LOADOUTS TABLE
-- ============================================================================

ALTER TABLE loadouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own loadouts
CREATE POLICY "loadouts_select_own"
  ON loadouts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert loadouts for themselves
CREATE POLICY "loadouts_insert_own"
  ON loadouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own loadouts
CREATE POLICY "loadouts_update_own"
  ON loadouts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own loadouts
CREATE POLICY "loadouts_delete_own"
  ON loadouts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LOADOUT ITEMS TABLE (Junction)
-- ============================================================================

ALTER TABLE loadout_items ENABLE ROW LEVEL SECURITY;

-- Users can view loadout items for their own loadouts
CREATE POLICY "loadout_items_select_own"
  ON loadout_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

-- Users can insert items into their own loadouts
CREATE POLICY "loadout_items_insert_own"
  ON loadout_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

-- Users can update items in their own loadouts
CREATE POLICY "loadout_items_update_own"
  ON loadout_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

-- Users can delete items from their own loadouts
CREATE POLICY "loadout_items_delete_own"
  ON loadout_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loadouts
      WHERE loadouts.id = loadout_items.loadout_id
      AND loadouts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SECURITY TEST QUERIES
-- ============================================================================

-- Test 1: Verify user cannot see other users' items
-- Run as user A, should return 0 rows for user B's items
-- SELECT * FROM gear_items WHERE user_id = '<user_b_id>';

-- Test 2: Verify user cannot insert items for other users
-- Run as user A, should fail
-- INSERT INTO gear_items (user_id, name) VALUES ('<user_b_id>', 'Test');

-- Test 3: Verify unauthenticated requests are rejected
-- Run without auth header, should return 0 rows
-- SELECT * FROM gear_items;
