-- Migration: Create shakedown views
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

-- ============================================================================
-- v_shakedowns_feed: Optimized view for feed queries with author info
-- ============================================================================

CREATE OR REPLACE VIEW v_shakedowns_feed AS
SELECT
  s.id,
  s.owner_id,
  s.loadout_id,
  s.trip_name,
  s.trip_start_date,
  s.trip_end_date,
  s.experience_level,
  s.concerns,
  s.privacy,
  s.status,
  s.feedback_count,
  s.helpful_count,
  s.created_at,
  s.updated_at,
  -- Author info
  p.display_name AS author_name,
  p.avatar_url AS author_avatar,
  p.shakedown_helpful_received AS author_reputation,
  -- Loadout summary
  l.name AS loadout_name,
  l.total_weight_grams,
  l.item_count
FROM shakedowns s
JOIN profiles p ON s.owner_id = p.id
JOIN loadouts l ON s.loadout_id = l.id
WHERE s.is_hidden = false;

-- ============================================================================
-- v_shakedown_feedback_with_author: Feedback with author info for display
-- ============================================================================

CREATE OR REPLACE VIEW v_shakedown_feedback_with_author AS
SELECT
  f.id,
  f.shakedown_id,
  f.author_id,
  f.parent_id,
  f.gear_item_id,
  f.content,
  f.content_html,
  f.depth,
  f.helpful_count,
  f.is_hidden,
  f.is_edited,
  f.created_at,
  f.updated_at,
  -- Author info
  p.display_name AS author_name,
  p.avatar_url AS author_avatar,
  p.shakedown_helpful_received AS author_reputation,
  -- Gear item info (if item-specific)
  g.name AS gear_item_name
FROM shakedown_feedback f
JOIN profiles p ON f.author_id = p.id
LEFT JOIN gear_items g ON f.gear_item_id = g.id
WHERE f.is_hidden = false;

-- Comments
COMMENT ON VIEW v_shakedowns_feed IS 'Optimized view for shakedown feed queries with author and loadout info';
COMMENT ON VIEW v_shakedown_feedback_with_author IS 'Feedback view with author info and optional gear item name';
