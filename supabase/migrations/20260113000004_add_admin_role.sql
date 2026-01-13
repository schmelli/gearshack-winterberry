-- Migration: Add admin role support to profiles
-- Feature: 057-wishlist-pricing-enhancements
-- Purpose: Enable role-based access control for admin endpoints

-- =============================================================================
-- Enum: user_role
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
  END IF;
END$$;

-- =============================================================================
-- Add role column to profiles
-- =============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

-- =============================================================================
-- Index for role-based queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role
ON profiles(role)
WHERE role != 'user';

-- =============================================================================
-- Documentation
-- =============================================================================

COMMENT ON COLUMN profiles.role IS 'User role for access control (user, admin, moderator)';
