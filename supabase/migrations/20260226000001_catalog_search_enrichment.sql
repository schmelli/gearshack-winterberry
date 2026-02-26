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
--
-- NOTE: This migration supersedes the original two-migration split
-- (000001 + 000002). Both are combined here so the final schema state
-- is captured in a single, atomic migration. The DROP + CREATE
-- pattern from 000002 is no longer needed.

-- 1. Add JSONB column for enrichment data
ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS search_enrichment jsonb DEFAULT NULL;

-- 2. Add timestamp for tracking when enrichment was last run
ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz DEFAULT NULL;

-- 3. GIN index REMOVED: jsonb_path_ops only supports the @> containment operator,
-- but search_catalog_enriched() searches via ILIKE on text extracted by
-- catalog_enrichment_text(), so this index would never be used by the search function.
-- It consumed storage with no query benefit.
-- The partial index below (idx_catalog_products_unenriched) is the only index needed.

-- 4. Partial index to quickly find unenriched products
-- Used by scripts/enrich-catalog-items.ts to select rows WHERE search_enrichment IS NULL
CREATE INDEX IF NOT EXISTS idx_catalog_products_unenriched
  ON catalog_products (created_at)
  WHERE search_enrichment IS NULL;

-- 5. Create a SQL function for full-text search across enrichment fields
-- This converts the JSONB arrays into a searchable text representation.
-- Marked STABLE (not IMMUTABLE): the function reads a row-type argument whose
-- underlying column values can change between transactions.
CREATE OR REPLACE FUNCTION catalog_enrichment_text(p catalog_products)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    array_to_string(
      ARRAY(SELECT jsonb_array_elements_text(p.search_enrichment->'useCases'))
      || ARRAY(SELECT jsonb_array_elements_text(p.search_enrichment->'alternativeSearchTerms'))
      || ARRAY(SELECT jsonb_array_elements_text(p.search_enrichment->'conditions'))
      || ARRAY(SELECT jsonb_array_elements_text(p.search_enrichment->'compatibleWith'))
      -- avoidFor is a scalar string (not an array) in the enrichment schema.
      -- Use CASE instead of coalesce('', '') to avoid appending a spurious empty-string
      -- element when the field is absent — coalesce would add '' to the array, inserting
      -- an extra space separator and potentially matching whitespace-only ILIKE patterns.
      || CASE
           WHEN p.search_enrichment->>'avoidFor' IS NOT NULL
             THEN ARRAY[p.search_enrichment->>'avoidFor']
           ELSE ARRAY[]::text[]
         END,
      ' '
    ),
    ''
  )
$$;

-- 6. RPC function: Search catalog products with enrichment-aware matching
-- Searches name, description, product_type (ILIKE) AND search_enrichment JSONB.
-- Returns products sorted by a simple relevance score (when p_sort_by = 'relevance'):
--   1 = name match (highest relevance)
--   2 = description match
--   3 = product_type match
--   4 = enrichment-only match (lowest relevance)
-- All filtering, sorting, and pagination are handled at the DB level to ensure
-- correct pagination and sorting across the full result set (not a client-side subset).
--
-- NOTE: p_query arrives pre-escaped from TypeScript (escapeIlikeWildcards). PostgreSQL
-- ILIKE uses '\' as the default escape character, so \%, \_, \\ in the bound value are
-- interpreted correctly as literal %, _, \. Do NOT add SQL-level re-escaping here —
-- double-escaping corrupts queries with %, _, or \ (e.g. 'trail_shoe' → 'trail\\_shoe').
--
-- PERFORMANCE NOTE: ILIKE on catalog_enrichment_text() is an O(n) full-table scan on
-- the enrichment text. At pilot scale this is acceptable, but for large catalogs consider
-- adding a generated tsvector column (tsvector type, GENERATED ALWAYS AS ... STORED) with
-- a GIN index. This would provide O(log n) full-text search while eliminating the need
-- for catalog_enrichment_text() at query time.
CREATE OR REPLACE FUNCTION search_catalog_enriched(
  p_query text,
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0,
  p_brand_ids uuid[] DEFAULT NULL,
  p_max_weight numeric DEFAULT NULL,
  p_min_weight numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sort_by text DEFAULT 'relevance'
)
RETURNS TABLE (
  id uuid,
  name text,
  product_type text,
  description text,
  price_usd numeric,
  weight_grams numeric,
  brand_id uuid,
  brand_name text,
  search_enrichment jsonb,
  match_source text
)
LANGUAGE sql
STABLE
AS $$
  -- NOTE: p_query is expected to already be ILIKE-escaped by the caller
  -- (TypeScript: escapeIlikeWildcards escapes \, %, _). Do NOT re-escape here —
  -- double-escaping corrupts queries containing underscores or backslashes.
  -- Example: "trail_shoe" → TS escapes to "trail\_shoe" → SQL re-escape would
  -- produce "trail\\_shoe" which matches the literal string "trail\_shoe", not "trail_shoe".
  -- PostgreSQL bound parameters prevent SQL injection; single-layer escaping is sufficient.
  SELECT
    cp.id,
    cp.name,
    cp.product_type,
    cp.description,
    cp.price_usd,
    cp.weight_grams,
    cp.brand_id,
    cb.name AS brand_name,
    cp.search_enrichment,
    -- Derive match_source from the pre-computed relevance_score in enr_scored.
    -- All ILIKE evaluations happen ONCE in the enr_scored LATERAL below —
    -- this SELECT does not re-evaluate any ILIKE predicate.
    CASE enr_scored.relevance_score
      WHEN 1 THEN 'name'
      WHEN 2 THEN 'description'
      WHEN 3 THEN 'product_type'
      WHEN 4 THEN 'enrichment'
      ELSE 'unknown'
    END AS match_source
  FROM catalog_products cp
  -- LEFT JOIN so products with no brand (brand_id IS NULL) are still returned.
  -- brand_name returned directly here avoids a secondary round-trip from the caller.
  LEFT JOIN catalog_brands cb ON cp.brand_id = cb.id
  -- First LATERAL: compute catalog_enrichment_text(cp) exactly ONCE per row.
  -- Without LATERAL, calling catalog_enrichment_text in both the WHERE and SELECT
  -- clauses would double per-row work.
  CROSS JOIN LATERAL (
    SELECT
      CASE
        WHEN cp.search_enrichment IS NOT NULL THEN catalog_enrichment_text(cp)
        ELSE NULL
      END AS enr_text
  ) enr_text_computed
  -- Second LATERAL: compute relevance_score once using the pre-computed enr_text.
  -- WHERE, SELECT (match_source), and ORDER BY all reference enr_scored.relevance_score —
  -- this eliminates triple re-evaluation of name/description/product_type ILIKE predicates
  -- across the three clauses.
  --   1 = name match (highest relevance)
  --   2 = description match
  --   3 = product_type match
  --   4 = enrichment-only match (lowest relevance)
  --   5 = no match (filtered out by WHERE enr_scored.relevance_score <= 4)
  CROSS JOIN LATERAL (
    SELECT
      CASE
        WHEN cp.name ILIKE '%' || p_query || '%' THEN 1
        WHEN cp.description ILIKE '%' || p_query || '%' THEN 2
        WHEN cp.product_type ILIKE '%' || p_query || '%' THEN 3
        WHEN enr_text_computed.enr_text IS NOT NULL
          AND enr_text_computed.enr_text ILIKE '%' || p_query || '%' THEN 4
        ELSE 5
      END AS relevance_score
  ) enr_scored
  WHERE
    enr_scored.relevance_score <= 4  -- matched at least one field
    AND (p_brand_ids IS NULL OR cp.brand_id = ANY(p_brand_ids))
    AND (p_max_weight IS NULL OR cp.weight_grams <= p_max_weight)
    AND (p_min_weight IS NULL OR cp.weight_grams >= p_min_weight)
    AND (p_max_price IS NULL OR cp.price_usd <= p_max_price)
  ORDER BY
    -- Use pre-computed relevance_score — no ILIKE re-evaluation in ORDER BY.
    CASE WHEN p_sort_by = 'relevance' THEN enr_scored.relevance_score ELSE 0 END ASC,
    -- Weight sorting (only one of these is non-NULL at a time)
    CASE WHEN p_sort_by = 'weight_asc' THEN cp.weight_grams END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'weight_desc' THEN cp.weight_grams END DESC NULLS LAST,
    -- Price sorting (only one of these is non-NULL at a time)
    CASE WHEN p_sort_by = 'price_asc' THEN cp.price_usd END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price_desc' THEN cp.price_usd END DESC NULLS LAST,
    -- Name as final tiebreaker for all sort modes
    cp.name ASC
  LIMIT p_limit
  OFFSET p_offset
