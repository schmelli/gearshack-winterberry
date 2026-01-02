-- Migration: Remove 15-minute edit window restriction for bulletin posts
-- Date: 2026-01-02
-- Description: Allow authors to edit their posts anytime, not just within 15 minutes

-- ============================================================================
-- Update RLS Policy
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "bulletin_posts_update_own" ON bulletin_posts;

-- Recreate policy without time restriction
CREATE POLICY "bulletin_posts_update_own"
  ON bulletin_posts
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
  );

-- ============================================================================
-- Update Function
-- ============================================================================

-- Update can_edit_bulletin_post function to remove time check
CREATE OR REPLACE FUNCTION can_edit_bulletin_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID;
BEGIN
  SELECT author_id INTO v_author_id
  FROM bulletin_posts
  WHERE id = p_post_id AND is_deleted = false;

  IF v_author_id IS NULL THEN
    RETURN false; -- Post not found or deleted
  END IF;

  -- Must be author (no time restriction)
  RETURN v_author_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Update Comments
-- ============================================================================

COMMENT ON POLICY "bulletin_posts_update_own" ON bulletin_posts IS 'Edit own posts anytime';
COMMENT ON FUNCTION can_edit_bulletin_post IS 'Check if user can edit post (author check only)';
