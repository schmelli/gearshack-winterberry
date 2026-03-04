-- Migration: Add swipe action preferences to profiles table
-- Feature: Swipeable gear item cards in loadout details
-- Date: 2026-03-04

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  swipe_actions JSONB DEFAULT '{"swipeLeftPrimary":"remove","swipeLeftSecondary":"toggleConsumable","swipeRightPrimary":"toggleWorn","swipeRightSecondary":"duplicate"}'::jsonb;

COMMENT ON COLUMN profiles.swipe_actions IS 'Customizable swipe action configuration for loadout item cards on mobile/tablet';
