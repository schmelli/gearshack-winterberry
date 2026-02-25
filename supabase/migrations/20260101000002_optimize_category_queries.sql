-- Migration: Optimize category queries (Fix N+1 pattern)
-- Feature: 055-price-search-relevance-fix
-- Date: 2026-01-01
--
-- This migration creates an optimized SQL function to eliminate the N+1 query
-- pattern in getProductCategoryInfo. Previously, it made up to 3 sequential
-- queries to traverse the category hierarchy (level 3 → level 2 → level 1).
-- This reduces it to a single recursive query.

-- ============================================================================
-- Get Category Ancestry (Full Category Path)
-- ============================================================================
-- This function replaces the N+1 pattern of separately fetching parent
-- categories. It uses a recursive CTE to traverse the entire category
-- hierarchy in a single query.
--
-- Performance improvement: Up to 3 queries → 1 query
-- Example: For a level 3 category, reduces from 3 queries to 1 query

CREATE OR REPLACE FUNCTION get_category_ancestry(
  p_category_id BIGINT
)
RETURNS TABLE (
  product_type TEXT,
  category_main TEXT,
  category_top TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_path AS (
    -- Base case: Start with the requested category
    SELECT
      c.id,
      c.label,
      c.level,
      c.parent_id,
      1 as depth
    FROM categories c
    WHERE c.id = p_category_id

    UNION ALL

    -- Recursive case: Get parent categories
    SELECT
      c.id,
      c.label,
      c.level,
      c.parent_id,
      cp.depth + 1
    FROM categories c
    INNER JOIN category_path cp ON c.id = cp.parent_id
    WHERE cp.depth < 3  -- Limit recursion depth (level 3 → 2 → 1)
  ),
  aggregated AS (
    -- Aggregate the path into level-specific columns
    SELECT
      MAX(CASE WHEN level = 3 THEN label END) as product_type,
      MAX(CASE WHEN level = 2 THEN label END) as category_main,
      MAX(CASE WHEN level = 1 THEN label END) as category_top
    FROM category_path
  )
  SELECT
    product_type,
    category_main,
    category_top
  FROM aggregated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Comments
COMMENT ON FUNCTION get_category_ancestry IS 'Optimized function to fetch complete category ancestry in a single query using recursive CTE. Eliminates N+1 pattern (reduces up to 3 queries to 1 query).';

-- ============================================================================
-- Performance Index
-- ============================================================================
-- This index optimizes the recursive CTE traversal by supporting efficient
-- parent lookup during category hierarchy traversal.

-- Index for efficient parent category lookup in get_category_ancestry
-- Supports: JOIN ... ON c.id = cp.parent_id in the recursive CTE
CREATE INDEX IF NOT EXISTS idx_categories_parent_id
  ON categories(parent_id)
  WHERE parent_id IS NOT NULL;

-- Comments
COMMENT ON INDEX idx_categories_parent_id IS 'Optimizes category hierarchy traversal. Partial index on categories with parents only.';
