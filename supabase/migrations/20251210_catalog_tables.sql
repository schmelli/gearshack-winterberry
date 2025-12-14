-- Migration: Create catalog tables for Global Gear Catalog & Sync API
-- Feature: 042-catalog-sync-api
-- Date: 2025-12-10
-- Updated: 2025-12-14 - Updated to match actual database schema (catalog_products)

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable pg_trgm for trigram-based fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- CATALOG_BRANDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_normalized TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE catalog_brands IS 'Canonical brand/manufacturer data synced from external master database (Memgraph)';
COMMENT ON COLUMN catalog_brands.external_id IS 'ID from external source for sync deduplication';
COMMENT ON COLUMN catalog_brands.name_normalized IS 'Lowercase, trimmed name for search operations';

-- Indexes for catalog_brands
CREATE INDEX IF NOT EXISTS idx_catalog_brands_name_trgm
  ON catalog_brands USING GIN (name_normalized gin_trgm_ops);

-- ============================================================================
-- CATALOG_PRODUCTS TABLE (actual schema in production)
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  brand_id UUID REFERENCES catalog_brands(id) ON DELETE SET NULL,
  brand_external_id TEXT,
  name TEXT NOT NULL,
  category_main TEXT,
  subcategory TEXT,
  product_type TEXT,
  description TEXT,
  price_usd NUMERIC,
  weight_grams NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE catalog_products IS 'Canonical product data synced from external master database';
COMMENT ON COLUMN catalog_products.external_id IS 'ID from external source for sync deduplication';
COMMENT ON COLUMN catalog_products.brand_external_id IS 'External brand ID for reference before FK resolution';

-- Indexes for catalog_products
CREATE INDEX IF NOT EXISTS idx_catalog_products_name_trgm
  ON catalog_products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_catalog_products_brand_id
  ON catalog_products (brand_id);

CREATE INDEX IF NOT EXISTS idx_catalog_products_category_main
  ON catalog_products (category_main);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE catalog_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to READ (SELECT)
CREATE POLICY "Authenticated users can read brands"
  ON catalog_brands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read products"
  ON catalog_products FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for normal users
-- Service role key bypasses RLS for sync operations

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for catalog_brands
DROP TRIGGER IF EXISTS catalog_brands_updated_at ON catalog_brands;
CREATE TRIGGER catalog_brands_updated_at
  BEFORE UPDATE ON catalog_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for catalog_products
DROP TRIGGER IF EXISTS catalog_products_updated_at ON catalog_products;
CREATE TRIGGER catalog_products_updated_at
  BEFORE UPDATE ON catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
