-- =============================================================================
-- Migration: Multilingual Embedding Support
-- Feature: Vorschlag 16 - Multilinguale Embeddings für Deutsch/Englisch-Suche
--
-- Adds support for Cohere embed-multilingual-v3.0 (1024 dimensions)
-- alongside the existing OpenAI text-embedding-3-small (1536 dimensions).
--
-- This migration:
-- 1. Adds a 1024-dim embedding column to conversation_memory
-- 2. Adds a 1024-dim embedding column to catalog_products
-- 3. Creates HNSW indexes for the new columns
-- 4. Creates a dimension-aware semantic search function
-- 5. Tracks the active embedding model in a config table
--
-- IMPORTANT: After switching EMBEDDING_MODEL to cohere/embed-multilingual-v3.0,
-- existing embeddings in the 1536-dim columns will NOT be compatible with new
-- 1024-dim queries. Run the re-embedding script to populate the new columns.
-- =============================================================================

-- =============================================================================
-- 1. Embedding Config Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS embedding_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which model is active (used by application to know which column to query)
INSERT INTO embedding_config (key, value)
VALUES ('active_model', 'openai/text-embedding-3-small')
ON CONFLICT (key) DO NOTHING;

INSERT INTO embedding_config (key, value)
VALUES ('active_dimensions', '1536')
ON CONFLICT (key) DO NOTHING;

-- RLS: service role only
ALTER TABLE embedding_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages embedding config"
  ON embedding_config
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 2. Add 1024-dim Embedding Columns
-- =============================================================================

-- conversation_memory: new column for multilingual embeddings
ALTER TABLE conversation_memory
ADD COLUMN IF NOT EXISTS embedding_ml vector(1024);

-- catalog_products: new column for multilingual embeddings
ALTER TABLE catalog_products
ADD COLUMN IF NOT EXISTS embedding_ml vector(1024);

-- =============================================================================
-- 3. HNSW Indexes for 1024-dim Columns
-- =============================================================================

-- Conversation memory multilingual index
CREATE INDEX IF NOT EXISTS idx_conversation_memory_embedding_ml
ON conversation_memory
USING hnsw (embedding_ml vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Catalog products multilingual index
CREATE INDEX IF NOT EXISTS idx_catalog_products_embedding_ml_hnsw
ON catalog_products
USING hnsw (embedding_ml vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Composite index for user_id filtering on multilingual embeddings
CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_embedding_ml
ON conversation_memory (user_id)
WHERE embedding_ml IS NOT NULL;

-- =============================================================================
-- 4. Dimension-Aware Semantic Search Function
-- =============================================================================

-- Overloaded search function for 1024-dim multilingual embeddings
CREATE OR REPLACE FUNCTION search_similar_messages_ml(
  p_user_id UUID,
  p_query_embedding vector(1024),
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
  -- SECURITY: Validate that caller can only search their own messages
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only search own messages';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Invalid limit: must be between 1 and 100';
  END IF;

  IF p_threshold < 0 OR p_threshold > 1 THEN
    RAISE EXCEPTION 'Invalid threshold: must be between 0 and 1';
  END IF;

  RETURN QUERY
  SELECT
    cm.message_id,
    cm.conversation_id,
    cm.message_role,
    cm.message_content,
    (1 - (cm.embedding_ml <=> p_query_embedding))::FLOAT as similarity,
    cm.created_at
  FROM conversation_memory cm
  WHERE cm.user_id = p_user_id
    AND cm.embedding_ml IS NOT NULL
    AND (1 - (cm.embedding_ml <=> p_query_embedding)) > p_threshold
  ORDER BY cm.embedding_ml <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 5. Helper: Update Active Model Config
-- =============================================================================

-- Call this after switching EMBEDDING_MODEL and re-embedding all data
CREATE OR REPLACE FUNCTION set_active_embedding_model(
  p_model TEXT,
  p_dimensions INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate model name
  IF p_model NOT IN ('openai/text-embedding-3-small', 'cohere/embed-multilingual-v3.0') THEN
    RAISE EXCEPTION 'Unknown embedding model: %', p_model;
  END IF;

  -- Validate dimensions
  IF p_dimensions NOT IN (1024, 1536) THEN
    RAISE EXCEPTION 'Invalid dimensions: must be 1024 or 1536';
  END IF;

  UPDATE embedding_config SET value = p_model, updated_at = now() WHERE key = 'active_model';
  UPDATE embedding_config SET value = p_dimensions::TEXT, updated_at = now() WHERE key = 'active_dimensions';
END;
$$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE embedding_config IS
  'Tracks active embedding model configuration. Used by application to determine which vector column to query.';

COMMENT ON COLUMN conversation_memory.embedding_ml IS
  'Multilingual embedding vector (1024 dimensions) from cohere/embed-multilingual-v3.0. Used when EMBEDDING_MODEL=cohere/embed-multilingual-v3.0.';

COMMENT ON COLUMN catalog_products.embedding_ml IS
  'Multilingual embedding vector (1024 dimensions) from cohere/embed-multilingual-v3.0. Used when EMBEDDING_MODEL=cohere/embed-multilingual-v3.0.';

COMMENT ON FUNCTION search_similar_messages_ml IS
  'Semantic search for 1024-dim multilingual embeddings. Counterpart to search_similar_messages (1536-dim).';
