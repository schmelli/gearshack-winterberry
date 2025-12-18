-- =====================================================
-- Admin Role and Category Sort Order Migration
-- Feature: Admin Panel with Category Management
-- =====================================================

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Add role column to profiles table
ALTER TABLE profiles
  ADD COLUMN role user_role DEFAULT 'user' NOT NULL;

-- Add sort_order to categories table
ALTER TABLE categories
  ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL;

-- Populate sort_order based on alphabetical order within each parent
WITH ordered_cats AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY parent_id, level
      ORDER BY label ASC
    ) AS new_order
  FROM categories
)
UPDATE categories c
SET sort_order = oc.new_order
FROM ordered_cats oc
WHERE c.id = oc.id;

-- Create helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Update RLS policies for categories table
-- DROP existing policies if any
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Create new policies
-- Allow SELECT for authenticated users (existing behavior)
CREATE POLICY "categories_select_policy"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Restrict INSERT to admins only
CREATE POLICY "categories_insert_policy"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Restrict UPDATE to admins only
CREATE POLICY "categories_update_policy"
  ON categories FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Restrict DELETE to admins only
CREATE POLICY "categories_delete_policy"
  ON categories FOR DELETE
  TO authenticated
  USING (is_admin());

-- Index for sort_order queries
CREATE INDEX idx_categories_sort_order
  ON categories(parent_id, level, sort_order);

-- Add column comments for documentation
COMMENT ON COLUMN profiles.role IS 'User role: user (default) or admin';
COMMENT ON COLUMN categories.sort_order IS 'Display order within parent category';
