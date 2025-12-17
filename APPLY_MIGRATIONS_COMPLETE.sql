-- ============================================================================
-- COMPLETE Database Migrations (Dec 14-17, 2024)
-- ============================================================================
-- This file contains ALL missing migrations for your database, including:
--   - Feature 048: AI-powered loadout image generation (generated_images table)
--   - Feature 049: Wishlist view with community availability
--   - Feature 050: AI Assistant
--   - Security fixes, performance improvements, and bug fixes
--
-- Run this AFTER executing mark_migrations_applied.sql
-- ============================================================================

-- Migration: Add AI-powered image generation for loadouts
-- Feature: 048-ai-loadout-image-gen

BEGIN;

-- Create generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url TEXT NOT NULL,
  prompt_used TEXT NOT NULL CHECK (length(prompt_used) > 0),
  style_preferences JSONB NULL,
  generation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alt_text TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_generated_images_loadout_id ON generated_images(loadout_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_generation_timestamp ON generated_images(generation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_is_active ON generated_images(loadout_id, is_active) WHERE is_active = TRUE;

-- Extend loadouts table
ALTER TABLE loadouts
ADD COLUMN IF NOT EXISTS hero_image_id UUID NULL REFERENCES generated_images(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS image_source_preference TEXT NULL CHECK (image_source_preference IN ('ai_generated', 'manual_upload'));

CREATE INDEX IF NOT EXISTS idx_loadouts_hero_image_id ON loadouts(hero_image_id);

-- Enable Row Level Security
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/modify their own loadout images
DROP POLICY IF EXISTS "Users can manage their own loadout images" ON generated_images;
CREATE POLICY "Users can manage their own loadout images"
ON generated_images
FOR ALL
USING (
  loadout_id IN (
    SELECT id FROM loadouts WHERE user_id = auth.uid()
  )
);

COMMIT;
-- Migration: Add trigger to automatically sync is_active flags
-- Feature: 048-ai-loadout-image-gen (race condition prevention)
--
-- This trigger ensures that when an image is set to is_active = TRUE,
-- all other images for the same loadout are automatically set to FALSE.
-- This prevents race conditions when multiple requests try to set active images concurrently.

BEGIN;

-- Create function to sync active image flags
CREATE OR REPLACE FUNCTION sync_active_image()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger that fires AFTER UPDATE on generated_images
-- Using AFTER UPDATE ensures the new row is already committed before we update others
DROP TRIGGER IF EXISTS sync_active_image_trigger ON generated_images;
CREATE TRIGGER sync_active_image_trigger
  AFTER UPDATE OF is_active ON generated_images
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION sync_active_image();

-- Add comment for documentation
COMMENT ON FUNCTION sync_active_image() IS 'Automatically deactivates other images when one is set as active for a loadout. Prevents race conditions in concurrent updates.';

COMMIT;
-- Migration: Add composite index for loadout image cleanup query
-- Feature: 048-ai-loadout-image-gen (performance optimization)
--
-- This index optimizes the cleanup query that fetches images for a specific loadout
-- ordered by generation_timestamp DESC (used in cleanupOldImages function).
--
-- The composite index (loadout_id, generation_timestamp DESC) is more efficient than
-- using two separate single-column indexes.

BEGIN;

-- Create composite index for cleanup query optimization
-- Supports: SELECT * FROM generated_images
--           WHERE loadout_id = ?
--           ORDER BY generation_timestamp DESC
CREATE INDEX IF NOT EXISTS idx_generated_images_loadout_timestamp
ON generated_images(loadout_id, generation_timestamp DESC);

-- Note: We keep the existing single-column indexes as they may be useful for other queries:
-- - idx_generated_images_loadout_id (for simple loadout_id lookups)
-- - idx_generated_images_generation_timestamp (for global timestamp queries)

COMMIT;
-- Migration: Fix unique constraint on is_active flag
-- Feature: 048-ai-loadout-image-gen (database consistency)
--
-- Problem: The original migration created a partial INDEX instead of a UNIQUE constraint.
-- This allows multiple images to have is_active = TRUE for the same loadout.
--
-- Solution: Replace the partial index with a unique partial index to enforce
-- database-level constraint that only one image can be active per loadout.

BEGIN;

-- Drop the old non-unique partial index
DROP INDEX IF EXISTS idx_generated_images_is_active;

-- Create a UNIQUE partial index to enforce one active image per loadout
-- This ensures database-level consistency even if application logic fails
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_images_unique_active
  ON generated_images(loadout_id)
  WHERE is_active = TRUE;

-- Add comment for documentation
COMMENT ON INDEX idx_generated_images_unique_active IS
  'Ensures only one image can be active per loadout at the database level. Prevents race conditions and application bugs from creating inconsistent state.';

COMMIT;
-- Migration: Wishlist Community Availability Functions
-- Feature: 049-wishlist-view
-- Date: 2025-12-16
-- Purpose: Add fuzzy matching functions and indexes for community availability matching

-- Note: pg_trgm extension is already enabled in 20251210_catalog_tables.sql

-- Create trigram indexes for fuzzy brand/model matching on gear_items
-- These indexes optimize the similarity() function calls in find_community_availability
CREATE INDEX IF NOT EXISTS idx_gear_items_brand_trgm
  ON gear_items USING GIN (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_gear_items_model_trgm
  ON gear_items USING GIN (model_number gin_trgm_ops);

-- Create composite index for marketplace queries
-- Optimizes filtering for items available for sale, lending, or trading
CREATE INDEX IF NOT EXISTS idx_gear_items_marketplace
  ON gear_items (status, is_for_sale, can_be_borrowed, can_be_traded)
  WHERE status = 'own' AND (is_for_sale = true OR can_be_borrowed = true OR can_be_traded = true);

-- Function: Compute similarity score for brand + model matching
-- Returns a value between 0 (no match) and 1 (exact match)
-- Uses trigram similarity algorithm from pg_trgm extension
CREATE OR REPLACE FUNCTION fuzzy_match_gear(
  wishlist_brand TEXT,
  wishlist_model TEXT,
  inventory_brand TEXT,
  inventory_model TEXT
) RETURNS NUMERIC AS $$
DECLARE
  wishlist_text TEXT;
  inventory_text TEXT;
BEGIN
  -- Normalize and concatenate brand + model for comparison
  -- COALESCE handles NULL values by converting them to empty strings
  wishlist_text := LOWER(TRIM(COALESCE(wishlist_brand, '') || ' ' || COALESCE(wishlist_model, '')));
  inventory_text := LOWER(TRIM(COALESCE(inventory_brand, '') || ' ' || COALESCE(inventory_model, '')));

  -- Return trigram similarity (0-1)
  -- similarity() function from pg_trgm extension
  RETURN similarity(wishlist_text, inventory_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for documentation
COMMENT ON FUNCTION fuzzy_match_gear IS 'Computes trigram similarity score (0-1) between wishlist and inventory item brand+model';

-- Function: Find community availability for a wishlist item
-- Returns matching inventory items from other users that are available in the marketplace
-- Uses fuzzy matching to find similar items even with typos or model variations
CREATE OR REPLACE FUNCTION find_community_availability(
  p_user_id UUID,
  p_wishlist_item_id UUID
) RETURNS TABLE (
  matched_item_id UUID,
  owner_id UUID,
  owner_display_name TEXT,
  owner_avatar_url TEXT,
  item_name TEXT,
  item_brand TEXT,
  is_for_sale BOOLEAN,
  can_be_borrowed BOOLEAN,
  can_be_traded BOOLEAN,
  similarity_score NUMERIC,
  primary_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gi.id AS matched_item_id,
    gi.user_id AS owner_id,
    p.display_name AS owner_display_name,
    p.avatar_url AS owner_avatar_url,
    gi.name AS item_name,
    gi.brand AS item_brand,
    gi.is_for_sale,
    gi.can_be_borrowed,
    gi.can_be_traded,
    fuzzy_match_gear(
      (SELECT brand FROM gear_items WHERE id = p_wishlist_item_id),
      (SELECT model_number FROM gear_items WHERE id = p_wishlist_item_id),
      gi.brand,
      gi.model_number
    ) AS similarity_score,
    gi.primary_image_url
  FROM gear_items gi
  JOIN profiles p ON gi.user_id = p.id
  WHERE
    -- Only match inventory items (not other wishlist items)
    gi.status = 'own'
    -- Only items available in marketplace
    AND (gi.is_for_sale = true OR gi.can_be_borrowed = true OR gi.can_be_traded = true)
    -- Exclude items owned by requesting user
    AND gi.user_id != p_user_id
    -- Filter by similarity threshold (30% minimum match)
    AND fuzzy_match_gear(
      (SELECT brand FROM gear_items WHERE id = p_wishlist_item_id),
      (SELECT model_number FROM gear_items WHERE id = p_wishlist_item_id),
      gi.brand,
      gi.model_number
    ) >= 0.3
  -- Order by best matches first
  ORDER BY similarity_score DESC
  -- Limit results to top 10 matches
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION find_community_availability IS 'Finds inventory items from other users matching a wishlist item using fuzzy brand+model matching (min 30% similarity)';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION fuzzy_match_gear TO authenticated;
GRANT EXECUTE ON FUNCTION find_community_availability TO authenticated;
-- Migration: Fix RLS policies and add constraints for generated_images
-- Feature: 048-ai-loadout-image-gen (Security fixes)
-- Addresses code review findings

BEGIN;

-- Drop existing RLS policy (inefficient subquery)
DROP POLICY IF EXISTS "Users can manage their own loadout images" ON generated_images;

-- Create separate, optimized RLS policies with EXISTS

-- Policy for SELECT operations
DROP POLICY IF EXISTS "Users can view their own loadout images" ON generated_images;
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
DROP POLICY IF EXISTS "Users can insert images for their own loadouts" ON generated_images;
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
DROP POLICY IF EXISTS "Users can update their own loadout images" ON generated_images;
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
DROP POLICY IF EXISTS "Users can delete their own loadout images" ON generated_images;
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
-- Feature 050: GearShack AI Assistant
-- Database schema for AI conversations, messages, rate limiting, and cached responses
-- NOTE: Prefixed with 'ai_' to avoid conflicts with existing messaging tables

-- =====================================================
-- 1. TABLES
-- =====================================================

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 0,
  context_snapshot jsonb
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_id_updated_at_idx
  ON ai_conversations(user_id, updated_at DESC);

-- Create ai_messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  inline_cards jsonb,
  actions jsonb,
  context jsonb,
  tokens_used integer
);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_created_at_idx
  ON ai_messages(conversation_id, created_at DESC);

-- Create ai_rate_limits table
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL DEFAULT '/api/chat',
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_user_id_endpoint_idx
  ON ai_rate_limits(user_id, endpoint);

-- Create ai_cached_responses table
CREATE TABLE IF NOT EXISTS ai_cached_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_pattern text NOT NULL UNIQUE,
  response_en text NOT NULL,
  response_de text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_cached_responses_query_pattern_idx
  ON ai_cached_responses USING gin(query_pattern gin_trgm_ops);

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cached_responses ENABLE ROW LEVEL SECURITY;

-- AI Conversations policies
DROP POLICY IF EXISTS "users_view_own_ai_conversations" ON ai_conversations;
CREATE POLICY "users_view_own_ai_conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_ai_conversations" ON ai_conversations;
CREATE POLICY "users_insert_own_ai_conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_ai_conversations" ON ai_conversations;
CREATE POLICY "users_update_own_ai_conversations"
  ON ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_ai_conversations" ON ai_conversations;
CREATE POLICY "users_delete_own_ai_conversations"
  ON ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- AI Messages policies
DROP POLICY IF EXISTS "users_view_own_ai_messages" ON ai_messages;
CREATE POLICY "users_view_own_ai_messages"
  ON ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_insert_own_ai_messages" ON ai_messages;
CREATE POLICY "users_insert_own_ai_messages"
  ON ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- AI Rate limits policies
DROP POLICY IF EXISTS "users_view_own_ai_rate_limits" ON ai_rate_limits;
CREATE POLICY "users_view_own_ai_rate_limits"
  ON ai_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- AI Cached responses policies
DROP POLICY IF EXISTS "authenticated_read_ai_cached_responses" ON ai_cached_responses;
CREATE POLICY "authenticated_read_ai_cached_responses"
  ON ai_cached_responses FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 3. FUNCTIONS
-- =====================================================

-- AI Rate limit check function (atomic)
CREATE OR REPLACE FUNCTION check_ai_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window_hours integer
) RETURNS jsonb AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
  v_exceeded boolean;
  v_resets_at timestamptz;
BEGIN
  -- Get or create rate limit record
  INSERT INTO ai_rate_limits (user_id, endpoint, count, window_start)
  VALUES (p_user_id, p_endpoint, 0, now())
  ON CONFLICT (user_id, endpoint) DO NOTHING;

  -- Get current state
  SELECT count, window_start INTO v_count, v_window_start
  FROM ai_rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  -- Reset window if expired
  IF v_window_start + (p_window_hours || ' hours')::interval < now() THEN
    UPDATE ai_rate_limits
    SET count = 0, window_start = now()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    v_count := 0;
    v_window_start := now();
  END IF;

  v_exceeded := v_count >= p_limit;
  v_resets_at := v_window_start + (p_window_hours || ' hours')::interval;

  RETURN jsonb_build_object(
    'exceeded', v_exceeded,
    'count', v_count,
    'limit', p_limit,
    'resets_at', v_resets_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CRON JOBS (90-day retention)
-- =====================================================

-- NOTE: Automatic cleanup job requires pg_cron extension
-- This can be added later via Supabase Dashboard > Database > Extensions > pg_cron
-- Then run:
-- SELECT cron.schedule(
--   'purge-old-ai-conversations',
--   '0 2 * * *', -- Daily at 2am UTC
--   $$
--   DELETE FROM ai_conversations
--   WHERE updated_at < now() - interval '90 days';
--   $$
-- );

-- =====================================================
-- 5. SEED DATA (Cached Responses)
-- =====================================================

INSERT INTO ai_cached_responses (query_pattern, response_en, response_de) VALUES
('what is base weight',
 'Base weight is the total weight of your gear excluding consumables (food, water, fuel). It''s a key metric for evaluating how "ultralight" your loadout is.',
 'Basisgewicht ist das Gesamtgewicht Ihrer Ausrüstung ohne Verbrauchsmaterialien (Essen, Wasser, Brennstoff). Es ist eine wichtige Kennzahl zur Bewertung, wie "ultraleicht" Ihre Ausrüstung ist.'),

('how do i reduce pack weight',
 'Top strategies: 1) Replace your heaviest items (tent, backpack, sleeping bag) with lighter alternatives. 2) Eliminate duplicate items. 3) Choose multi-use gear. 4) Leave behind "just in case" items you rarely use.',
 'Top-Strategien: 1) Ersetzen Sie Ihre schwersten Gegenstände (Zelt, Rucksack, Schlafsack) durch leichtere Alternativen. 2) Eliminieren Sie doppelte Gegenstände. 3) Wählen Sie Mehrzweckausrüstung. 4) Lassen Sie "nur für den Fall"-Gegenstände weg, die Sie selten verwenden.'),

('what is r-value',
 'R-value measures a sleeping pad''s insulation effectiveness. Higher R-values provide more warmth. For example: R-1 to R-2 (summer), R-2 to R-4 (3-season), R-4+ (winter). Your sleeping pad''s R-value should match the lowest temperature you expect.',
 'R-Wert misst die Isolierwirkung einer Isomatte. Höhere R-Werte bieten mehr Wärme. Zum Beispiel: R-1 bis R-2 (Sommer), R-2 bis R-4 (3-Jahreszeiten), R-4+ (Winter). Der R-Wert Ihrer Isomatte sollte zur niedrigsten erwarteten Temperatur passen.'),

('how to choose a sleeping bag',
 'Key factors: 1) Temperature rating (match to coldest expected conditions). 2) Insulation type (down for weight/packability, synthetic for wet conditions). 3) Shape (mummy for warmth, rectangular for comfort). 4) Weight and packed size for your trip length.',
 'Wichtige Faktoren: 1) Temperaturbereich (passend zu den kältesten erwarteten Bedingungen). 2) Isolationstyp (Daune für Gewicht/Packmaß, Synthetik für nasse Bedingungen). 3) Form (Mumie für Wärme, rechteckig für Komfort). 4) Gewicht und Packmaß für Ihre Tourlänge.'),

('what is lighterpack',
 'Lighterpack is a popular free website for creating and sharing gear lists. It automatically calculates total weight, base weight, and worn weight. Many backpackers use it to plan trips and compare loadouts with the community.',
 'Lighterpack ist eine beliebte kostenlose Website zum Erstellen und Teilen von Ausrüstungslisten. Es berechnet automatisch Gesamtgewicht, Basisgewicht und getragenes Gewicht. Viele Rucksacktouristen nutzen es zur Tourenplanung und zum Vergleich von Ausrüstungen mit der Community.'),

('ultralight backpacking tips',
 'Essential ultralight tips: 1) Cut your Big Three weight (tent, backpack, sleeping bag/quilt). 2) Use a digital scale to weigh everything. 3) Question every item: "Will I actually use this?" 4) Choose multi-use items. 5) Learn skills to replace gear (e.g., navigation instead of heavy guidebooks).',
 'Wesentliche Ultraleicht-Tipps: 1) Reduzieren Sie Ihr Big Three Gewicht (Zelt, Rucksack, Schlafsack/Quilt). 2) Verwenden Sie eine Digitalwaage zum Wiegen. 3. Hinterfragen Sie jeden Gegenstand: "Werde ich das wirklich benutzen?" 4) Wählen Sie Mehrzweck-Gegenstände. 5) Lernen Sie Fähigkeiten statt Ausrüstung mitzunehmen (z.B. Navigation statt schwerer Reiseführer).')
ON CONFLICT (query_pattern) DO NOTHING;
-- Feature 050: Add subscription_tier column for AI Assistant access control
-- T008: Add subscription_tier column to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier text
CHECK (subscription_tier IN ('standard', 'trailblazer'))
DEFAULT 'standard';

-- Update existing users to 'standard' tier if column was added
UPDATE profiles
SET subscription_tier = 'standard'
WHERE subscription_tier IS NULL;
-- Fix race condition in rate limiting by combining check + increment atomically
-- Security fix for PR #58 review feedback

-- Drop the old function that only checks
DROP FUNCTION IF EXISTS check_ai_rate_limit(uuid, text, integer, integer);

-- Create new atomic function that checks AND increments in one operation
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window_hours integer
) RETURNS jsonb AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
  v_exceeded boolean;
  v_resets_at timestamptz;
BEGIN
  -- Acquire advisory lock to prevent concurrent execution for same user+endpoint
  -- This ensures true atomicity across concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_endpoint));

  -- Get or create rate limit record
  INSERT INTO ai_rate_limits (user_id, endpoint, count, window_start)
  VALUES (p_user_id, p_endpoint, 0, now())
  ON CONFLICT (user_id, endpoint) DO NOTHING;

  -- Get current state
  SELECT count, window_start INTO v_count, v_window_start
  FROM ai_rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint
  FOR UPDATE; -- Lock row for update

  -- Reset window if expired
  IF v_window_start + (p_window_hours * interval '1 hour') < now() THEN
    v_count := 0;
    v_window_start := now();

    UPDATE ai_rate_limits
    SET count = 0, window_start = now(), last_message_at = now()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
  END IF;

  -- Check if rate limit would be exceeded
  v_exceeded := v_count >= p_limit;
  v_resets_at := v_window_start + (p_window_hours * interval '1 hour');

  -- If NOT exceeded, increment the counter atomically
  IF NOT v_exceeded THEN
    UPDATE ai_rate_limits
    SET count = count + 1, last_message_at = now()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;

    v_count := v_count + 1;
  END IF;

  RETURN jsonb_build_object(
    'exceeded', v_exceeded,
    'count', v_count,
    'limit', p_limit,
    'resets_at', v_resets_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_and_increment_rate_limit(uuid, text, integer, integer) TO authenticated;
-- Add atomic cache usage increment function
-- Prevents race conditions when multiple requests hit same cached response

CREATE OR REPLACE FUNCTION increment_cache_usage(
  p_cache_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE ai_cached_responses
  SET
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = p_cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_cache_usage(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION increment_cache_usage IS 'Atomically increment usage count for cached AI responses';
-- Feature 048: Shared Loadout Enhancement
-- Phase 9: Comment Notifications
-- Migration: Fix notification trigger to include share_token for navigation
--
-- Issue: The current trigger stores 'loadout_comment' in reference_type,
-- but we need the share_token to navigate to the shared loadout.
-- Solution: Store share_token in reference_type and comment_id in reference_id
--
-- This migration updates the trigger function to properly store the share_token.

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_loadout_comment_notify ON loadout_comments;

-- Update trigger function to store share_token in reference_type
CREATE OR REPLACE FUNCTION notify_loadout_owner_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_loadout_name TEXT;
BEGIN
  -- Get owner ID and loadout name from the share
  SELECT owner_id, (payload->'loadout'->>'name')::TEXT
  INTO v_owner_id, v_loadout_name
  FROM loadout_shares
  WHERE share_token = NEW.share_token;

  -- Only notify if owner exists
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, reference_type, reference_id, message)
    VALUES (
      v_owner_id,
      'loadout_comment',
      NEW.share_token,           -- Store share_token for navigation
      NEW.id::TEXT,              -- Store comment_id for reference
      COALESCE(NEW.author, 'Someone') || ' commented on your loadout'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_loadout_comment_notify ON loadout_comments;
CREATE TRIGGER on_loadout_comment_notify
AFTER INSERT ON loadout_comments
FOR EACH ROW EXECUTE FUNCTION notify_loadout_owner_on_comment();

-- Add comment explaining the field usage
COMMENT ON COLUMN notifications.reference_type IS
  'For loadout_comment type: contains the share_token for navigation. For other types: contains the entity type.';
COMMENT ON COLUMN notifications.reference_id IS
  'For loadout_comment type: contains the comment_id. For other types: contains the entity ID.';
-- Feature 050: AI Assistant - Rate Limit Increment Function
-- Fixes critical bug where rate limit counter was never incremented
-- This migration adds the missing increment_ai_rate_limit function

-- =====================================================
-- FUNCTION: Increment AI Rate Limit Counter
-- =====================================================

-- Atomically increment the rate limit counter after a successful message send
-- This function should be called immediately after check_ai_rate_limit passes
CREATE OR REPLACE FUNCTION increment_ai_rate_limit(
  p_user_id uuid,
  p_endpoint text
) RETURNS void AS $$
BEGIN
  -- Atomically increment count and update last_message_at timestamp
  UPDATE ai_rate_limits
  SET
    count = count + 1,
    last_message_at = now()
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint;

  -- If no row was updated (shouldn't happen if check was called first),
  -- create the record with count = 1
  IF NOT FOUND THEN
    INSERT INTO ai_rate_limits (user_id, endpoint, count, window_start, last_message_at)
    VALUES (p_user_id, p_endpoint, 1, now(), now())
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET
      count = ai_rate_limits.count + 1,
      last_message_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_ai_rate_limit(uuid, text) TO authenticated;
/**
 * Fix ai_rate_limits Primary Key
 * Feature 050: AI Assistant - Security Fix
 *
 * Changes primary key from user_id to composite (user_id, endpoint)
 * to support per-endpoint rate limiting as intended by the code.
 *
 * Issue: Original table had user_id as PK but code queries by both
 * user_id AND endpoint, requiring composite primary key.
 */

-- Drop existing primary key constraint
ALTER TABLE ai_rate_limits DROP CONSTRAINT ai_rate_limits_pkey;

-- Drop redundant index (will be covered by composite PK)
DROP INDEX IF EXISTS ai_rate_limits_user_id_endpoint_idx;

-- Add composite primary key
ALTER TABLE ai_rate_limits ADD PRIMARY KEY (user_id, endpoint);
/**
 * Rate Limit Cleanup Cron Job
 * Feature 050: AI Assistant - Maintenance
 *
 * Adds scheduled cleanup of old rate limit records to prevent
 * unbounded table growth. Removes records older than 7 days.
 *
 * Uses pg_cron extension for scheduling (runs daily at 2:00 AM UTC).
 */

-- Enable pg_cron extension (if not already enabled)
-- Note: This requires superuser privileges and may already be enabled in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_rate_limits
  WHERE window_start < now() - interval '7 days'
    AND (last_message_at IS NULL OR last_message_at < now() - interval '7 days');

  -- Log cleanup for monitoring
  RAISE NOTICE 'Cleaned up old rate limit records';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run daily at 2:00 AM UTC
-- Note: pg_cron.schedule requires superuser privileges
-- If this fails in Supabase, you can schedule via Supabase dashboard instead
DO $$
BEGIN
  PERFORM cron.schedule(
    'cleanup-rate-limits',           -- job name
    '0 2 * * *',                     -- cron schedule (2 AM daily)
    $sql$SELECT cleanup_old_rate_limits()$sql$
  );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_cron scheduling requires superuser. Please schedule via Supabase dashboard.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %. Please schedule manually.', SQLERRM;
END;
$$;

-- Alternative: If pg_cron is not available, you can run this manually or via API
COMMENT ON FUNCTION cleanup_old_rate_limits() IS
  'Cleans up rate limit records older than 7 days. Run daily via cron or API.';
/**
 * Drop Standalone Rate Limit Increment Function
 * Feature 050: AI Assistant - Security Cleanup
 *
 * Removes the standalone increment_ai_rate_limit() function which
 * has been superseded by the atomic check_and_increment_rate_limit().
 *
 * CRITICAL: This prevents race conditions from accidentally calling
 * the non-atomic increment function instead of the atomic version.
 *
 * History:
 * - 20251217080049: Created standalone increment_ai_rate_limit()
 * - 20251217000001: Created atomic check_and_increment_rate_limit()
 * - THIS MIGRATION: Removes standalone function to prevent misuse
 *
 * The atomic function (check_and_increment_rate_limit) combines both
 * check and increment operations with advisory locks, preventing
 * race conditions that could occur if check and increment are separate.
 */

-- Revoke permissions first
REVOKE EXECUTE ON FUNCTION increment_ai_rate_limit(uuid, text) FROM authenticated;

-- Drop the standalone function
DROP FUNCTION IF EXISTS increment_ai_rate_limit(uuid, text);

-- Add comment to clarify why this was removed
COMMENT ON FUNCTION check_and_increment_rate_limit(uuid, text, integer, integer) IS
  'Atomic rate limit check and increment. Replaced standalone increment_ai_rate_limit() to prevent race conditions.';
