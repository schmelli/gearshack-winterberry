-- Migration: Add fuzzy search function for AI agent queryUserData tool
-- Feature: Issue #130 - Fuzzy search support for AI agent
-- Date: 2025-12-29
--
-- This function provides typo-tolerant fuzzy search for any text column
-- using PostgreSQL's pg_trgm extension (already enabled)

-- ============================================================================
-- VERIFY PG_TRGM EXTENSION
-- ============================================================================

-- Ensure pg_trgm extension is enabled (should already be, but verify)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- FUZZY SEARCH FUNCTION FOR QUERYUSERDATA TOOL
-- ============================================================================

CREATE OR REPLACE FUNCTION fuzzy_search_column(
  p_table_name TEXT,
  p_column_name TEXT,
  p_search_value TEXT,
  p_user_id UUID,
  p_similarity_threshold FLOAT DEFAULT 0.3,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  row_data JSONB,
  similarity_score FLOAT
) AS $$
DECLARE
  query TEXT;
  normalized_search TEXT;
  valid_column BOOLEAN := FALSE;
BEGIN
  -- Normalize search value
  normalized_search := LOWER(TRIM(p_search_value));

  -- Validate table name against whitelist
  IF p_table_name NOT IN ('gear_items', 'loadouts', 'categories', 'profiles', 'loadout_items') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  -- Validate column name against whitelist for each table
  -- This prevents SQL injection and schema probing
  CASE p_table_name
    WHEN 'gear_items' THEN
      valid_column := p_column_name IN ('name', 'brand', 'model', 'notes');
    WHEN 'loadouts' THEN
      valid_column := p_column_name IN ('name', 'description');
    WHEN 'categories' THEN
      valid_column := p_column_name IN ('label');
    WHEN 'profiles' THEN
      valid_column := p_column_name IN ('username', 'display_name');
    WHEN 'loadout_items' THEN
      valid_column := p_column_name IN ('notes');
  END CASE;

  IF NOT valid_column THEN
    RAISE EXCEPTION 'Invalid column name "%" for table "%"', p_column_name, p_table_name;
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

  -- Add RLS enforcement for ALL tables
  -- CRITICAL: SECURITY DEFINER bypasses RLS, so we must enforce manually
  IF p_table_name IN ('gear_items', 'loadouts') THEN
    query := query || format(' AND t.user_id = %L', p_user_id);
  ELSIF p_table_name = 'profiles' THEN
    query := query || format(' AND t.id = %L', p_user_id);
  ELSIF p_table_name = 'loadout_items' THEN
    -- loadout_items doesn't have user_id, so join with loadouts table
    query := format(
      'SELECT row_to_json(t.*)::jsonb AS row_data, ' ||
      'similarity(LOWER(t.%I), %L)::FLOAT AS similarity_score ' ||
      'FROM %I t ' ||
      'INNER JOIN loadouts l ON t.loadout_id = l.id ' ||
      'WHERE similarity(LOWER(t.%I), %L) > %s AND l.user_id = %L',
      p_column_name,
      normalized_search,
      p_table_name,
      p_column_name,
      normalized_search,
      p_similarity_threshold,
      p_user_id
    );
  ELSIF p_table_name = 'categories' THEN
    -- Categories table is global (no user ownership), no filtering needed
    -- This is intentional - all users can search all categories
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

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Create GIN indexes for trigram similarity matching
-- These significantly improve fuzzy search performance

-- gear_items indexes
CREATE INDEX IF NOT EXISTS idx_gear_items_name_trgm ON gear_items USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_gear_items_brand_trgm ON gear_items USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_gear_items_model_trgm ON gear_items USING gin (model gin_trgm_ops);

-- loadouts indexes
CREATE INDEX IF NOT EXISTS idx_loadouts_name_trgm ON loadouts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_loadouts_description_trgm ON loadouts USING gin (description gin_trgm_ops);

-- categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_label_trgm ON categories USING gin (label gin_trgm_ops);

-- profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin (display_name gin_trgm_ops);

-- ============================================================================
-- PERMISSIONS AND DOCUMENTATION
-- ============================================================================

-- Comments
COMMENT ON FUNCTION fuzzy_search_column IS 'Fuzzy search for any column in allowed tables using pg_trgm similarity with typo tolerance. Includes column validation and RLS enforcement. (AI agent queryUserData tool)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fuzzy_search_column TO authenticated;
