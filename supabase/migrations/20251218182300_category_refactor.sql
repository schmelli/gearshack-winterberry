-- ============================================================================
-- Feature: Cascading Category Refactor
-- Description: Transform category selection from 3 cascading dropdowns to 1
--              progressive dropdown, store only product_type_id in database
-- ============================================================================

-- ============================================================================
-- 1. Create recursive function to generate breadcrumb paths
-- ============================================================================
CREATE OR REPLACE FUNCTION get_category_breadcrumb(
  p_product_type_id UUID,
  p_locale TEXT DEFAULT 'en',
  p_separator TEXT DEFAULT ' / '
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_path TEXT;
BEGIN
  -- Return NULL if no product type ID provided
  IF p_product_type_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build breadcrumb path by recursively walking up the category tree
  WITH RECURSIVE category_path AS (
    -- Start with the product type (level 3)
    SELECT
      id,
      parent_id,
      level,
      COALESCE(i18n->>p_locale, i18n->>'en', label) AS localized_label
    FROM categories
    WHERE id = p_product_type_id

    UNION ALL

    -- Walk up to parent categories (level 2, then level 1)
    SELECT
      c.id,
      c.parent_id,
      c.level,
      COALESCE(c.i18n->>p_locale, c.i18n->>'en', c.label) AS localized_label
    FROM categories c
    INNER JOIN category_path cp ON c.id = cp.parent_id
  )
  -- Concatenate labels in correct order (level 1 → 2 → 3)
  SELECT string_agg(localized_label, p_separator ORDER BY level ASC)
  INTO v_path
  FROM category_path;

  RETURN v_path;
END;
$$;

COMMENT ON FUNCTION get_category_breadcrumb IS
  'Generates a breadcrumb path from a product type ID by recursively walking up the category tree. Returns localized labels separated by the specified separator (default: " / ").';

-- ============================================================================
-- 2. Migrate gear_items table
-- ============================================================================

-- Step 2.1: Repair data - Use most specific category available
-- If product_type_id is NULL, fall back to subcategory_id, then category_id
UPDATE gear_items
SET product_type_id = COALESCE(product_type_id, subcategory_id, category_id)
WHERE product_type_id IS NULL;

-- Step 2.2: Drop redundant index and columns
DROP INDEX IF EXISTS idx_gear_items_category;

ALTER TABLE gear_items
  DROP COLUMN IF EXISTS category_id,
  DROP COLUMN IF EXISTS subcategory_id;

-- Step 2.3: Add index on product_type_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_gear_items_product_type
  ON gear_items(product_type_id);

COMMENT ON COLUMN gear_items.product_type_id IS
  'References the most specific category (level 3) from the categories table. Parent categories can be derived by walking up the category tree.';

-- ============================================================================
-- 3. Grant permissions
-- ============================================================================

-- Grant execute permission on the breadcrumb function to authenticated users
GRANT EXECUTE ON FUNCTION get_category_breadcrumb(UUID, TEXT, TEXT)
  TO authenticated;

-- ============================================================================
-- End of migration
-- ============================================================================
