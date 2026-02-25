-- Migration: Create bulletin board views
-- Feature: 051-community-bulletin-board
-- Date: 2025-12-29

-- ============================================================================
-- Posts with Author View (for display)
-- ============================================================================

CREATE VIEW v_bulletin_posts_with_author AS
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
JOIN profiles pr ON p.author_id = pr.id
WHERE p.is_deleted = false;

-- ============================================================================
-- Reports for Moderators View
-- ============================================================================

CREATE VIEW v_bulletin_reports_for_mods AS
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
  -- Include reporter info
  reporter.display_name AS reporter_name,
  -- Include content preview and author for moderation
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
      JOIN profiles p_author ON bp.author_id = p_author.id
      WHERE bp.id = r.target_id
    )
    WHEN r.target_type = 'reply' THEN (
      SELECT r_author.display_name
      FROM bulletin_replies br
      JOIN profiles r_author ON br.author_id = r_author.id
      WHERE br.id = r.target_id
    )
  END AS target_author_name
FROM bulletin_reports r
JOIN profiles reporter ON r.reporter_id = reporter.id
WHERE r.status = 'pending'
ORDER BY report_count DESC, r.created_at ASC;

-- ============================================================================
-- Replies with Author View (for display)
-- ============================================================================

CREATE VIEW v_bulletin_replies_with_author AS
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
JOIN profiles pr ON r.author_id = pr.id
WHERE r.is_deleted = false;

-- Comments
COMMENT ON VIEW v_bulletin_posts_with_author IS 'Posts joined with author profile data';
COMMENT ON VIEW v_bulletin_reports_for_mods IS 'Pending reports for moderator review (excludes reporter identity)';
COMMENT ON VIEW v_bulletin_replies_with_author IS 'Replies joined with author profile data';
