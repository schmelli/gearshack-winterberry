-- Semantic search function for catalog products
-- Feature: 042-catalog-sync-api (Phase 4 - Semantic Search)
--
-- Performs vector similarity search using cosine distance
-- Returns products with similarity scores above the threshold

CREATE OR REPLACE FUNCTION search_products_semantic(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
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
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    (1 - (cp.embedding <=> query_embedding))::float as similarity
  FROM catalog_products cp
  LEFT JOIN catalog_brands cb ON cp.brand_id = cb.id
  WHERE cp.embedding IS NOT NULL
    AND (1 - (cp.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY cp.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_products_semantic(vector, float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_semantic(vector, float, int) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION search_products_semantic IS
  'Performs semantic similarity search on catalog products using pgvector cosine distance. Returns products with similarity above threshold, ordered by relevance.';
