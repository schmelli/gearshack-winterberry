-- Migration: Create views and functions for price tracking
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Community availability view and fuzzy search function

-- ==================== community_availability view ====================
-- Aggregate count of users with same item in inventory
CREATE OR REPLACE VIEW community_availability AS
SELECT
  gi.id AS gear_item_id,
  gi.name AS item_name,
  COUNT(DISTINCT gi2.user_id) AS user_count,
  MIN(gi2.price_paid) AS min_price,
  MAX(gi2.price_paid) AS max_price,
  AVG(gi2.price_paid) AS avg_price
FROM gear_items gi
LEFT JOIN gear_items gi2 ON
  gi2.name = gi.name AND
  gi2.status = 'own' AND
  gi2.user_id != gi.user_id
WHERE gi.status = 'wishlist'
GROUP BY gi.id, gi.name;

-- ==================== fuzzy_search_products function ====================
-- Fuzzy match wishlist item names to price result product names
CREATE OR REPLACE FUNCTION fuzzy_search_products(
  search_term TEXT,
  threshold DECIMAL DEFAULT 0.3
)
RETURNS TABLE (
  product_name TEXT,
  similarity DECIMAL,
  source_name TEXT,
  source_url TEXT,
  price_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.product_name,
    SIMILARITY(pr.product_name, search_term) AS similarity,
    pr.source_name,
    pr.source_url,
    pr.price_amount
  FROM price_results pr
  WHERE SIMILARITY(pr.product_name, search_term) > threshold
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;
