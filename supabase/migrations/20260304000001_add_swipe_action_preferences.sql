-- Migration: Add swipe action preferences to profiles table
-- Feature: Swipeable gear item cards in loadout details
-- Date: 2026-03-04

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  swipe_actions JSONB DEFAULT '{"swipeLeftPrimary":"remove","swipeLeftSecondary":"toggleConsumable","swipeRightPrimary":"toggleWorn","swipeRightSecondary":"duplicate"}'::jsonb;

COMMENT ON COLUMN profiles.swipe_actions IS 'Customizable swipe action configuration for loadout item cards on mobile/tablet';

-- Server-side validation: ensure required keys are present when not null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'swipe_actions_valid_structure'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT swipe_actions_valid_structure
      CHECK (
        swipe_actions IS NULL OR (
          swipe_actions ? 'swipeLeftPrimary' AND
          swipe_actions ? 'swipeLeftSecondary' AND
          swipe_actions ? 'swipeRightPrimary' AND
          swipe_actions ? 'swipeRightSecondary'
        )
      );
  END IF;
END $$;
