-- Migration: Add composite index for loadout image cleanup query
-- Feature: 048-ai-loadout-image-gen (performance optimization)
--
-- This index optimizes the cleanup query that fetches images for a specific loadout
-- ordered by generation_timestamp DESC (used in cleanupOldImages function).
--
-- The composite index (loadout_id, generation_timestamp DESC) is more efficient than
-- using two separate single-column indexes.

BEGIN;

-- Create composite index for cleanup query optimization
-- Supports: SELECT * FROM generated_images
--           WHERE loadout_id = ?
--           ORDER BY generation_timestamp DESC
CREATE INDEX IF NOT EXISTS idx_generated_images_loadout_timestamp
ON generated_images(loadout_id, generation_timestamp DESC);

-- Note: We keep the existing single-column indexes as they may be useful for other queries:
-- - idx_generated_images_loadout_id (for simple loadout_id lookups)
-- - idx_generated_images_generation_timestamp (for global timestamp queries)

COMMIT;
