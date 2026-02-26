-- Community RAG Quality Filters
-- Feature: Hybrid RAG — Qualitätsfilter für Community-Wissen (Vorschlag 6, Kap. 19)
--
-- Adds a reply_count column to community_knowledge_chunks for engagement-based
-- quality filtering, and updates the search_community_knowledge RPC function
-- to support age and engagement filters.
--
-- Quality signals:
--   - reply_count:      Engagement metric — posts with more replies are more
--                       likely to contain validated, useful information.
--   - source_created_at: Already stored — used for recency filtering.
--
-- New RPC parameters:
--   - filter_max_age_months: Exclude chunks older than N months
--   - filter_min_replies:    Require at least N replies (quality gate)

-- ============================================================================
-- Schema Change: Add reply_count column
-- ============================================================================

ALTER TABLE community_knowledge_chunks
  ADD COLUMN IF NOT EXISTS reply_count INT NOT NULL DEFAULT 0;

-- Index for efficient quality filtering
-- NOTE: pgvector ANN searches (embedding <=> query) apply scalar filters as
-- post-filters after the vector scan. The query planner generally cannot use
-- B-tree indexes as pre-filters alongside HNSW/IVFFlat, so these indexes do
-- NOT speed up RAG searches. They are retained for scalar-only admin/dashboard
-- queries (e.g., "find posts with low reply_count"). If the table grows large
-- and write overhead becomes measurable, consider dropping these indexes after
-- profiling with EXPLAIN ANALYZE. See also migration _002 for more context.
-- TODO: Revisit once community_knowledge_chunks row count exceeds ~100k rows.
CREATE INDEX IF NOT EXISTS idx_community_knowledge_reply_count
  ON community_knowledge_chunks (reply_count)
  WHERE reply_count > 0;

-- Composite index for age + quality filtering (most common filter combination)
-- Same write-overhead caveat as above applies.
CREATE INDEX IF NOT EXISTS idx_community_knowledge_quality
  ON community_knowledge_chunks (source_created_at DESC, reply_count DESC)
  WHERE reply_count > 0;

-- ============================================================================
-- Backfill: Populate reply_count for existing bulletin_post chunks
-- ============================================================================
-- Without this, all existing chunks have reply_count = 0 and would be
-- invisible to the default quality filter (minReplies: 1).

UPDATE community_knowledge_chunks ck
SET reply_count = bp.reply_count
FROM bulletin_posts bp
WHERE ck.source_type = 'bulletin_post'
  AND ck.source_id = bp.id
  AND bp.reply_count > 0;

-- ============================================================================
-- Updated Semantic Search Function
-- ============================================================================

-- Drop the old 5-parameter signature first to prevent overload ambiguity.
-- PostgreSQL identifies functions by name + arg types, so adding params with
-- defaults creates a NEW overload. Calling with only the original 5 named
-- params would match BOTH signatures and cause "function is not unique".
DROP FUNCTION IF EXISTS search_community_knowledge(vector, float, int, text, text[]);

CREATE OR REPLACE FUNCTION search_community_knowledge(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.65,
  max_results int DEFAULT 5,
  filter_source_type text DEFAULT NULL,
  filter_tags text[] DEFAULT NULL,
  -- Quality filters (Vorschlag 6)
  filter_max_age_months int DEFAULT NULL,
  filter_min_replies int DEFAULT NULL
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
    -- Existing filters
    AND (filter_source_type IS NULL OR ck.source_type = filter_source_type)
    AND (filter_tags IS NULL OR ck.tags && filter_tags)
    -- Quality filter: Recency — exclude chunks older than N months
    -- NOTE: Chunks with NULL source_created_at are excluded when this filter
    -- is active (NULL > timestamp = NULL = excluded). This is intentional:
    -- content without a creation date cannot be verified as recent.
    AND (filter_max_age_months IS NULL
         OR ck.source_created_at > NOW() - (filter_max_age_months * interval '1 month'))
    -- Quality filter: Engagement — require minimum reply count.
    -- Only applied to bulletin_post source type, since reply_count is only
    -- meaningful for posts. Replies, shakedowns, and shakedown_feedback have
    -- reply_count=0 by definition and should not be penalized.
    AND (filter_min_replies IS NULL
         OR ck.source_type != 'bulletin_post'
         OR ck.reply_count >= filter_min_replies)
  ORDER BY ck.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;

-- Grant to `authenticated` for direct client calls (e.g., user-facing searches).
GRANT EXECUTE ON FUNCTION search_community_knowledge(vector, float, int, text, text[], int, int)
  TO authenticated;

-- Grant to `service_role` for server-side calls via the service-role Supabase client.
-- In Supabase, PostgREST uses the `service_role` PostgreSQL role when the service-role
-- JWT is used (e.g., createServiceRoleClient in lib/supabase/server.ts). The service
-- role bypasses RLS but still requires an explicit EXECUTE grant on functions.
-- Without this grant, server-side RAG searches from the Mastra agent would fail with
-- "permission denied for function search_community_knowledge".
GRANT EXECUTE ON FUNCTION search_community_knowledge(vector, float, int, text, text[], int, int)
  TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN community_knowledge_chunks.reply_count IS
  'Denormalized reply count from the source post. Used as engagement-based quality signal for hybrid RAG filtering.';

COMMENT ON FUNCTION search_community_knowledge IS
  'Performs semantic similarity search on community knowledge chunks using pgvector cosine distance. Supports filtering by source type, tags, recency (max age in months), and engagement (min reply count).';
