-- Migration: Fix RLS policies and add constraints for generated_images
-- Feature: 048-ai-loadout-image-gen (Security fixes)
-- Addresses code review findings

BEGIN;

-- Drop existing RLS policy (inefficient subquery)
DROP POLICY IF EXISTS "Users can manage their own loadout images" ON generated_images;

-- Create separate, optimized RLS policies with EXISTS

-- Policy for SELECT operations
CREATE POLICY "Users can view their own loadout images"
ON generated_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM loadouts
    WHERE loadouts.id = generated_images.loadout_id
      AND loadouts.user_id = auth.uid()
  )
);

-- Policy for INSERT operations
CREATE POLICY "Users can insert images for their own loadouts"
ON generated_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM loadouts
    WHERE loadouts.id = generated_images.loadout_id
      AND loadouts.user_id = auth.uid()
  )
);

-- Policy for UPDATE operations
CREATE POLICY "Users can update their own loadout images"
ON generated_images
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM loadouts
    WHERE loadouts.id = generated_images.loadout_id
      AND loadouts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM loadouts
    WHERE loadouts.id = generated_images.loadout_id
      AND loadouts.user_id = auth.uid()
  )
);

-- Policy for DELETE operations
CREATE POLICY "Users can delete their own loadout images"
ON generated_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM loadouts
    WHERE loadouts.id = generated_images.loadout_id
      AND loadouts.user_id = auth.uid()
  )
);

-- Add partial unique index to prevent multiple active images per loadout
-- This prevents data integrity issues where multiple images could be marked as active
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_images_unique_active
  ON generated_images(loadout_id)
  WHERE is_active = TRUE;

-- Remove redundant index (covered by composite index on line 23 of original migration)
-- The composite index idx_generated_images_is_active already covers loadout_id queries
DROP INDEX IF EXISTS idx_generated_images_loadout_id;

COMMIT;
