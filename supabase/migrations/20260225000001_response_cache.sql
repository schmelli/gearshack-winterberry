-- Semantic Response Cache for frequent factual questions
-- Feature: Intelligent Response Caching (Vorschlag 19, Kap. 31)
--
-- Stores AI responses with vector embeddings for semantic similarity matching.
-- Factual questions like "What's the difference between Gore-Tex and eVent?"
-- are served from cache instead of making a full LLM call.
--
-- Cache strategy:
--   - 48h TTL for general_knowledge intents
--   - 0.95 cosine similarity threshold (very strict — near-identical questions only)
--   - Global cache (not per-user) for factual questions
--   - Automatic cleanup via pg_cron

-- Create the response_cache table
CREATE TABLE IF NOT EXISTS response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text text NOT NULL,
  query_embedding vector(1536) NOT NULL,
  cached_response text NOT NULL,
  intent_type text NOT NULL DEFAULT 'general_knowledge',
  locale text NOT NULL DEFAULT 'en',
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_response_cache_embedding_hnsw
ON response_cache
USING hnsw (query_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for TTL cleanup (find expired entries efficiently)
-- Note: no partial predicate — PostgreSQL evaluates partial index predicates at
-- row insertion time, not scan time, so `WHERE expires_at < now()` would only
-- index rows that were already expired when inserted (i.e. never).
CREATE INDEX IF NOT EXISTS idx_response_cache_expires_at
ON response_cache (expires_at);

-- Index for locale + expiry filtering (used together in search_response_cache WHERE clause)
CREATE INDEX IF NOT EXISTS idx_response_cache_locale_expires_at
ON response_cache (locale, expires_at);

-- Unique constraint to prevent duplicate entries from concurrent cache stores
CREATE UNIQUE INDEX IF NOT EXISTS idx_response_cache_dedup
ON response_cache (query_text, locale, intent_type);

-- Enable Row Level Security — all access must go through SECURITY DEFINER RPC functions
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

-- Block direct client access; server-side service_role bypasses RLS automatically
CREATE POLICY no_direct_access ON response_cache
  FOR ALL USING (false);

-- Comments
COMMENT ON TABLE response_cache IS
  'Semantic cache for AI chat responses. Stores embeddings of frequent factual questions to avoid redundant LLM calls. 48h TTL, 0.95 similarity threshold.';
COMMENT ON COLUMN response_cache.query_embedding IS
  'Embedding vector (1536 dims, text-embedding-3-small) for cosine similarity matching.';
COMMENT ON COLUMN response_cache.hit_count IS
  'Number of times this cached response was served. Used for analytics.';
COMMENT ON COLUMN response_cache.query_text IS
  'Raw user query text. Only cacheable intents (general_knowledge, gear_comparison) are stored here — these are factual, user-independent questions that never contain PII. Do not change the CACHEABLE_INTENTS set in semantic-cache.ts without reviewing this data-governance constraint.';

-- =============================================================================
-- RPC: search_response_cache
-- =============================================================================

CREATE OR REPLACE FUNCTION search_response_cache(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.95,
  max_age_hours int DEFAULT 48,
  query_locale text DEFAULT 'en'
)
RETURNS TABLE (
  id uuid,
  cached_response text,
  similarity float,
  hit_count integer,
  query_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use a CTE to compute cosine similarity once per candidate row.
  -- Without a CTE, the <=> operator would be evaluated twice: once in WHERE
  -- to apply the threshold, and again in SELECT to return the value.
  -- pgvector cannot optimise this away, so the CTE avoids the redundant work.
  RETURN QUERY
  WITH candidates AS (
    SELECT
      rc.id,
      rc.cached_response,
      (1 - (rc.query_embedding <=> search_response_cache.query_embedding))::float AS similarity,
      rc.hit_count,
      rc.query_text
    FROM response_cache rc
    WHERE
      -- Only return non-expired entries
      rc.expires_at > now()
      -- Apply max_age_hours as an additional recency guard (caller controls TTL window)
      AND rc.created_at > now() - (max_age_hours * interval '1 hour')
      -- Filter by locale
      AND rc.locale = query_locale
  )
  SELECT
    candidates.id,
    candidates.cached_response,
    candidates.similarity,
    candidates.hit_count,
    candidates.query_text
  FROM candidates
  WHERE candidates.similarity > similarity_threshold
  ORDER BY candidates.similarity DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION search_response_cache(vector, float, int, text) TO authenticated;

COMMENT ON FUNCTION search_response_cache IS
  'Searches the response cache for semantically similar questions. Returns the best matching cached response if similarity exceeds threshold and entry is not expired.';

-- =============================================================================
-- RPC: increment_cache_hit_count
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_cache_hit_count(cache_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE response_cache
  SET hit_count = hit_count + 1
  WHERE id = cache_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_cache_hit_count(uuid) TO authenticated;

-- =============================================================================
-- Cleanup: remove expired cache entries (runs via pg_cron if available)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_response_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM response_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_response_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_response_cache() TO service_role;

COMMENT ON FUNCTION cleanup_expired_response_cache IS
  'Removes expired entries from response_cache. Call periodically via pg_cron or application-level scheduler.';

-- Schedule cleanup every 6 hours (if pg_cron is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-response-cache',
      '0 */6 * * *',
      'SELECT cleanup_expired_response_cache();'
    );
  END IF;
END
$$;
