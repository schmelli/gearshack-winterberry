-- Migration: Add composite index on gear_items for user context queries
-- Feature: Enhanced Memory Integration (Issue #110)
-- Date: 2025-12-29
--
-- Purpose:
-- Optimize queries that filter by user_id, status, and sort by created_at
-- Used by buildUserContext() when fetching inventory and wishlist items
--
-- Performance Impact:
-- - Inventory query: SELECT * FROM gear_items WHERE user_id = ? AND status = 'own'
-- - Wishlist query: SELECT * FROM gear_items WHERE user_id = ? AND status = 'wishlist'
-- - Both queries ORDER BY created_at DESC
--
-- Without index: Sequential scan (O(n) where n = total user gear items)
-- With index: Index scan (O(log n) + k where k = matching items)

-- ============================================================================
-- Create Composite Index
-- ============================================================================

-- This index supports:
-- 1. Filtering by user_id (most selective)
-- 2. Filtering by status (own/wishlist/sold)
-- 3. Sorting by created_at DESC (for recent items)
CREATE INDEX IF NOT EXISTS idx_gear_items_user_status_created
  ON gear_items(user_id, status, created_at DESC);

-- ============================================================================
-- Validation Script
-- ============================================================================

DO $$
DECLARE
  index_exists boolean;
  table_row_count bigint;
BEGIN
  -- Check if index was created
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'gear_items'
      AND indexname = 'idx_gear_items_user_status_created'
  ) INTO index_exists;

  IF NOT index_exists THEN
    RAISE EXCEPTION 'Index idx_gear_items_user_status_created was not created';
  END IF;

  -- Get table size
  SELECT COUNT(*) INTO table_row_count FROM gear_items;

  RAISE NOTICE 'Index created successfully on gear_items table';
  RAISE NOTICE 'Table contains % rows', table_row_count;
  RAISE NOTICE 'Index will optimize user_id + status filtering with created_at ordering';
END $$;

-- ============================================================================
-- Query Performance Test
-- ============================================================================

-- Test query pattern (replace with actual user_id for testing):
-- EXPLAIN ANALYZE
-- SELECT id, name, brand, category_id, weight_grams, status, created_at
-- FROM gear_items
-- WHERE user_id = 'YOUR_USER_ID'
--   AND status = 'own'
-- ORDER BY created_at DESC
-- LIMIT 10;
--
-- Expected EXPLAIN output:
-- -> Index Scan using idx_gear_items_user_status_created on gear_items
--    Index Cond: ((user_id = 'xxx') AND (status = 'own'))
--    Rows Removed by Filter: 0
