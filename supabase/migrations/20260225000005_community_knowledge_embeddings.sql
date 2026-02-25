-- Community Knowledge Embeddings for RAG
-- Feature: Community-RAG Integration (Vorschlag 15)
--
-- Creates a dedicated table for storing vector embeddings of bulletin board
-- posts and replies, enabling semantic search across community knowledge.
-- The agent can then answer questions like "Does the NeoAir XLite crinkle?"
-- by retrieving relevant community experiences.
--
-- Uses the existing pgvector extension (enabled in 20260125000001).
-- Embedding dimension: 1536 (text-embedding-3-small from OpenAI)

-- ============================================================================
-- Community Knowledge Chunks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN ('bulletin_post', 'bulletin_reply', 'shakedown', 'shakedown_feedback')),
  source_id UUID NOT NULL,

  -- Content chunk (may be the full post or a chunked segment for long content)
  chunk_text TEXT NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,

  -- Metadata for filtering and context
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  gear_names TEXT[] DEFAULT '{}',
  brand_names TEXT[] DEFAULT '{}',

  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding vector(1536),

  -- Timestamps
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_created_at TIMESTAMPTZ,

  -- Prevent duplicate chunks for the same source
  CONSTRAINT uq_community_chunk UNIQUE (source_type, source_id, chunk_index)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- HNSW index for fast approximate nearest neighbor search
-- Using cosine distance (vector_cosine_ops) for normalized embeddings
CREATE INDEX IF NOT EXISTS idx_community_knowledge_embedding_hnsw
ON community_knowledge_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for source lookups (upsert/delete operations)
CREATE INDEX IF NOT EXISTS idx_community_knowledge_source
ON community_knowledge_chunks (source_type, source_id);

-- Index for tag-based filtering
CREATE INDEX IF NOT EXISTS idx_community_knowledge_tags
ON community_knowledge_chunks USING gin (tags);

-- Index for gear name filtering
CREATE INDEX IF NOT EXISTS idx_community_knowledge_gear_names
ON community_knowledge_chunks USING gin (gear_names);

-- Index for brand name filtering
CREATE INDEX IF NOT EXISTS idx_community_knowledge_brand_names
ON community_knowledge_chunks USING gin (brand_names);

-- ============================================================================
-- Semantic Search Function
-- ============================================================================

CREATE OR REPLACE FUNCTION search_community_knowledge(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.65,
  max_results int DEFAULT 5,
  filter_source_type text DEFAULT NULL,
  filter_tags text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  chunk_text text,
  tags text[],
  gear_names text[],
  brand_names text[],
  author_id uuid,
  source_created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.source_type,
    ck.source_id,
    ck.chunk_text,
    ck.tags,
    ck.gear_names,
    ck.brand_names,
    ck.author_id,
    ck.source_created_at,
    (1 - (ck.embedding <=> query_embedding))::float as similarity
  FROM community_knowledge_chunks ck
  WHERE ck.embedding IS NOT NULL
    AND (1 - (ck.embedding <=> query_embedding)) > similarity_threshold
    AND (filter_source_type IS NULL OR ck.source_type = filter_source_type)
    AND (filter_tags IS NULL OR ck.tags && filter_tags)
  ORDER BY ck.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_community_knowledge(vector, float, int, text, text[])
  TO authenticated;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE community_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all chunks (community knowledge is public)
CREATE POLICY community_knowledge_read
  ON community_knowledge_chunks
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete (indexing is server-side only)
-- No explicit policy needed - service_role bypasses RLS

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE community_knowledge_chunks IS
  'Vector embeddings of community content (bulletin posts, replies, shakedowns) for RAG-powered semantic search. Indexed by the community-rag pipeline.';

COMMENT ON FUNCTION search_community_knowledge IS
  'Performs semantic similarity search on community knowledge chunks using pgvector cosine distance. Supports filtering by source type and tags.';
