-- Hybrid search function combining text and semantic similarity
-- Feature: 042-catalog-sync-api (Phase 4 - Semantic Search)
--
-- Combines fuzzy text matching (pg_trgm) with vector similarity (pgvector)
-- Default weighting: 70% text similarity + 30% semantic similarity

CREATE OR REPLACE FUNCTION search_products_hybrid(
  search_query text,
  query_embedding vector(1536),
  weight_text float DEFAULT 0.7,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  brand_id uuid,
  brand_name text,
  product_type text,
  product_type_id uuid,
  description text,
  price_usd numeric,
  weight_grams int,
  text_score float,
  semantic_score float,
  combined_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_query text;
BEGIN
  -- Normalize query for text matching
  normalized_query := lower(trim(search_query));

  RETURN QUERY
  SELECT
    cp.id,
    cp.name,
    cp.brand_id,
    cb.name as brand_name,
    cp.product_type,
    cp.product_type_id,
    cp.description,
    cp.price_usd,
    cp.weight_grams,
    similarity(lower(cp.name), normalized_query)::float as text_score,
    CASE
      WHEN cp.embedding IS NOT NULL
      THEN (1 - (cp.embedding <=> query_embedding))::float
      ELSE 0::float
    END as semantic_score,
    (
      weight_text * similarity(lower(cp.name), normalized_query) +
      (1 - weight_text) * COALESCE(1 - (cp.embedding <=> query_embedding), 0)
    )::float as combined_score
  FROM catalog_products cp
  LEFT JOIN catalog_brands cb ON cp.brand_id = cb.id
  WHERE
    -- Text match threshold (pg_trgm similarity)
    similarity(lower(cp.name), normalized_query) > 0.1
    OR
    -- Semantic match threshold (vector similarity)
    (cp.embedding IS NOT NULL AND (1 - (cp.embedding <=> query_embedding)) > 0.5)
  ORDER BY combined_score DESC
  LIMIT max_results;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_products_hybrid(text, vector, float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_hybrid(text, vector, float, int) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION search_products_hybrid IS
  'Performs hybrid search combining fuzzy text matching (pg_trgm) with semantic similarity (pgvector). Default weighting: 70% text + 30% semantic. Returns products ordered by combined score.';
