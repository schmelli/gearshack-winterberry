-- Migration: Fix category_id → product_type_id in gear intelligence RPC functions
-- Date: 2026-02-20
--
-- The gear_items table has both category_id (legacy) and product_type_id (canonical).
-- All three RPC functions from 20260215000001_gear_intelligence.sql incorrectly
-- referenced category_id instead of product_type_id for category joins and filters.
-- This migration recreates those functions with the correct column references.

-- ============================================================================
-- 1. INVENTORY INTELLIGENCE VIEW (RPC Function) — FIXED
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inventory_intelligence(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_user_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN json_build_object('error', 'User not found or access denied');
  END IF;

  SELECT json_build_object(
    'totalOwned', (SELECT COUNT(*) FROM gear_items WHERE user_id = p_user_id AND status = 'own'),
    'totalWishlist', (SELECT COUNT(*) FROM gear_items WHERE user_id = p_user_id AND status = 'wishlist'),
    'totalWeight', (SELECT COALESCE(SUM(weight_grams), 0) FROM gear_items WHERE user_id = p_user_id AND status = 'own'),
    'avgWeight', (SELECT COALESCE(AVG(weight_grams), 0) FROM gear_items WHERE user_id = p_user_id AND status = 'own' AND weight_grams IS NOT NULL AND weight_grams > 0),
    'totalValue', (SELECT COALESCE(SUM(price_paid), 0) FROM gear_items WHERE user_id = p_user_id AND status = 'own'),
    'brandCount', (SELECT COUNT(DISTINCT brand) FROM gear_items WHERE user_id = p_user_id AND status = 'own' AND brand IS NOT NULL),
    'topBrands', (
      SELECT COALESCE(json_agg(row_to_json(b)), '[]'::json)
      FROM (
        SELECT brand, COUNT(*) as item_count, SUM(weight_grams) as total_weight
        FROM gear_items
        WHERE user_id = p_user_id AND status = 'own' AND brand IS NOT NULL
        GROUP BY brand
        ORDER BY item_count DESC
        LIMIT 10
      ) b
    ),
    'categoryBreakdown', (
      SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
      FROM (
        SELECT
          cat.label as category_name,
          cat.slug as category_slug,
          COUNT(gi.id) as item_count,
          COALESCE(SUM(gi.weight_grams), 0) as total_weight
        FROM gear_items gi
        LEFT JOIN categories cat ON gi.product_type_id = cat.id
        WHERE gi.user_id = p_user_id AND gi.status = 'own'
        GROUP BY cat.label, cat.slug
        ORDER BY total_weight DESC
      ) c
    ),
    'heaviestItems', (
      SELECT COALESCE(json_agg(row_to_json(h)), '[]'::json)
      FROM (
        SELECT gi.id, gi.name, gi.brand, gi.weight_grams, cat.label as category
        FROM gear_items gi
        LEFT JOIN categories cat ON gi.product_type_id = cat.id
        WHERE gi.user_id = p_user_id AND gi.status = 'own' AND gi.weight_grams IS NOT NULL
        ORDER BY gi.weight_grams DESC
        LIMIT 10
      ) h
    ),
    'lightestItems', (
      SELECT COALESCE(json_agg(row_to_json(l)), '[]'::json)
      FROM (
        SELECT gi.id, gi.name, gi.brand, gi.weight_grams, cat.label as category
        FROM gear_items gi
        LEFT JOIN categories cat ON gi.product_type_id = cat.id
        WHERE gi.user_id = p_user_id AND gi.status = 'own' AND gi.weight_grams IS NOT NULL AND gi.weight_grams > 0
        ORDER BY gi.weight_grams ASC
        LIMIT 10
      ) l
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 2. LOADOUT ANALYSIS FUNCTION — FIXED
-- ============================================================================

CREATE OR REPLACE FUNCTION analyze_loadout(p_loadout_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_loadout RECORD;
  v_result JSON;
BEGIN
  SELECT id, name, description, activity_types, seasons
  INTO v_loadout
  FROM loadouts
  WHERE id = p_loadout_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Loadout not found or access denied');
  END IF;

  SELECT json_build_object(
    'loadout', json_build_object(
      'id', v_loadout.id,
      'name', v_loadout.name,
      'description', v_loadout.description,
      'activityTypes', v_loadout.activity_types,
      'seasons', v_loadout.seasons
    ),
    'itemCount', (
      SELECT COUNT(*) FROM loadout_items WHERE loadout_id = p_loadout_id
    ),
    'totalWeight', (
      SELECT COALESCE(SUM(gi.weight_grams * li.quantity), 0)
      FROM loadout_items li
      JOIN gear_items gi ON li.gear_item_id = gi.id
      WHERE li.loadout_id = p_loadout_id
    ),
    'wornWeight', (
      SELECT COALESCE(SUM(gi.weight_grams * li.quantity), 0)
      FROM loadout_items li
      JOIN gear_items gi ON li.gear_item_id = gi.id
      WHERE li.loadout_id = p_loadout_id AND li.is_worn = true
    ),
    'consumableWeight', (
      SELECT COALESCE(SUM(gi.weight_grams * li.quantity), 0)
      FROM loadout_items li
      JOIN gear_items gi ON li.gear_item_id = gi.id
      WHERE li.loadout_id = p_loadout_id AND li.is_consumable = true
    ),
    'items', (
      SELECT COALESCE(json_agg(row_to_json(items_data)), '[]'::json)
      FROM (
        SELECT
          gi.id,
          gi.name,
          gi.brand,
          gi.weight_grams,
          gi.price_paid,
          gi.notes,
          gi.dependency_ids,
          li.quantity,
          li.is_worn,
          li.is_consumable,
          cat.label as category_name,
          cat.slug as category_slug,
          parent_cat.label as parent_category_name,
          parent_cat.slug as parent_category_slug
        FROM loadout_items li
        JOIN gear_items gi ON li.gear_item_id = gi.id
        LEFT JOIN categories cat ON gi.product_type_id = cat.id
        LEFT JOIN categories parent_cat ON cat.parent_id = parent_cat.id
        WHERE li.loadout_id = p_loadout_id
        ORDER BY gi.weight_grams DESC NULLS LAST
      ) items_data
    ),
    'categoryBreakdown', (
      SELECT COALESCE(json_agg(row_to_json(cat_data)), '[]'::json)
      FROM (
        SELECT
          COALESCE(parent_cat.label, cat.label, 'Uncategorized') as category,
          COALESCE(parent_cat.slug, cat.slug, 'uncategorized') as category_slug,
          COUNT(*) as item_count,
          SUM(gi.weight_grams * li.quantity) as total_weight
        FROM loadout_items li
        JOIN gear_items gi ON li.gear_item_id = gi.id
        LEFT JOIN categories cat ON gi.product_type_id = cat.id
        LEFT JOIN categories parent_cat ON cat.parent_id = parent_cat.id
        WHERE li.loadout_id = p_loadout_id
        GROUP BY COALESCE(parent_cat.label, cat.label, 'Uncategorized'),
                 COALESCE(parent_cat.slug, cat.slug, 'uncategorized')
        ORDER BY total_weight DESC
      ) cat_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 3. CATEGORY COUNT FUNCTION — FIXED
-- ============================================================================

CREATE OR REPLACE FUNCTION count_items_by_category(
  p_user_id UUID,
  p_search_term TEXT,
  p_status TEXT DEFAULT 'own'
)
RETURNS JSON AS $$
DECLARE
  v_category_ids UUID[];
  v_result JSON;
BEGIN
  SELECT ARRAY_AGG(id) INTO v_category_ids
  FROM (
    SELECT id FROM categories
    WHERE slug ILIKE '%' || regexp_replace(p_search_term, '([%_\\])', '\\\1', 'g') || '%'
       OR label ILIKE '%' || regexp_replace(p_search_term, '([%_\\])', '\\\1', 'g') || '%'
       OR i18n::text ILIKE '%' || regexp_replace(p_search_term, '([%_\\])', '\\\1', 'g') || '%'
    UNION
    SELECT c.id FROM categories c
    WHERE c.parent_id IN (
      SELECT id FROM categories
      WHERE slug ILIKE '%' || regexp_replace(p_search_term, '([%_\\])', '\\\1', 'g') || '%'
         OR label ILIKE '%' || regexp_replace(p_search_term, '([%_\\])', '\\\1', 'g') || '%'
         OR i18n::text ILIKE '%' || regexp_replace(p_search_term, '([%_\\])', '\\\1', 'g') || '%'
    )
  ) matched;

  SELECT json_build_object(
    'searchTerm', p_search_term,
    'count', (
      SELECT COUNT(*)
      FROM gear_items
      WHERE user_id = p_user_id
        AND status = p_status
        AND (
          (v_category_ids IS NOT NULL AND product_type_id = ANY(v_category_ids))
          OR name ILIKE '%' || regexp_replace(p_search_term, '([%_\\])', '\\\1', 'g') || '%'
        )
    ),
    'items', (
      SELECT COALESCE(json_agg(row_to_json(items)), '[]'::json)
      FROM (
        SELECT id, name, brand, weight_grams, cat.label as category
        FROM gear_items gi
        LEFT JOIN categories cat ON gi.product_type_id = cat.id
        WHERE gi.user_id = p_user_id
          AND gi.status = p_status
          AND (
            (v_category_ids IS NOT NULL AND gi.product_type_id = ANY(v_category_ids))
            OR gi.name ILIKE '%' || regexp_replace(p_search_term, '([%_\\])', '\\\1', 'g') || '%'
          )
        ORDER BY gi.name
      ) items
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 4. UPDATE FUZZY SEARCH FILTER WHITELIST
-- ============================================================================

-- The fuzzy_search_with_filters function validates column names against a whitelist.
-- Add product_type_id as a valid column for gear_items filtering.
-- Note: We keep category_id in the whitelist for backward compatibility since
-- the column still exists in the schema.

-- This is handled via CREATE OR REPLACE in the original migration files.
-- The whitelist is embedded in the function body, so we just update the function.
-- However, the fuzzy search functions are complex and we only need to add
-- product_type_id to the whitelist. We'll handle this in application code
-- by using product_type_id in queries directly.
