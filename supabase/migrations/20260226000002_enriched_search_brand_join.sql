-- Migration: Add brand_name to search_catalog_enriched() return columns
-- Eliminates a secondary round-trip to catalog_brands that previously happened
-- in the TypeScript caller after getting brand_ids from the RPC.
--
-- Previously: RPC returned brand_id → TS did a second SELECT on catalog_brands
-- Now:        RPC LEFT JOINs catalog_brands and returns brand_name directly
--
-- This is a DROP + CREATE because PostgreSQL requires matching signatures when
-- using CREATE OR REPLACE on functions that change their RETURNS TABLE columns.

DROP FUNCTION IF EXISTS search_catalog_enriched(
  text, int, int, uuid[], numeric, numeric, numeric, text
);

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
    CASE
      WHEN cp.name ILIKE '%' || p_query || '%' THEN 'name'
      WHEN cp.description ILIKE '%' || p_query || '%' THEN 'description'
      WHEN cp.product_type ILIKE '%' || p_query || '%' THEN 'product_type'
      WHEN enr.enr_text IS NOT NULL AND enr.enr_text ILIKE '%' || p_query || '%' THEN 'enrichment'
      ELSE 'unknown'
    END AS match_source
  FROM catalog_products cp
  -- LEFT JOIN so products with no brand (brand_id IS NULL) are still returned.
  LEFT JOIN catalog_brands cb ON cp.brand_id = cb.id
  -- LATERAL subquery computes catalog_enrichment_text(cp) exactly ONCE per row.
  -- Without LATERAL, the function would be called once in WHERE and once in SELECT,
  -- doubling per-row work. LATERAL binds the result to `enr.enr_text` so both
  -- clauses reuse the single computed value.
  CROSS JOIN LATERAL (
    SELECT
      CASE
        WHEN cp.search_enrichment IS NOT NULL THEN catalog_enrichment_text(cp)
        ELSE NULL
      END AS enr_text
  ) enr
  WHERE
    (
      cp.name ILIKE '%' || p_query || '%'
      OR cp.description ILIKE '%' || p_query || '%'
      OR cp.product_type ILIKE '%' || p_query || '%'
      OR (enr.enr_text IS NOT NULL AND enr.enr_text ILIKE '%' || p_query || '%')
    )
    AND (p_brand_ids IS NULL OR cp.brand_id = ANY(p_brand_ids))
    AND (p_max_weight IS NULL OR cp.weight_grams <= p_max_weight)
    AND (p_min_weight IS NULL OR cp.weight_grams >= p_min_weight)
    AND (p_max_price IS NULL OR cp.price_usd <= p_max_price)
  ORDER BY
    -- Relevance score: only active when p_sort_by = 'relevance' (ORDER BY ASC, lower = better)
    --   1 = name match (highest relevance)
    --   2 = description match
    --   3 = product_type match
    --   4 = enrichment-only match (lowest relevance)
    CASE WHEN p_sort_by = 'relevance' THEN
      CASE
        WHEN cp.name ILIKE '%' || p_query || '%' THEN 1
        WHEN cp.description ILIKE '%' || p_query || '%' THEN 2
        WHEN cp.product_type ILIKE '%' || p_query || '%' THEN 3
        ELSE 4
      END
    ELSE 0
    END ASC,
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

-- Grant PostgREST roles access to the RPC functions.
-- DROP + CREATE removes any previously granted permissions, so GRANTs must be re-issued here.
-- Both anon (unauthenticated) and authenticated roles need EXECUTE so the functions are
-- callable via the Supabase client / PostgREST HTTP layer. Without this, calling
-- supabase.rpc('search_catalog_enriched', ...) silently fails and falls back to ILIKE.
GRANT EXECUTE ON FUNCTION search_catalog_enriched(text, int, int, uuid[], numeric, numeric, numeric, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION catalog_enrichment_text(catalog_products) TO anon, authenticated;

COMMENT ON FUNCTION search_catalog_enriched IS
  'Enrichment-aware catalog search RPC. Searches name, description, product_type '
  'and search_enrichment JSONB via ILIKE. LEFT JOINs catalog_brands to return '
  'brand_name directly, eliminating a secondary round-trip from the caller. '
  'All filtering, sorting, and pagination are handled at the DB level. '
  'p_query must be pre-escaped by the caller (TypeScript: escapeIlikeWildcards).';
