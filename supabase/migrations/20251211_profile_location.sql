-- Migration: Add location fields to profiles table
-- Feature: 041-loadout-ux-profile
-- Date: 2025-12-11

-- Add location columns (all nullable for existing users)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add constraint for coordinate validity
ALTER TABLE profiles
  ADD CONSTRAINT profiles_latitude_range
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE profiles
  ADD CONSTRAINT profiles_longitude_range
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Add constraint requiring both coordinates if either is set
ALTER TABLE profiles
  ADD CONSTRAINT profiles_coordinates_complete
    CHECK (
      (latitude IS NULL AND longitude IS NULL) OR
      (latitude IS NOT NULL AND longitude IS NOT NULL)
    );

-- Index for future proximity queries
CREATE INDEX IF NOT EXISTS idx_profiles_location
  ON profiles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
