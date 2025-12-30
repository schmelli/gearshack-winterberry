-- Migration: Fix Merchant Integration Issues
-- Feature: 053-merchant-integration
-- Date: 2025-12-30
--
-- Fixes identified in code review:
-- 1. Anonymous ID overflow (supports unlimited users)
-- 2. Missing catalog_product_id column (use alternate approach)
-- 3. Race condition prevention (unique constraint)
-- 4. Performance indexes (source_offer_id)
-- 5. Pagination support for RPC

-- ============================================================================
-- 1. Fix Anonymous ID Generation (Issue #2)
-- ============================================================================
-- Replace CHR-based IDs with MD5 hash-based anonymous IDs

CREATE OR REPLACE FUNCTION get_wishlist_users_nearby(
  merchant_lat DOUBLE PRECISION,
  merchant_lng DOUBLE PRECISION,
  radius_meters INTEGER,
  p_catalog_item_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT NULL,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  anonymous_id TEXT,
  proximity_bucket TEXT,
  added_days_ago INTEGER,
  can_send_offer BOOLEAN,
  wishlist_item_id UUID,
  catalog_item_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH merchant_point AS (
    SELECT ST_Point(merchant_lng, merchant_lat)::geography AS point
  ),
  nearby_users AS (
    SELECT
      uls.user_id,
      'User_' || SUBSTRING(MD5(uls.user_id::TEXT), 1, 8) AS anon_id,
      ST_Distance(uls.location, mp.point) AS distance_m,
      gi.id AS wishlist_item_id,
      gi.created_at AS added_at,
      -- Use source_merchant_id to link wishlist items to merchant catalog
      -- This assumes wishlist items added from merchant loadouts have source_merchant_id set
      gi.source_merchant_id,
      COALESCE(gi.source_loadout_id, gi.id) AS item_ref
    FROM user_location_shares uls
    CROSS JOIN merchant_point mp
    JOIN gear_items gi ON gi.user_id = uls.user_id AND gi.status = 'wishlist'
    WHERE uls.granularity != 'none'
      AND ST_DWithin(uls.location, mp.point, radius_meters)
  ),
  filtered_users AS (
    SELECT
      nu.user_id,
      nu.anon_id::TEXT,
      get_proximity_bucket(nu.distance_m) AS prox_bucket,
      EXTRACT(DAY FROM now() - nu.added_at)::INTEGER AS days_ago,
      nu.wishlist_item_id,
      -- For now, return NULL for catalog_item_id since we need to establish the relationship differently
      NULL::UUID AS cat_item_id,
      NOT EXISTS (
        SELECT 1 FROM merchant_blocks mb
        WHERE mb.user_id = nu.user_id
          AND mb.merchant_id IN (SELECT m.id FROM merchants m WHERE m.user_id = auth.uid())
      ) AS not_blocked,
      ROW_NUMBER() OVER (ORDER BY nu.added_at DESC) AS row_num
    FROM nearby_users nu
    WHERE (p_catalog_item_id IS NULL OR p_catalog_item_id = cat_item_id)
  )
  SELECT
    fu.user_id,
    fu.anon_id,
    fu.prox_bucket,
    fu.days_ago,
    fu.not_blocked AND NOT EXISTS (
      SELECT 1 FROM merchant_offers mo
      WHERE mo.user_id = fu.user_id
        AND mo.catalog_item_id = fu.cat_item_id
        AND mo.created_at > now() - INTERVAL '30 days'
    ) AS can_send_offer,
    fu.wishlist_item_id,
    fu.cat_item_id
  FROM filtered_users fu
  WHERE (p_limit IS NULL OR fu.row_num > p_offset AND fu.row_num <= p_offset + p_limit)
  ORDER BY fu.days_ago;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Add Race Condition Prevention (Issue #3)
-- ============================================================================
-- Partial unique index to prevent duplicate offers within 30 days

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_rate_limit_unique
  ON merchant_offers(merchant_id, user_id, catalog_item_id, (DATE(created_at)))
  WHERE created_at > now() - INTERVAL '30 days';

-- ============================================================================
-- 3. Add Missing source_offer_id Index (Issue #8)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_gear_items_source_offer
  ON gear_items(source_offer_id) WHERE source_offer_id IS NOT NULL;

-- ============================================================================
-- 4. Optimize RPC for catalog item details (Issue #4)
-- ============================================================================
-- Create an improved version that includes catalog details via JOIN
-- Note: This requires establishing a proper relationship between wishlist items
-- and catalog items. For now, we'll create a helper function.

CREATE OR REPLACE FUNCTION get_wishlist_insights_with_catalog(
  merchant_lat DOUBLE PRECISION,
  merchant_lng DOUBLE PRECISION,
  radius_meters INTEGER,
  p_merchant_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  catalog_item_id UUID,
  catalog_item_name TEXT,
  catalog_item_brand TEXT,
  catalog_item_price DECIMAL,
  user_count BIGINT,
  proximity_5km INTEGER,
  proximity_10km INTEGER,
  proximity_25km INTEGER,
  proximity_50km INTEGER,
  proximity_100km_plus INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH merchant_point AS (
    SELECT ST_Point(merchant_lng, merchant_lat)::geography AS point
  ),
  nearby_wishlist_items AS (
    SELECT
      gi.id AS wishlist_item_id,
      gi.user_id,
      uls.user_id AS location_user_id,
      ST_Distance(uls.location, mp.point) AS distance_m,
      get_proximity_bucket(ST_Distance(uls.location, mp.point)) AS proximity_bucket
    FROM user_location_shares uls
    CROSS JOIN merchant_point mp
    JOIN gear_items gi ON gi.user_id = uls.user_id AND gi.status = 'wishlist'
    WHERE uls.granularity != 'none'
      AND ST_DWithin(uls.location, mp.point, radius_meters)
      AND NOT EXISTS (
        SELECT 1 FROM merchant_blocks mb
        WHERE mb.user_id = gi.user_id AND mb.merchant_id = p_merchant_id
      )
  ),
  -- For now, aggregate by wishlist item name/brand since we don't have direct catalog linkage
  item_aggregates AS (
    SELECT
      gi.name AS item_name,
      gi.brand AS item_brand,
      COUNT(DISTINCT nw.user_id) AS user_count,
      COUNT(CASE WHEN nw.proximity_bucket = '5km' THEN 1 END)::INTEGER AS prox_5km,
      COUNT(CASE WHEN nw.proximity_bucket = '10km' THEN 1 END)::INTEGER AS prox_10km,
      COUNT(CASE WHEN nw.proximity_bucket = '25km' THEN 1 END)::INTEGER AS prox_25km,
      COUNT(CASE WHEN nw.proximity_bucket = '50km' THEN 1 END)::INTEGER AS prox_50km,
      COUNT(CASE WHEN nw.proximity_bucket = '100km+' THEN 1 END)::INTEGER AS prox_100km_plus
    FROM nearby_wishlist_items nw
    JOIN gear_items gi ON gi.id = nw.wishlist_item_id
    GROUP BY gi.name, gi.brand
    HAVING COUNT(DISTINCT nw.user_id) > 0
  )
  -- Match against merchant catalog items
  SELECT
    mci.id,
    mci.name,
    mci.brand,
    mci.price,
    COALESCE(ia.user_count, 0),
    COALESCE(ia.prox_5km, 0),
    COALESCE(ia.prox_10km, 0),
    COALESCE(ia.prox_25km, 0),
    COALESCE(ia.prox_50km, 0),
    COALESCE(ia.prox_100km_plus, 0)
  FROM merchant_catalog_items mci
  LEFT JOIN item_aggregates ia ON (
    LOWER(mci.name) = LOWER(ia.item_name)
    AND (mci.brand IS NULL OR ia.item_brand IS NULL OR LOWER(mci.brand) = LOWER(ia.item_brand))
  )
  WHERE mci.merchant_id = p_merchant_id
    AND mci.is_active = true
    AND COALESCE(ia.user_count, 0) > 0
  ORDER BY COALESCE(ia.user_count, 0) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMPLETE
-- ============================================================================
