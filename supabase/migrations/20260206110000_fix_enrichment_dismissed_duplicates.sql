-- Migration: Fix enrichment dismissed duplicates
-- Date: 2026-02-06
--
-- Problem: The unique index only prevents PENDING duplicates.
-- When a suggestion is dismissed, the same suggestion can be created again.
-- This causes users to see the same rejected suggestions repeatedly.
--
-- Solution: Change the unique index to prevent duplicates for both
-- 'pending' AND 'dismissed' status. Only 'accepted' suggestions can
-- be recreated (in case the user later modifies the item).

-- Drop the old index that only checked pending
DROP INDEX IF EXISTS idx_enrichment_unique_pending;

-- Clean up existing duplicates by keeping only the most recent one
-- for each (gear_item_id, catalog_product_id) combination where status is pending or dismissed
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY gear_item_id, catalog_product_id
      ORDER BY created_at DESC
    ) as rn
  FROM gear_enrichment_suggestions
  WHERE status IN ('pending', 'dismissed')
)
DELETE FROM gear_enrichment_suggestions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Create new index that prevents duplicates for pending OR dismissed
CREATE UNIQUE INDEX idx_enrichment_unique_pending_or_dismissed
  ON gear_enrichment_suggestions(gear_item_id, catalog_product_id)
  WHERE status IN ('pending', 'dismissed');

-- Comment explaining the fix
COMMENT ON INDEX idx_enrichment_unique_pending_or_dismissed IS
  'Prevents duplicate suggestions for the same gear_item + catalog_product combination when status is pending or dismissed. Accepted suggestions can be recreated if the user later modifies the item.';
