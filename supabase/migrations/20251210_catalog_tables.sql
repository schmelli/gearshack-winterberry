-- Migration: Create catalog tables for Global Gear Catalog & Sync API
-- Feature: 042-catalog-sync-api
-- Date: 2025-12-10

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable pg_trgm for trigram-based fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pgvector for semantic vector search
CREATE EXTENSION IF NOT EXISTS vector;

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
-- CATALOG_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  brand_id UUID REFERENCES catalog_brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_normalized TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED,
  category TEXT,
  description TEXT,
  specs_summary TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE catalog_items IS 'Canonical product data with semantic embeddings for search';
COMMENT ON COLUMN catalog_items.external_id IS 'ID from external source for sync deduplication';
COMMENT ON COLUMN catalog_items.name_normalized IS 'Lowercase, trimmed name for search operations';
COMMENT ON COLUMN catalog_items.embedding IS '1536-dimension semantic embedding for vector search';

-- Indexes for catalog_items
CREATE INDEX IF NOT EXISTS idx_catalog_items_name_trgm
  ON catalog_items USING GIN (name_normalized gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_catalog_items_brand_id
  ON catalog_items (brand_id);

-- HNSW index for vector similarity search (better recall than IVFFlat)
CREATE INDEX IF NOT EXISTS idx_catalog_items_embedding
  ON catalog_items USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE catalog_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to READ (SELECT)
CREATE POLICY "Authenticated users can read brands"
  ON catalog_brands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read items"
  ON catalog_items FOR SELECT
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

-- Trigger for catalog_items
DROP TRIGGER IF EXISTS catalog_items_updated_at ON catalog_items;
CREATE TRIGGER catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
