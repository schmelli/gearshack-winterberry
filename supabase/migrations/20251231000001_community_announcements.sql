-- Migration: Community Announcements
-- Feature: Community Hub Enhancement
-- Date: 2025-12-31
--
-- Creates table for admin-managed community announcements that appear
-- as banners on the Community Hub page.

-- ============================================================================
-- 1. CREATE ANNOUNCEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'promo')),
  priority INTEGER NOT NULL DEFAULT 0,
  link_url TEXT,
  link_text TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add comments for documentation
COMMENT ON TABLE community_announcements IS 'Admin-managed announcements displayed as banners on the Community Hub page';
COMMENT ON COLUMN community_announcements.type IS 'Announcement type: info (blue), warning (amber), success (green), promo (purple)';
COMMENT ON COLUMN community_announcements.priority IS 'Display priority - higher numbers show first';
COMMENT ON COLUMN community_announcements.starts_at IS 'When the announcement becomes visible';
COMMENT ON COLUMN community_announcements.ends_at IS 'When the announcement stops being visible (null = indefinite)';

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Index for fetching active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active_date
  ON community_announcements (is_active, starts_at, ends_at)
  WHERE is_active = true;

-- Index for sorting by priority
CREATE INDEX IF NOT EXISTS idx_announcements_priority
  ON community_announcements (priority DESC, created_at DESC);

-- Index for admin analytics
CREATE INDEX IF NOT EXISTS idx_announcements_creator
  ON community_announcements (created_by);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE community_announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can read active announcements that are within their date range
CREATE POLICY "Anyone can read active announcements"
  ON community_announcements
  FOR SELECT
  USING (
    is_active = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );

-- Only admins can manage announcements (use service role for admin operations)
-- No INSERT/UPDATE/DELETE policies for regular users

-- ============================================================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_announcement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_announcements_updated_at
  BEFORE UPDATE ON community_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_timestamp();

-- ============================================================================
-- 5. SEED INITIAL WELCOME ANNOUNCEMENT
-- ============================================================================

INSERT INTO community_announcements (title, message, type, priority, starts_at)
VALUES (
  'Welcome to the Community Hub!',
  'Connect with fellow outdoor enthusiasts, share your loadouts, and discover great deals on gear.',
  'info',
  100,
  now()
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETE
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback this migration, run the following SQL commands in order:
--
-- DROP TRIGGER IF EXISTS trigger_announcements_updated_at ON community_announcements;
-- DROP FUNCTION IF EXISTS update_announcement_timestamp();
-- DROP TABLE IF EXISTS community_announcements CASCADE;
