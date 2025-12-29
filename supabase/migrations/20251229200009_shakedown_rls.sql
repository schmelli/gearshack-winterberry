-- Migration: Create shakedown RLS policies
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

-- ============================================================================
-- Enable RLS on all shakedown tables
-- ============================================================================

ALTER TABLE shakedowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE shakedown_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE shakedown_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shakedown_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shakedown_badges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- shakedowns policies
-- ============================================================================

-- Read: Respect privacy settings
CREATE POLICY "shakedowns_select" ON shakedowns FOR SELECT TO authenticated
USING (
  is_hidden = false
  AND (
    -- Public shakedowns visible to all
    privacy = 'public'
    -- Owner always sees their own
    OR owner_id = auth.uid()
    -- Friends can see friends_only shakedowns
    OR (privacy = 'friends_only' AND are_friends(owner_id, auth.uid()))
  )
);

-- Insert: Authenticated users can create their own
CREATE POLICY "shakedowns_insert" ON shakedowns FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Update: Owner only
CREATE POLICY "shakedowns_update" ON shakedowns FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Delete: Owner only (prefer soft-delete via update)
CREATE POLICY "shakedowns_delete" ON shakedowns FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- ============================================================================
-- shakedown_feedback policies
-- ============================================================================

-- Read: Anyone can read visible feedback on accessible shakedowns
CREATE POLICY "feedback_select" ON shakedown_feedback FOR SELECT TO authenticated
USING (
  is_hidden = false
  AND EXISTS (
    SELECT 1 FROM shakedowns s
    WHERE s.id = shakedown_id
    AND s.is_hidden = false
  )
);

-- Insert: Can comment on open shakedowns that user can view
CREATE POLICY "feedback_insert" ON shakedown_feedback FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM shakedowns s
    WHERE s.id = shakedown_id
    AND s.status = 'open'
    AND s.is_hidden = false
  )
);

-- Update: Author only, within 30-minute window or for soft-delete
CREATE POLICY "feedback_update" ON shakedown_feedback FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (
  author_id = auth.uid()
  AND (
    -- Soft-delete always allowed
    is_hidden = true
    OR
    -- Content edits within 30-min window
    created_at > now() - INTERVAL '30 minutes'
  )
);

-- Delete: Author only
CREATE POLICY "feedback_delete" ON shakedown_feedback FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- ============================================================================
-- shakedown_helpful_votes policies
-- ============================================================================

-- Read: Users can see votes on their own feedback
CREATE POLICY "helpful_votes_select" ON shakedown_helpful_votes FOR SELECT TO authenticated
USING (
  voter_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM shakedown_feedback f
    WHERE f.id = feedback_id
    AND f.author_id = auth.uid()
  )
);

-- Insert: Shakedown owner votes on feedback (not their own)
CREATE POLICY "helpful_insert" ON shakedown_helpful_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM shakedown_feedback f
    JOIN shakedowns s ON f.shakedown_id = s.id
    WHERE f.id = feedback_id
    AND s.owner_id = auth.uid()
    AND f.author_id != auth.uid()  -- Can't vote on own feedback
  )
);

-- Delete: Voter can remove their vote
CREATE POLICY "helpful_delete" ON shakedown_helpful_votes FOR DELETE TO authenticated
USING (voter_id = auth.uid());

-- ============================================================================
-- shakedown_bookmarks policies
-- ============================================================================

-- Read: Users can only see their own bookmarks
CREATE POLICY "bookmarks_select" ON shakedown_bookmarks FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Insert: Users can create their own bookmarks
CREATE POLICY "bookmarks_insert" ON shakedown_bookmarks FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update: Users can update their own bookmarks
CREATE POLICY "bookmarks_update" ON shakedown_bookmarks FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Delete: Users can delete their own bookmarks
CREATE POLICY "bookmarks_delete" ON shakedown_bookmarks FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- shakedown_badges policies
-- ============================================================================

-- Read: Anyone can see badges (public reputation)
CREATE POLICY "badges_select" ON shakedown_badges FOR SELECT TO authenticated
USING (true);

-- Insert/Update/Delete: Only system (triggers) can manage badges
-- No direct user policies needed

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "shakedowns_select" ON shakedowns IS 'Read shakedowns based on privacy settings and ownership';
COMMENT ON POLICY "shakedowns_insert" ON shakedowns IS 'Users can create their own shakedowns';
COMMENT ON POLICY "shakedowns_update" ON shakedowns IS 'Owners can update their shakedowns';
COMMENT ON POLICY "shakedowns_delete" ON shakedowns IS 'Owners can delete their shakedowns';

COMMENT ON POLICY "feedback_select" ON shakedown_feedback IS 'Read visible feedback on accessible shakedowns';
COMMENT ON POLICY "feedback_insert" ON shakedown_feedback IS 'Add feedback to open shakedowns';
COMMENT ON POLICY "feedback_update" ON shakedown_feedback IS 'Edit own feedback within 30-min window or soft-delete';

COMMENT ON POLICY "helpful_insert" ON shakedown_helpful_votes IS 'Shakedown owners vote on feedback (not their own)';
COMMENT ON POLICY "helpful_delete" ON shakedown_helpful_votes IS 'Voters can remove their votes';

COMMENT ON POLICY "bookmarks_select" ON shakedown_bookmarks IS 'Users see only their own bookmarks';
COMMENT ON POLICY "bookmarks_insert" ON shakedown_bookmarks IS 'Users create their own bookmarks';

COMMENT ON POLICY "badges_select" ON shakedown_badges IS 'Badges are publicly visible';
