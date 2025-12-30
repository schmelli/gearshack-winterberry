-- Migration: Create fuzzy brand search function using pg_trgm
-- Feature: 044-intelligence-integration
-- Date: 2025-12-11
--
-- This function provides typo-tolerant fuzzy search for brand names
-- using PostgreSQL's pg_trgm extension (already enabled in catalog_tables migration)

-- ============================================================================
-- FUZZY BRAND SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION search_brands_fuzzy(
  search_query TEXT,
  match_threshold FLOAT DEFAULT 0.3,
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  website_url TEXT,
  similarity FLOAT
) AS $$
BEGIN
  -- Return brands matching the search query using trigram similarity
  -- This handles typos by comparing character trigrams (3-character sequences)
  -- Example: "Hillberg" will match "Hilleberg" because they share many trigrams
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.logo_url,
    b.website_url,
    similarity(b.name_normalized, lower(trim(search_query)))::FLOAT AS similarity
  FROM catalog_brands b
  WHERE similarity(b.name_normalized, lower(trim(search_query))) > match_threshold
     OR b.name_normalized ILIKE '%' || lower(trim(search_query)) || '%'
  ORDER BY similarity DESC, b.name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON FUNCTION search_brands_fuzzy IS 'Fuzzy search for brands using pg_trgm trigram similarity with typo tolerance';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_brands_fuzzy TO authenticated;
