-- ============================================================================
-- Feature: Catalog Products Category Refactor
-- Description: Align catalog_products with gear_items category approach.
--              Add product_type_id FK to derive category hierarchy.
--              Note: category_main and subcategory columns were already removed.
-- ============================================================================

-- ============================================================================
-- 1. Add product_type_id column (FK to categories table)
-- ============================================================================

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN catalog_products.product_type_id IS
  'References the most specific category (level 3) from the categories table. Parent categories can be derived by walking up the category tree using get_category_breadcrumb().';

-- ============================================================================
-- 2. Migrate existing data - match product_type TEXT to categories.slug
-- ============================================================================

-- Update product_type_id by matching the lowercase product_type to category slugs at level 3
UPDATE catalog_products cp
SET product_type_id = c.id
FROM categories c
WHERE c.level = 3
  AND lower(cp.product_type) = c.slug
  AND cp.product_type IS NOT NULL
  AND cp.product_type_id IS NULL;

-- Also try matching at level 2 (subcategory) if level 3 didn't match
UPDATE catalog_products cp
SET product_type_id = c.id
FROM categories c
WHERE c.level = 2
  AND lower(cp.product_type) = c.slug
  AND cp.product_type IS NOT NULL
  AND cp.product_type_id IS NULL;

-- ============================================================================
-- 3. Clean up any remaining indexes (if they exist)
-- ============================================================================

DROP INDEX IF EXISTS idx_catalog_products_category_main;

-- ============================================================================
-- 4. Add index on product_type_id for faster lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_catalog_products_product_type_id
  ON catalog_products(product_type_id);

-- ============================================================================
-- End of migration
-- ============================================================================
