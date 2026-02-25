-- Migration: Conversation Memory for Mastra Agentic Voice AI
-- Feature: 001-mastra-agentic-voice
-- Created: 2025-01-20
-- Description: Creates the conversation_memory table for persistent AI conversation storage

-- ==================== TABLE CREATION ====================

CREATE TABLE IF NOT EXISTS conversation_memory (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conversation grouping
  conversation_id UUID NOT NULL,

  -- Message identity (globally unique across all conversations)
  message_id UUID NOT NULL,

  -- Message content
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
  message_content TEXT NOT NULL,

  -- Flexible metadata storage (tool calls, citations, preferences)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps for conflict resolution and retention
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Composite unique constraint for conflict detection
  UNIQUE(user_id, conversation_id, message_id)
);

-- ==================== INDEXES ====================

-- Performance index for user/conversation queries
CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_conversation
  ON conversation_memory(user_id, conversation_id, created_at DESC);

-- JSONB metadata index for flexible queries
CREATE INDEX IF NOT EXISTS idx_conversation_memory_metadata
  ON conversation_memory USING gin(metadata jsonb_path_ops);

-- Updated timestamp index for conflict resolution
CREATE INDEX IF NOT EXISTS idx_conversation_memory_updated
  ON conversation_memory(updated_at);

-- Full-text search index for semantic memory search
CREATE INDEX IF NOT EXISTS idx_conversation_memory_content_search
  ON conversation_memory USING gin(to_tsvector('english', message_content));

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS to ensure multi-tenancy
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own conversation memory
CREATE POLICY "Users can only access own memory"
  ON conversation_memory
  FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Service role has full access (for background jobs)
CREATE POLICY "Service role full access"
  ON conversation_memory
  FOR ALL
  TO service_role
  USING (true);

-- ==================== TRIGGERS ====================

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_memory_updated_at
  BEFORE UPDATE ON conversation_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_memory_updated_at();

-- ==================== COMMENTS ====================

COMMENT ON TABLE conversation_memory IS 'Stores persistent conversation history for Mastra AI agent with 90-day retention';
COMMENT ON COLUMN conversation_memory.message_id IS 'Globally unique message ID for deduplication across devices';
COMMENT ON COLUMN conversation_memory.metadata IS 'JSONB field for tool calls, citations, user preferences';
COMMENT ON COLUMN conversation_memory.updated_at IS 'Server-side timestamp for last-write-wins conflict resolution';
