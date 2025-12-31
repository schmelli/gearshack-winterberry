-- Migration: Add filters and range support to fuzzy search
-- Feature: Issue #130 - Fuzzy search support for AI agent
-- Date: 2025-12-29
--
-- This migration extends fuzzy_search_column to support filters and range parameters
-- that were previously bypassed in fuzzy search queries.

-- ============================================================================
-- DROP OLD FUNCTION AND CREATE NEW VERSION WITH FILTERS/RANGE SUPPORT
-- ============================================================================

DROP FUNCTION IF EXISTS fuzzy_search_column(TEXT, TEXT, TEXT, UUID, FLOAT, INT);

CREATE OR REPLACE FUNCTION fuzzy_search_column(
  p_table_name TEXT,
  p_column_name TEXT,
  p_search_value TEXT,
  p_user_id UUID,
  p_similarity_threshold FLOAT DEFAULT 0.3,
  p_limit INT DEFAULT 50,
  p_filters JSONB DEFAULT NULL,
  p_range_column TEXT DEFAULT NULL,
  p_range_min FLOAT DEFAULT NULL,
  p_range_max FLOAT DEFAULT NULL
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
  where_clauses TEXT := '';
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

  -- Build the base query for non-loadout_items tables
  IF p_table_name != 'loadout_items' THEN
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
  ELSE
    -- loadout_items needs to join with loadouts for RLS
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
  END IF;

  -- Add RLS enforcement for tables with user ownership
  IF p_table_name IN ('gear_items', 'loadouts') THEN
    query := query || format(' AND t.user_id = %L', p_user_id);
  ELSIF p_table_name = 'profiles' THEN
    query := query || format(' AND t.id = %L', p_user_id);
  ELSIF p_table_name = 'categories' THEN
    -- Categories table is global (no user ownership), no filtering needed
    -- This is intentional - all users can search all categories
    NULL;
  END IF;

  -- Apply exact match filters if provided
  IF p_filters IS NOT NULL THEN
    FOR filter_key, filter_value IN SELECT key, value::text FROM jsonb_each_text(p_filters)
    LOOP
      -- Validate filter column names to prevent SQL injection
      valid_column := FALSE;
      CASE p_table_name
        WHEN 'gear_items' THEN
          valid_column := filter_key IN ('status', 'category_id', 'brand', 'model', 'name', 'notes', 'is_consumable');
        WHEN 'loadouts' THEN
          valid_column := filter_key IN ('activity_types', 'seasons', 'is_template', 'name', 'description');
        WHEN 'categories' THEN
          valid_column := filter_key IN ('parent_id', 'label', 'icon');
        WHEN 'profiles' THEN
          valid_column := filter_key IN ('username', 'display_name', 'subscription_tier');
        WHEN 'loadout_items' THEN
          valid_column := filter_key IN ('loadout_id', 'gear_item_id', 'quantity', 'notes');
      END CASE;

      IF NOT valid_column THEN
        RAISE EXCEPTION 'Invalid filter column "%" for table "%"', filter_key, p_table_name;
      END IF;

      -- Add filter to WHERE clause
      -- Handle NULL values
      IF filter_value = 'null' OR filter_value IS NULL THEN
        query := query || format(' AND t.%I IS NULL', filter_key);
      ELSE
        query := query || format(' AND t.%I = %L', filter_key, filter_value);
      END IF;
    END LOOP;
  END IF;

  -- Apply range filter if provided
  IF p_range_column IS NOT NULL THEN
    -- Validate range column name
    valid_column := FALSE;
    CASE p_table_name
      WHEN 'gear_items' THEN
        valid_column := p_range_column IN ('weight_grams', 'price_paid', 'quantity');
      WHEN 'loadouts' THEN
        valid_column := p_range_column IN ('total_weight');
      WHEN 'loadout_items' THEN
        valid_column := p_range_column IN ('quantity');
      ELSE
        valid_column := FALSE;
    END CASE;

    IF NOT valid_column THEN
      RAISE EXCEPTION 'Invalid range column "%" for table "%"', p_range_column, p_table_name;
    END IF;

    -- Add range conditions
    IF p_range_min IS NOT NULL THEN
      query := query || format(' AND t.%I >= %s', p_range_column, p_range_min);
    END IF;
    IF p_range_max IS NOT NULL THEN
      query := query || format(' AND t.%I <= %s', p_range_column, p_range_max);
    END IF;
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
-- PERMISSIONS AND DOCUMENTATION
-- ============================================================================

-- Comments
COMMENT ON FUNCTION fuzzy_search_column IS 'Fuzzy search with filters and range support for any column in allowed tables using pg_trgm similarity. Includes column validation and RLS enforcement. (AI agent queryUserData tool)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fuzzy_search_column TO authenticated;
