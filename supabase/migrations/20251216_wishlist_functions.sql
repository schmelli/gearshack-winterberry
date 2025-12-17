-- Migration: Wishlist Community Availability Functions
-- Feature: 049-wishlist-view
-- Date: 2025-12-16
-- Purpose: Add fuzzy matching functions and indexes for community availability matching

-- Note: pg_trgm extension is already enabled in 20251210_catalog_tables.sql

-- Create trigram indexes for fuzzy brand/model matching on gear_items
-- These indexes optimize the similarity() function calls in find_community_availability
CREATE INDEX IF NOT EXISTS idx_gear_items_brand_trgm
  ON gear_items USING GIN (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_gear_items_model_trgm
  ON gear_items USING GIN (model_number gin_trgm_ops);

-- Create composite index for marketplace queries
-- Optimizes filtering for items available for sale, lending, or trading
CREATE INDEX IF NOT EXISTS idx_gear_items_marketplace
  ON gear_items (status, for_sale, lendable, tradeable)
  WHERE status = 'own' AND (for_sale = true OR lendable = true OR tradeable = true);

-- Function: Compute similarity score for brand + model matching
-- Returns a value between 0 (no match) and 1 (exact match)
-- Uses trigram similarity algorithm from pg_trgm extension
CREATE OR REPLACE FUNCTION fuzzy_match_gear(
  wishlist_brand TEXT,
  wishlist_model TEXT,
  inventory_brand TEXT,
  inventory_model TEXT
) RETURNS NUMERIC AS $$
DECLARE
  wishlist_text TEXT;
  inventory_text TEXT;
BEGIN
  -- Normalize and concatenate brand + model for comparison
  -- COALESCE handles NULL values by converting them to empty strings
  wishlist_text := LOWER(TRIM(COALESCE(wishlist_brand, '') || ' ' || COALESCE(wishlist_model, '')));
  inventory_text := LOWER(TRIM(COALESCE(inventory_brand, '') || ' ' || COALESCE(inventory_model, '')));

  -- Return trigram similarity (0-1)
  -- similarity() function from pg_trgm extension
  RETURN similarity(wishlist_text, inventory_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for documentation
COMMENT ON FUNCTION fuzzy_match_gear IS 'Computes trigram similarity score (0-1) between wishlist and inventory item brand+model';

-- Function: Find community availability for a wishlist item
-- Returns matching inventory items from other users that are available in the marketplace
-- Uses fuzzy matching to find similar items even with typos or model variations
CREATE OR REPLACE FUNCTION find_community_availability(
  p_user_id UUID,
  p_wishlist_item_id UUID
) RETURNS TABLE (
  matched_item_id UUID,
  owner_id UUID,
  owner_display_name TEXT,
  owner_avatar_url TEXT,
  item_name TEXT,
  item_brand TEXT,
  for_sale BOOLEAN,
  lendable BOOLEAN,
  tradeable BOOLEAN,
  similarity_score NUMERIC,
  primary_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gi.id AS matched_item_id,
    gi.user_id AS owner_id,
    p.display_name AS owner_display_name,
    p.avatar_url AS owner_avatar_url,
    gi.name AS item_name,
    gi.brand AS item_brand,
    gi.for_sale,
    gi.lendable,
    gi.tradeable,
    fuzzy_match_gear(
      (SELECT brand FROM gear_items WHERE id = p_wishlist_item_id),
      (SELECT model_number FROM gear_items WHERE id = p_wishlist_item_id),
      gi.brand,
      gi.model_number
    ) AS similarity_score,
    gi.primary_image_url
  FROM gear_items gi
  JOIN profiles p ON gi.user_id = p.id
  WHERE
    -- Only match inventory items (not other wishlist items)
    gi.status = 'own'
    -- Only items available in marketplace
    AND (gi.for_sale = true OR gi.lendable = true OR gi.tradeable = true)
    -- Exclude items owned by requesting user
    AND gi.user_id != p_user_id
    -- Filter by similarity threshold (30% minimum match)
    AND fuzzy_match_gear(
      (SELECT brand FROM gear_items WHERE id = p_wishlist_item_id),
      (SELECT model_number FROM gear_items WHERE id = p_wishlist_item_id),
      gi.brand,
      gi.model_number
    ) >= 0.3
  -- Order by best matches first
  ORDER BY similarity_score DESC
  -- Limit results to top 10 matches
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION find_community_availability IS 'Finds inventory items from other users matching a wishlist item using fuzzy brand+model matching (min 30% similarity)';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION fuzzy_match_gear TO authenticated;
GRANT EXECUTE ON FUNCTION find_community_availability TO authenticated;
