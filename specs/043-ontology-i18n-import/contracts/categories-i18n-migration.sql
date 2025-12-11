-- Migration: Add i18n support to categories table
-- Feature: 043-ontology-i18n-import
-- Date: 2025-12-11
--
-- Run this SQL in Supabase Dashboard > SQL Editor
-- Or via Supabase CLI: supabase db push

-- =============================================================================
-- STEP 1: Add new columns to categories table
-- =============================================================================

-- Add slug column (unique identifier for upsert operations)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add i18n column (JSONB for translations)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS i18n JSONB DEFAULT '{}';

-- =============================================================================
-- STEP 2: Populate slug from existing label (for migration)
-- =============================================================================

-- Generate slugs from existing labels (lowercase, spaces to underscores)
UPDATE categories
SET slug = lower(regexp_replace(label, '\s+', '_', 'g'))
WHERE slug IS NULL;

-- =============================================================================
-- STEP 3: Add constraints (after data migration)
-- =============================================================================

-- Make slug NOT NULL after populating
ALTER TABLE categories
ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint on slug
ALTER TABLE categories
ADD CONSTRAINT categories_slug_unique UNIQUE (slug);

-- =============================================================================
-- STEP 4: Create index for slug lookups
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_slug
ON categories (slug);

-- =============================================================================
-- STEP 5: Add comment for documentation
-- =============================================================================

COMMENT ON COLUMN categories.slug IS 'Unique identifier for category (lowercase, underscores). Used for upsert operations and stable references.';
COMMENT ON COLUMN categories.i18n IS 'JSONB translations: {"en": "English Label", "de": "German Label"}';

-- =============================================================================
-- VERIFICATION QUERIES (run manually to verify migration)
-- =============================================================================

-- Check all categories have slugs:
-- SELECT COUNT(*) FROM categories WHERE slug IS NULL;  -- Should be 0

-- Check slug uniqueness:
-- SELECT slug, COUNT(*) FROM categories GROUP BY slug HAVING COUNT(*) > 1;  -- Should be empty

-- Sample i18n data:
-- SELECT id, slug, label, i18n FROM categories LIMIT 5;
