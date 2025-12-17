-- Migration: Clear GearGraph cache to fix collision issue
-- Date: 2025-12-17
-- Issue: Cache keys were not unique, causing different products to show same insights
-- Solution: Updated cache key generation with explicit NULL markers

BEGIN;

-- Delete all GearGraph cache entries
-- Users will get fresh insights on next request
DELETE FROM api_cache
WHERE service = 'geargraph';

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Cleared GearGraph cache to fix collision issue';
END $$;

COMMIT;
