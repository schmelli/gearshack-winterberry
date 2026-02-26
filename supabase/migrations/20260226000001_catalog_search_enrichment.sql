-- Migration: Add search_enrichment JSONB column to catalog_products
-- Feature: LLM-powered catalog pre-enrichment (ReAG pattern)
--
-- Stores LLM-generated semantic metadata for improved search discoverability:
-- - useCases: when/where this item excels
-- - alternativeSearchTerms: how users might search for this
-- - conditions: weather/terrain conditions this suits
-- - compatibleWith: what this works well with
-- - avoidFor: when NOT to use this item
--
-- The enrichment is generated asynchronously via scripts/enrich-catalog-items.ts
-- and does NOT affect live request latency.

-- 1. Add JSONB column for enrichment data
ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS search_enrichment jsonb DEFAULT NULL;

-- 2. Add timestamp for tracking when enrichment was last run
ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz DEFAULT NULL;

-- 3. GIN index on search_enrichment for efficient JSONB containment queries
-- This enables fast @> (contains) and ? (key exists) operators
CREATE INDEX IF NOT EXISTS idx_catalog_products_search_enrichment
  ON catalog_products USING gin (search_enrichment jsonb_path_ops);

-- 4. Partial index to quickly find unenriched products
CREATE INDEX IF NOT EXISTS idx_catalog_products_unenriched
  ON catalog_products (created_at)
  WHERE search_enrichment IS NULL;

-- 5. Create a SQL function for full-text search across enrichment fields
-- This converts the JSONB arrays into a searchable text representation
CREATE OR REPLACE FUNCTION catalog_enrichment_text(p catalog_products)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    array_to_string(
      ARRAY(SELECT jsonb_array_elements_text(p.search_enrichment->'useCases'))
      || ARRAY(SELECT jsonb_array_elements_text(p.search_enrichment->'alternativeSearchTerms'))
      || ARRAY(SELECT jsonb_array_elements_text(p.search_enrichment->'conditions'))
      || ARRAY(SELECT jsonb_array_elements_text(p.search_enrichment->'compatibleWith'))
      || ARRAY(SELECT coalesce(p.search_enrichment->>'avoidFor', '')),
      ' '
    ),
    ''
  )
$$;

-- 6. Generated column with tsvector for full-text search on enrichment
-- NOTE: We create a helper function that can be used in queries instead of a generated column,
-- since IMMUTABLE functions on JSONB columns work better with query planning.

-- 7. RPC function: Search catalog products with enrichment-aware matching
-- Searches name, description, product_type (ILIKE) AND search_enrichment JSONB.
-- Returns products sorted by a simple relevance score:
--   3 = name match, 2 = description/product_type match, 1 = enrichment-only match
CREATE OR REPLACE FUNCTION search_catalog_enriched(
  p_query text,
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  product_type text,
  description text,
  price_usd numeric,
  weight_grams numeric,
  brand_id uuid,
  search_enrichment jsonb,
  match_source text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    cp.id,
    cp.name,
    cp.product_type,
    cp.description,
    cp.price_usd,
    cp.weight_grams,
    cp.brand_id,
    cp.search_enrichment,
    CASE
      WHEN cp.name ILIKE '%' || p_query || '%' THEN 'name'
      WHEN cp.description ILIKE '%' || p_query || '%' THEN 'description'
      WHEN cp.product_type ILIKE '%' || p_query || '%' THEN 'product_type'
      WHEN cp.search_enrichment IS NOT NULL
        AND catalog_enrichment_text(cp) ILIKE '%' || p_query || '%' THEN 'enrichment'
      ELSE 'unknown'
    END AS match_source
  FROM catalog_products cp
  WHERE
    cp.name ILIKE '%' || p_query || '%'
    OR cp.description ILIKE '%' || p_query || '%'
    OR cp.product_type ILIKE '%' || p_query || '%'
    OR (
      cp.search_enrichment IS NOT NULL
      AND catalog_enrichment_text(cp) ILIKE '%' || p_query || '%'
    )
  ORDER BY
    CASE
      WHEN cp.name ILIKE '%' || p_query || '%' THEN 1
      WHEN cp.description ILIKE '%' || p_query || '%' THEN 2
      WHEN cp.product_type ILIKE '%' || p_query || '%' THEN 3
      ELSE 4
    END,
    cp.name
  LIMIT p_limit
  OFFSET p_offset
$$;

COMMENT ON COLUMN catalog_products.search_enrichment IS 'LLM-generated semantic metadata for search discoverability (ReAG pattern). Contains useCases, alternativeSearchTerms, conditions, compatibleWith, avoidFor fields.';
COMMENT ON COLUMN catalog_products.enriched_at IS 'Timestamp of last LLM enrichment run for this product.';
