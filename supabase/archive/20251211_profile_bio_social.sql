-- Migration: Add bio and social links fields to profiles table
-- Feature: 041-loadout-ux-profile (extended)
-- Date: 2025-12-11

-- Add profile detail columns (all nullable for existing users)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trail_name TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS youtube TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- Add constraints for field lengths
ALTER TABLE profiles
  ADD CONSTRAINT profiles_trail_name_length
    CHECK (trail_name IS NULL OR char_length(trail_name) <= 30);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_bio_length
    CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_instagram_length
    CHECK (instagram IS NULL OR char_length(instagram) <= 200);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_facebook_length
    CHECK (facebook IS NULL OR char_length(facebook) <= 200);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_youtube_length
    CHECK (youtube IS NULL OR char_length(youtube) <= 200);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_website_length
    CHECK (website IS NULL OR char_length(website) <= 200);
