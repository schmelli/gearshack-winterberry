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
  p_limit INT DEFAULT 50,
  p_filters JSONB DEFAULT NULL,
  p_range_column TEXT DEFAULT NULL,
  p_range_min NUMERIC DEFAULT NULL,
  p_range_max NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  row_data JSONB,
  similarity_score FLOAT
) AS $$
DECLARE
  query TEXT;
  normalized_search TEXT;
  valid_column BOOLEAN := FALSE;
  filter_key TEXT;
  filter_value TEXT;
  where_clauses TEXT[] := ARRAY[]::TEXT[];
  final_where TEXT;
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
      valid_column := p_column_name IN ('name', 'brand', 'notes');  -- model column not in current schema
    WHEN 'loadouts' THEN
      valid_column := p_column_name IN ('name', 'description');
    WHEN 'categories' THEN
      valid_column := p_column_name IN ('label');
    WHEN 'profiles' THEN
      valid_column := p_column_name IN ('display_name');  -- username column not in current schema
    WHEN 'loadout_items' THEN
      valid_column := p_column_name IN ('notes');
  END CASE;

  IF NOT valid_column THEN
    RAISE EXCEPTION 'Invalid column name "%" for table "%"', p_column_name, p_table_name;
  END IF;

  -- Build initial WHERE clauses array with similarity condition
  where_clauses := array_append(where_clauses,
    format('similarity(LOWER(%I), %L) > %s', p_column_name, normalized_search, p_similarity_threshold)
  );

  -- Add RLS enforcement for ALL tables
  -- CRITICAL: SECURITY DEFINER bypasses RLS, so we must enforce manually
  IF p_table_name IN ('gear_items', 'loadouts') THEN
    where_clauses := array_append(where_clauses, format('t.user_id = %L', p_user_id));
  ELSIF p_table_name = 'profiles' THEN
    where_clauses := array_append(where_clauses, format('t.id = %L', p_user_id));
  ELSIF p_table_name = 'categories' THEN
    -- Categories table is global (no user ownership), no filtering needed
    -- This is intentional - all users can search all categories
    NULL; -- Explicit no-op for clarity
  END IF;

  -- Apply additional exact-match filters from p_filters JSONB
  IF p_filters IS NOT NULL THEN
    FOR filter_key, filter_value IN SELECT * FROM jsonb_each_text(p_filters)
    LOOP
      -- Add exact match filter (handles strings, numbers, booleans via text conversion)
      -- NULL values handled separately
      IF filter_value = 'null' THEN
        where_clauses := array_append(where_clauses, format('%I IS NULL', filter_key));
      ELSE
        where_clauses := array_append(where_clauses, format('%I = %L', filter_key, filter_value));
      END IF;
    END LOOP;
  END IF;

  -- Apply range filter if specified
  IF p_range_column IS NOT NULL THEN
    IF p_range_min IS NOT NULL THEN
      where_clauses := array_append(where_clauses, format('%I >= %s', p_range_column, p_range_min));
    END IF;
    IF p_range_max IS NOT NULL THEN
      where_clauses := array_append(where_clauses, format('%I <= %s', p_range_column, p_range_max));
    END IF;
  END IF;

  -- Build the final WHERE clause by joining all conditions with AND
  final_where := array_to_string(where_clauses, ' AND ');

  -- Handle loadout_items separately (needs join with loadouts for RLS)
  IF p_table_name = 'loadout_items' THEN
    -- Add loadout ownership check via JOIN
    where_clauses := array_append(where_clauses, format('l.user_id = %L', p_user_id));
    final_where := array_to_string(where_clauses, ' AND ');

    query := format(
      'SELECT row_to_json(t.*)::jsonb AS row_data, ' ||
      'similarity(LOWER(t.%I), %L)::FLOAT AS similarity_score ' ||
      'FROM %I t ' ||
      'INNER JOIN loadouts l ON t.loadout_id = l.id ' ||
      'WHERE %s',
      p_column_name,
      normalized_search,
      p_table_name,
      final_where
    );
  ELSE
    -- Standard query for tables with direct user_id or global tables
    query := format(
      'SELECT row_to_json(t.*)::jsonb AS row_data, ' ||
      'similarity(LOWER(%I), %L)::FLOAT AS similarity_score ' ||
      'FROM %I t ' ||
      'WHERE %s',
      p_column_name,
      normalized_search,
      p_table_name,
      final_where
    );
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
-- Note: model column doesn't exist in current schema, index removed

-- loadouts indexes
CREATE INDEX IF NOT EXISTS idx_loadouts_name_trgm ON loadouts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_loadouts_description_trgm ON loadouts USING gin (description gin_trgm_ops);

-- categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_label_trgm ON categories USING gin (label gin_trgm_ops);

-- profiles indexes
-- Note: username column doesn't exist in current schema, index removed
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin (display_name gin_trgm_ops);

-- ============================================================================
-- PERMISSIONS AND DOCUMENTATION
-- ============================================================================

-- Comments (specifying signature to avoid ambiguity with overloaded versions)
COMMENT ON FUNCTION fuzzy_search_column(TEXT, TEXT, TEXT, UUID, FLOAT, INT, JSONB, TEXT, NUMERIC, NUMERIC) IS 'Fuzzy search for any column in allowed tables using pg_trgm similarity with typo tolerance. Includes column validation and RLS enforcement. (AI agent queryUserData tool)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fuzzy_search_column(TEXT, TEXT, TEXT, UUID, FLOAT, INT, JSONB, TEXT, NUMERIC, NUMERIC) TO authenticated;
