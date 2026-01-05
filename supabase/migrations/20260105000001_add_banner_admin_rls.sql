-- Migration: Add Admin RLS Policies for Community Banners
-- Feature: 056-community-hub-enhancements (Fix)
-- Purpose: Add INSERT/UPDATE/DELETE policies for admin users
--
-- This migration adds missing RLS policies that allow admin users to manage
-- community banners through the regular authenticated client instead of
-- requiring service role client.

-- =============================================================================
-- Admin Policies for Banner Management
-- =============================================================================

-- Admins can view all banners (including inactive and future/expired ones)
CREATE POLICY "Admins can view all banners"
  ON community_banners FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Admins can create banners
CREATE POLICY "Admins can create banners"
  ON community_banners FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Admins can update banners
CREATE POLICY "Admins can update banners"
  ON community_banners FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Admins can delete banners
CREATE POLICY "Admins can delete banners"
  ON community_banners FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );
