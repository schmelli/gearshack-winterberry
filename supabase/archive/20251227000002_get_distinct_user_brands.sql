-- Migration: Add function to get distinct user brands efficiently
-- Feature: 044-intelligence-integration (brand autocomplete)
-- Issue #87: Optimize inventory brand search with DISTINCT

-- Function to get distinct brand names from a user's gear items
-- This pushes deduplication to the database for better performance
CREATE OR REPLACE FUNCTION get_distinct_user_brands(
  p_user_id uuid,
  p_search_pattern text
)
RETURNS TABLE (brand text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT gear_items.brand
  FROM gear_items
  WHERE gear_items.user_id = p_user_id
    AND gear_items.brand IS NOT NULL
    AND gear_items.brand ILIKE p_search_pattern
  ORDER BY gear_items.brand;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_distinct_user_brands(uuid, text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_distinct_user_brands IS 'Returns distinct brand names from a user''s gear items matching a search pattern. Used for brand autocomplete with inventory brands.';
