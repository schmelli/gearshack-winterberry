-- Migration: Fix unique constraint on is_active flag
-- Feature: 048-ai-loadout-image-gen (database consistency)
--
-- Problem: The original migration created a partial INDEX instead of a UNIQUE constraint.
-- This allows multiple images to have is_active = TRUE for the same loadout.
--
-- Solution: Replace the partial index with a unique partial index to enforce
-- database-level constraint that only one image can be active per loadout.

BEGIN;

-- Drop the old non-unique partial index
DROP INDEX IF EXISTS idx_generated_images_is_active;

-- Create a UNIQUE partial index to enforce one active image per loadout
-- This ensures database-level consistency even if application logic fails
CREATE UNIQUE INDEX idx_generated_images_unique_active
  ON generated_images(loadout_id)
  WHERE is_active = TRUE;

-- Add comment for documentation
COMMENT ON INDEX idx_generated_images_unique_active IS
  'Ensures only one image can be active per loadout at the database level. Prevents race conditions and application bugs from creating inconsistent state.';

COMMIT;
