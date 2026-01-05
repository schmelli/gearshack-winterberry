-- Migration: Add Admin RLS Policies for Community Banners
-- Feature: 056-community-hub-enhancements (Fix)
-- Purpose: Add INSERT/UPDATE/DELETE policies for admin users
--
-- This migration adds missing RLS policies that allow admin users to manage
-- community banners through the regular authenticated client instead of
-- requiring service role client.

-- =============================================================================
-- Helper Function for Admin Check (Performance Optimization)
-- =============================================================================

-- Create a function to check if current user is admin
-- This prevents N+1 queries by avoiding subquery execution on every row
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- Admin Policies for Banner Management
-- =============================================================================

-- Admins can view all banners (including inactive and future/expired ones)
CREATE POLICY "Admins can view all banners"
  ON community_banners FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can create banners
CREATE POLICY "Admins can create banners"
  ON community_banners FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update banners
CREATE POLICY "Admins can update banners"
  ON community_banners FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete banners
CREATE POLICY "Admins can delete banners"
  ON community_banners FOR DELETE
  TO authenticated
  USING (is_admin());
