-- Migration: Add trigger to automatically sync is_active flags
-- Feature: 048-ai-loadout-image-gen (race condition prevention)
--
-- This trigger ensures that when an image is set to is_active = TRUE,
-- all other images for the same loadout are automatically set to FALSE.
-- This prevents race conditions when multiple requests try to set active images concurrently.

BEGIN;

-- Create function to sync active image flags
CREATE OR REPLACE FUNCTION sync_active_image()
RETURNS TRIGGER AS $
BEGIN
  -- When an image is set to active, deactivate all other images for this loadout
  IF NEW.is_active = TRUE AND (OLD.is_active IS NULL OR OLD.is_active = FALSE) THEN
    UPDATE generated_images
    SET is_active = FALSE
    WHERE loadout_id = NEW.loadout_id
      AND id != NEW.id
      AND is_active = TRUE;
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger that fires AFTER UPDATE on generated_images
-- Using AFTER UPDATE ensures the new row is already committed before we update others
CREATE TRIGGER sync_active_image_trigger
  AFTER UPDATE OF is_active ON generated_images
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION sync_active_image();

-- Add comment for documentation
COMMENT ON FUNCTION sync_active_image() IS 'Automatically deactivates other images when one is set as active for a loadout. Prevents race conditions in concurrent updates.';

COMMIT;
