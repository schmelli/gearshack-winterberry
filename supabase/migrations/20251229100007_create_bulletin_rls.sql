-- Migration: Create bulletin board RLS policies
-- Feature: 051-community-bulletin-board
-- Date: 2025-12-29

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE bulletin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bulletin_bans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- bulletin_posts policies
-- ============================================================================

-- Anyone authenticated can read non-deleted, non-archived posts
CREATE POLICY "bulletin_posts_read_active"
  ON bulletin_posts
  FOR SELECT
  TO authenticated
  USING (is_deleted = false AND is_archived = false);

-- Direct link access (ignores archive status, still excludes deleted)
CREATE POLICY "bulletin_posts_read_by_id"
  ON bulletin_posts
  FOR SELECT
  TO authenticated
  USING (is_deleted = false);

-- Users can create posts if not banned
CREATE POLICY "bulletin_posts_insert"
  ON bulletin_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND NOT is_user_bulletin_banned(auth.uid())
  );

-- Authors can update their own posts anytime
CREATE POLICY "bulletin_posts_update_own"
  ON bulletin_posts
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
  );

-- ============================================================================
-- bulletin_replies policies
-- ============================================================================

-- Anyone authenticated can read non-deleted replies
CREATE POLICY "bulletin_replies_read"
  ON bulletin_replies
  FOR SELECT
  TO authenticated
  USING (is_deleted = false);

-- Users can create replies if not banned
CREATE POLICY "bulletin_replies_insert"
  ON bulletin_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND NOT is_user_bulletin_banned(auth.uid())
  );

-- Authors can update/delete their own replies
CREATE POLICY "bulletin_replies_update_own"
  ON bulletin_replies
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ============================================================================
-- bulletin_reports policies
-- ============================================================================

-- Users can create reports
CREATE POLICY "bulletin_reports_insert"
  ON bulletin_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Users can see their own reports (status only)
CREATE POLICY "bulletin_reports_read_own"
  ON bulletin_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- ============================================================================
-- user_bulletin_bans policies
-- ============================================================================

-- Only service role can manage bans (moderators use RPC functions)
-- Users can check their own ban status
CREATE POLICY "bulletin_bans_read_own"
  ON user_bulletin_bans
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Comments
COMMENT ON POLICY "bulletin_posts_read_active" ON bulletin_posts IS 'Read active posts for feed';
COMMENT ON POLICY "bulletin_posts_read_by_id" ON bulletin_posts IS 'Read any non-deleted post by ID (for direct links)';
COMMENT ON POLICY "bulletin_posts_insert" ON bulletin_posts IS 'Create posts if not banned';
COMMENT ON POLICY "bulletin_posts_update_own" ON bulletin_posts IS 'Edit own posts anytime';
