-- Migration: Add fuzzy search function for AI agent queryUserData tool
-- Feature: Issue #130 - Fuzzy search support for AI agent
-- Date: 2025-12-29
--
-- This function provides typo-tolerant fuzzy search for any text column
-- using PostgreSQL's pg_trgm extension (already enabled)

-- ============================================================================
-- FUZZY SEARCH FUNCTION FOR QUERYUSERDATA TOOL
-- ============================================================================

CREATE OR REPLACE FUNCTION fuzzy_search_column(
  p_table_name TEXT,
  p_column_name TEXT,
  p_search_value TEXT,
  p_user_id UUID,
  p_similarity_threshold FLOAT DEFAULT 0.3,
  p_additional_filters JSONB DEFAULT '{}'::JSONB,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  row_data JSONB,
  similarity_score FLOAT
) AS $$
DECLARE
  query TEXT;
  normalized_search TEXT;
BEGIN
  -- Normalize search value
  normalized_search := LOWER(TRIM(p_search_value));

  -- Build dynamic query based on table
  -- Note: This is safe because table_name is validated against allowed tables
  IF p_table_name NOT IN ('gear_items', 'loadouts', 'categories', 'profiles', 'loadout_items') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  -- Build the query dynamically
  query := format(
    'SELECT row_to_json(t.*)::jsonb AS row_data, ' ||
    'similarity(LOWER(%I), %L)::FLOAT AS similarity_score ' ||
    'FROM %I t ' ||
    'WHERE similarity(LOWER(%I), %L) > %s',
    p_column_name,
    normalized_search,
    p_table_name,
    p_column_name,
    normalized_search,
    p_similarity_threshold
  );

  -- Add user_id filter for tables that have it
  IF p_table_name IN ('gear_items', 'loadouts') THEN
    query := query || format(' AND t.user_id = %L', p_user_id);
  ELSIF p_table_name = 'profiles' THEN
    query := query || format(' AND t.id = %L', p_user_id);
  END IF;

  -- Add ordering and limit
  query := query || format(
    ' ORDER BY similarity_score DESC, %I ASC LIMIT %s',
    p_column_name,
    p_limit
  );

  -- Execute and return results
  RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION fuzzy_search_column IS 'Fuzzy search for any column in allowed tables using pg_trgm similarity with typo tolerance (for AI agent queryUserData tool)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fuzzy_search_column TO authenticated;
