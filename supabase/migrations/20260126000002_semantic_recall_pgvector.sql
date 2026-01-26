-- =============================================================================
-- Migration: Semantic Recall with pgvector
-- Feature: 002-mastra-memory-system
-- Phase 3: Semantic Recall with Vector Embeddings
--
-- Enables vector similarity search on conversation_memory using pgvector.
-- Uses text-embedding-3-small (1536 dimensions) via Vercel AI Gateway.
-- =============================================================================

-- Enable pgvector extension (available in Supabase by default)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to existing conversation_memory table
-- 1536 dimensions = OpenAI text-embedding-3-small
ALTER TABLE conversation_memory
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW index for fast approximate nearest neighbor search
-- HNSW is preferred over IVFFlat for datasets < 1M vectors (faster, no training)
-- m=16: connections per node (higher = better recall, more memory)
-- ef_construction=64: build-time effort (higher = better index quality)
CREATE INDEX IF NOT EXISTS idx_conversation_memory_embedding
ON conversation_memory
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- =============================================================================
-- Semantic Search Function
-- =============================================================================

-- Search for semantically similar messages across a user's conversations
CREATE OR REPLACE FUNCTION search_similar_messages(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  message_role TEXT,
  message_content TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.message_id,
    cm.conversation_id,
    cm.message_role,
    cm.message_content,
    (1 - (cm.embedding <=> p_query_embedding))::FLOAT as similarity,
    cm.created_at
  FROM conversation_memory cm
  WHERE cm.user_id = p_user_id
    AND cm.embedding IS NOT NULL
    AND (1 - (cm.embedding <=> p_query_embedding)) > p_threshold
  ORDER BY cm.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- Context Window Function
-- =============================================================================

-- Get a message with surrounding context (messages before/after)
CREATE OR REPLACE FUNCTION get_message_with_context(
  p_user_id UUID,
  p_conversation_id UUID,
  p_message_id UUID,
  p_context_range INTEGER DEFAULT 2
)
RETURNS TABLE (
  out_message_id UUID,
  out_message_role TEXT,
  out_message_content TEXT,
  out_created_at TIMESTAMPTZ,
  out_position TEXT -- 'before', 'match', 'after'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Get the target message timestamp
  SELECT cm.created_at INTO v_created_at
  FROM conversation_memory cm
  WHERE cm.user_id = p_user_id
    AND cm.conversation_id = p_conversation_id
    AND cm.message_id = p_message_id;

  IF v_created_at IS NULL THEN
    RETURN;
  END IF;

  -- Return context: before + match + after
  RETURN QUERY
  (
    -- Messages before the match
    SELECT cm.message_id, cm.message_role, cm.message_content, cm.created_at, 'before'::TEXT
    FROM conversation_memory cm
    WHERE cm.user_id = p_user_id
      AND cm.conversation_id = p_conversation_id
      AND cm.created_at < v_created_at
    ORDER BY cm.created_at DESC
    LIMIT p_context_range
  )
  UNION ALL
  (
    -- The matched message itself
    SELECT cm.message_id, cm.message_role, cm.message_content, cm.created_at, 'match'::TEXT
    FROM conversation_memory cm
    WHERE cm.user_id = p_user_id
      AND cm.conversation_id = p_conversation_id
      AND cm.message_id = p_message_id
  )
  UNION ALL
  (
    -- Messages after the match
    SELECT cm.message_id, cm.message_role, cm.message_content, cm.created_at, 'after'::TEXT
    FROM conversation_memory cm
    WHERE cm.user_id = p_user_id
      AND cm.conversation_id = p_conversation_id
      AND cm.created_at > v_created_at
    ORDER BY cm.created_at ASC
    LIMIT p_context_range
  )
  ORDER BY out_created_at ASC;
END;
$$;

-- =============================================================================
-- Embedding Queue (for async processing of new messages)
-- =============================================================================

CREATE TABLE IF NOT EXISTS embedding_queue (
  message_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Index for unprocessed queue items
CREATE INDEX IF NOT EXISTS idx_embedding_queue_unprocessed
ON embedding_queue(created_at ASC)
WHERE processed_at IS NULL;

-- RLS for embedding_queue (service role only)
ALTER TABLE embedding_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages embedding queue"
  ON embedding_queue
  FOR ALL
  USING (auth.role() = 'service_role');
