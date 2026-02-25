-- =============================================================================
-- Migration: Working Memory for AI Agent
-- Feature: 002-mastra-memory-system
-- Phase 2: Working Memory with Zod Schema
--
-- Creates the user_working_memory table that stores the AI agent's
-- structured knowledge about each user (preferences, goals, facts, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_working_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Structured profile (validated by application-level Zod schema)
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata for versioning and conflict resolution
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One profile per user (resource-scoped)
  UNIQUE(user_id)
);

-- RLS Policy: Users can only manage their own working memory
ALTER TABLE user_working_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own working memory"
  ON user_working_memory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own working memory"
  ON user_working_memory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own working memory"
  ON user_working_memory
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own working memory"
  ON user_working_memory
  FOR DELETE
  USING (auth.uid() = user_id);

-- Performance index
CREATE INDEX idx_working_memory_user ON user_working_memory(user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_working_memory_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_working_memory_timestamp
  BEFORE UPDATE ON user_working_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_working_memory_timestamp();

-- Service role policy for backfill and admin operations
CREATE POLICY "Service role full access to working memory"
  ON user_working_memory
  FOR ALL
  USING (auth.role() = 'service_role');