$$;

-- Grant PostgREST roles access to the helper and RPC functions.
-- Both anon (unauthenticated) and authenticated roles need EXECUTE so the
-- functions are callable via the Supabase client / PostgREST HTTP layer.
--
-- DESIGN DECISION: anon (unauthenticated) access is intentional.
-- The product catalog is a public, read-only resource — browsable without login,
-- similar to a public storefront. Restricting to authenticated only would prevent
-- the gear assistant from searching the catalog on behalf of unauthenticated users.
-- If catalog access ever needs to be restricted, remove the anon grant here.
GRANT EXECUTE ON FUNCTION catalog_enrichment_text(catalog_products) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_catalog_enriched(text, int, int, uuid[], numeric, numeric, numeric, text) TO anon, authenticated;

COMMENT ON COLUMN catalog_products.search_enrichment IS 'LLM-generated semantic metadata for search discoverability (ReAG pattern). Contains useCases, alternativeSearchTerms, conditions, compatibleWith, avoidFor fields.';
COMMENT ON COLUMN catalog_products.enriched_at IS 'Timestamp of last LLM enrichment run for this product.';

-- Document the helper function for SQL-level callers.
-- This function is called internally by search_catalog_enriched() via LATERAL subquery —
-- not intended to be called directly. It has no p_query parameter; escaping concerns
-- apply only to search_catalog_enriched() which passes p_query into ILIKE patterns.
COMMENT ON FUNCTION catalog_enrichment_text(catalog_products) IS
  'Converts search_enrichment JSONB arrays (useCases, alternativeSearchTerms, conditions, '
  'compatibleWith, avoidFor) into a single space-separated text string for ILIKE matching. '
  'Called internally by search_catalog_enriched() via CROSS JOIN LATERAL — not for direct use. '
  'Returns empty string when search_enrichment IS NULL.';

COMMENT ON FUNCTION search_catalog_enriched IS
  'Enrichment-aware catalog search RPC. Searches name, description, product_type '
  'and search_enrichment JSONB via ILIKE. LEFT JOINs catalog_brands to return '
  'brand_name directly, eliminating a secondary round-trip from the caller. '
  'All filtering, sorting, and pagination are handled at the DB level. '
  'p_query must be pre-escaped by the caller (TypeScript: escapeIlikeWildcards). '
  'Uses two LATERAL subqueries to compute enrichment text and relevance score once '
  'per row, avoiding ILIKE re-evaluation across WHERE, SELECT, and ORDER BY clauses. '
  'p_sort_by accepted values: ''relevance'' | ''weight_asc'' | ''weight_desc'' | '
  '''price_asc'' | ''price_desc''. Unknown values silently fall back to cp.name ASC '
  '(the final tiebreaker ORDER BY clause).';
