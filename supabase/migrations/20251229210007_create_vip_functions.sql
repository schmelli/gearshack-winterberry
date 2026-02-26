-- Migration: Create VIP Database Functions
-- Feature: 052-vip-loadouts
-- Description: Helper functions for VIP follower counts, loadout counts, and notifications

-- =============================================================================
-- Follower Count Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_vip_follower_count(p_vip_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM vip_follows
  WHERE vip_id = p_vip_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_vip_follower_count IS 'Returns the follower count for a VIP account';

-- =============================================================================
-- Loadout Count Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_vip_loadout_count(p_vip_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM vip_loadouts
  WHERE vip_id = p_vip_id AND status = 'published';
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_vip_loadout_count IS 'Returns the published loadout count for a VIP account';

-- =============================================================================
-- Notify VIP Followers Function
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_vip_followers(p_vip_id UUID, p_loadout_id UUID)
RETURNS INTEGER AS $$
DECLARE
  notification_count INTEGER;
BEGIN
  INSERT INTO notifications (user_id, type, data, created_at)
  SELECT
    vf.follower_id,
    'vip_new_loadout',
    jsonb_build_object(
      'vip_id', p_vip_id,
      'loadout_id', p_loadout_id,
      'vip_name', va.name,
      'vip_slug', va.slug,
      'loadout_name', vl.name,
      'loadout_slug', vl.slug
    ),
    NOW()
  FROM vip_follows vf
  JOIN vip_accounts va ON va.id = p_vip_id
  JOIN vip_loadouts vl ON vl.id = p_loadout_id
  WHERE vf.vip_id = p_vip_id;

  GET DIAGNOSTICS notification_count = ROW_COUNT;
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_vip_followers IS 'Creates notifications for all followers when a new loadout is published';

-- =============================================================================
-- Notify VIP Claimed Function
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_vip_claimed(p_vip_id UUID)
RETURNS INTEGER AS $$
DECLARE
  notification_count INTEGER;
BEGIN
  INSERT INTO notifications (user_id, type, data, created_at)
  SELECT
    vf.follower_id,
    'vip_claimed',
    jsonb_build_object(
      'vip_id', p_vip_id,
      'vip_name', va.name,
      'vip_slug', va.slug
    ),
    NOW()
  FROM vip_follows vf
  JOIN vip_accounts va ON va.id = p_vip_id
  WHERE vf.vip_id = p_vip_id;

  GET DIAGNOSTICS notification_count = ROW_COUNT;
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_vip_claimed IS 'Notifies followers when a VIP claims their account';

-- =============================================================================
-- Check User Following VIP Function
-- =============================================================================

CREATE OR REPLACE FUNCTION is_user_following_vip(p_user_id UUID, p_vip_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM vip_follows
    WHERE follower_id = p_user_id AND vip_id = p_vip_id
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION is_user_following_vip IS 'Checks if a user is following a specific VIP';

-- =============================================================================
-- Check User Bookmarked Loadout Function
-- =============================================================================

CREATE OR REPLACE FUNCTION is_loadout_bookmarked(p_user_id UUID, p_loadout_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM vip_bookmarks
    WHERE user_id = p_user_id AND vip_loadout_id = p_loadout_id
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION is_loadout_bookmarked IS 'Checks if a user has bookmarked a specific VIP loadout';

-- =============================================================================
-- Get VIP Loadout Total Weight Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_vip_loadout_total_weight(p_loadout_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(weight_grams * quantity), 0)::INTEGER
  FROM vip_loadout_items
  WHERE vip_loadout_id = p_loadout_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_vip_loadout_total_weight IS 'Calculates total weight of a VIP loadout in grams';

-- =============================================================================
-- Get VIP Loadout Item Count Function
-- =============================================================================

CREATE OR REPLACE FUNCTION get_vip_loadout_item_count(p_loadout_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM vip_loadout_items
  WHERE vip_loadout_id = p_loadout_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_vip_loadout_item_count IS 'Returns the number of items in a VIP loadout';

-- =============================================================================
-- Generate Secure Claim Token Function
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_claim_token()
RETURNS VARCHAR(100) AS $$
  -- Use gen_random_uuid which is always available, concatenate two for more randomness
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$ LANGUAGE SQL VOLATILE;

COMMENT ON FUNCTION generate_claim_token IS 'Generates a 96-character secure random token for claim invitations';
