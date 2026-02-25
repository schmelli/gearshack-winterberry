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
--
-- =============================================================================
-- ROLLBACK (manual — run these statements to tear down this migration)
-- =============================================================================
-- SELECT cron.unschedule('cleanup-response-cache');
-- DROP TABLE IF EXISTS response_cache CASCADE;
-- DROP FUNCTION IF EXISTS search_response_cache(vector, float, text, text);
-- DROP FUNCTION IF EXISTS increment_cache_hit_count(uuid);
-- DROP FUNCTION IF EXISTS cleanup_expired_response_cache();
-- DROP FUNCTION IF EXISTS update_response_cache_updated_at();
-- =============================================================================

-- Create the response_cache table
CREATE TABLE IF NOT EXISTS response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- query_text is bounded by a CHECK constraint to prevent B-tree index row size overflow.
  -- PostgreSQL's B-tree index limit is ~8191 bytes; very long queries would cause the
  -- UNIQUE index on (query_text, locale, intent_type) to throw at upsert time.
  -- 2000 chars covers all practical user queries while staying well within the limit.
  query_text text NOT NULL CHECK (char_length(query_text) <= 2000),
  query_embedding vector(1536) NOT NULL,
  cached_response text NOT NULL,
  -- CHECK constraint provides a database-level PII defense layer:
  -- even if a future code path misconfigures RESPONSE_CACHE_INTENTS, the DB
  -- rejects writes for intent types that are not known to be user-independent.
  -- Update this list if CACHEABLE_INTENTS in semantic-cache.ts is expanded
  -- (after confirming the new intent cannot carry PII).
  intent_type text NOT NULL DEFAULT 'general_knowledge'
    CHECK (intent_type IN ('general_knowledge', 'gear_comparison')),
  locale text NOT NULL DEFAULT 'en',
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- updated_at tracks when a cache entry was last refreshed (sliding TTL upserts
  -- update this column, making it easy to audit how fresh a cached answer is).
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);

-- Trigger: auto-update updated_at on every row UPDATE (e.g. sliding-TTL upserts)
CREATE OR REPLACE FUNCTION update_response_cache_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_response_cache_updated_at ON response_cache;
CREATE TRIGGER trg_response_cache_updated_at
  BEFORE UPDATE ON response_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_response_cache_updated_at();

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_response_cache_embedding_hnsw
ON response_cache
USING hnsw (query_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for TTL cleanup (find expired entries efficiently)
-- Note: no partial predicate — PostgreSQL evaluates partial index predicates at
-- *plan* time (when the query plan is compiled/cached), not at each execution.
-- A volatile expression like `now()` baked into a partial predicate would become
-- stale the moment the plan is cached, making the predicate meaningless for
-- future-expiring rows. A full index on expires_at is correct here.
CREATE INDEX IF NOT EXISTS idx_response_cache_expires_at
ON response_cache (expires_at);

-- Composite index for the pre-filter used in search_response_cache:
--   WHERE rc.expires_at > now() AND rc.locale = query_locale AND rc.intent_type = query_intent_type
-- All three columns appear in the WHERE clause before the HNSW ANN scan.
-- Including all three avoids a filter step after the index scan as the table grows.
CREATE INDEX IF NOT EXISTS idx_response_cache_locale_intent_expires
ON response_cache (locale, intent_type, expires_at);

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
  query_locale text DEFAULT 'en',
  -- Intent type filter — prevents cross-intent cache hits (e.g. a gear_comparison
  -- response being served for a general_knowledge query on the same topic, where
  -- the intent-specific framing may differ). Always pass the classified intent.
  query_intent_type text DEFAULT 'general_knowledge'
)
RETURNS TABLE (
  id uuid,
  cached_response text,
  similarity float,
  hit_count integer,
  -- query_text is truncated to 80 chars before returning to prevent full PII exposure
  -- to authenticated callers. The full text is stored internally for deduplication
  -- but is never returned in its entirety via this RPC.
  query_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- In pgvector <= 0.6, HNSW does not support pre-filtered (WHERE-clause) searches.
  -- The planner may perform an approximate scan over the full index and then apply
  -- the locale/intent_type/expires_at predicates as a post-scan filter, discarding
  -- rows that don't match. Raising ef_search from the default (40) to 100 increases
  -- the candidate set evaluated by HNSW, improving recall under heavy post-filtering.
  -- pgvector 0.7+ added iterator-based filtered HNSW and may not need this.
  -- TODO: remove once Supabase ships pgvector >= 0.7 and we can rely on filtered HNSW.
  SET LOCAL hnsw.ef_search = 100;

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
      -- Truncate to 80 chars to limit PII exposure in case of intent misclassification.
      -- The full query_text is stored for deduplication but never returned here.
      left(rc.query_text, 80) AS query_text
    FROM response_cache rc
    WHERE
      -- Only return non-expired entries (expires_at is set at insert time as created_at + TTL,
      -- so this single condition covers both the TTL window and any future manual expiry overrides.
      -- A separate created_at filter would be redundant for rows inserted with the default TTL
      -- and would shadow any deliberate short-TTL overrides.)
      rc.expires_at > now()
      -- Filter by locale to serve appropriate language responses
      AND rc.locale = query_locale
      -- Filter by intent type — prevents a gear_comparison answer being returned for
      -- a general_knowledge query about the same topic (framing may differ by intent)
      AND rc.intent_type = query_intent_type
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

GRANT EXECUTE ON FUNCTION search_response_cache(vector, float, text, text) TO authenticated;

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

-- Only service_role may call this function — authenticated end-users could otherwise
-- inflate hit counts for arbitrary cache entries, skewing analytics that drive
-- decisions about which responses to keep warm.
GRANT EXECUTE ON FUNCTION increment_cache_hit_count(uuid) TO service_role;

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

-- Only service_role may call cleanup — authenticated end-users have no business
-- triggering a cache purge. pg_cron runs as superuser and bypasses this check.
GRANT EXECUTE ON FUNCTION cleanup_expired_response_cache() TO service_role;

COMMENT ON FUNCTION cleanup_expired_response_cache IS
  'Removes expired entries from response_cache. Call periodically via pg_cron or application-level scheduler.';

-- Schedule cleanup every 6 hours (if pg_cron is available).
-- Unschedule first to ensure this block is idempotent — applying the migration
-- more than once (e.g. after a rollback-and-reapply) would otherwise raise
-- a duplicate job-name error from pg_cron.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('cleanup-response-cache');
    EXCEPTION WHEN OTHERS THEN
      -- Job didn't exist yet; that's fine, continue to schedule below
      NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-response-cache',
      '0 */6 * * *',
      'SELECT cleanup_expired_response_cache();'
    );
  END IF;
END
$$;
