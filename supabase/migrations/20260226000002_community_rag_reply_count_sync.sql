-- Community RAG: Auto-Sync reply_count on Bulletin Reply Changes
-- Feature: Hybrid RAG — Qualitätsfilter (Vorschlag 6, Kap. 19)
--
-- Problem addressed (flagged by Claude and Sentry code reviews):
--   The reply_count column in community_knowledge_chunks is denormalized data that
--   became stale immediately after the initial backfill migration, because nothing
--   updated it when bulletin posts received new replies. A post indexed with 1 reply
--   would permanently miss the minReplies filter even after reaching 10 replies.
--
-- Solution: PostgreSQL trigger on bulletin_replies that recomputes the authoritative
--   live COUNT and propagates it to the matching community_knowledge_chunks rows
--   whenever a reply is created, soft-deleted, or hard-deleted.
--
-- Design decisions:
--   1. Uses COUNT(is_deleted=false) from source-of-truth rather than increment/decrement
--      to be idempotent and avoid race-condition off-by-one errors.
--   2. AFTER trigger so that INSERT COUNT includes the new row correctly.
--   3. UPDATE OF is_deleted shorthand: only recomputes when soft-delete status changes,
--      not on every reply content edit (avoids unnecessary work).
--   4. If no chunks exist yet for a post (not yet indexed), the UPDATE affects 0 rows
--      silently — the reply_count will be captured correctly when the post is indexed.
--
-- Performance note on quality filter indexes:
--   The B-tree indexes added in migration 20260226000001 (idx_community_knowledge_quality,
--   idx_community_knowledge_reply_count) are NOT expected to speed up pgvector ANN
--   searches. pgvector's <=> operator performs a vector scan first and applies scalar
--   filters as post-filters — the query planner generally cannot use B-tree indexes as
--   pre-filters alongside HNSW/IVFFlat. The indexes are retained for potential future
--   scalar-only queries (e.g., dashboards, admin tooling) but should not be relied upon
--   for RAG search performance. Consider EXPLAIN ANALYZE baselines before tuning.

-- ============================================================================
-- Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_rag_chunk_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id UUID;
  v_live_count INT;
BEGIN
  -- Determine which post_id is affected.
  -- On DELETE, only OLD is populated; on INSERT/UPDATE, use NEW.
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);

  -- Guard: only recompute on changes that affect the effective reply count.
  --   INSERT:   new reply added → always affects count
  --   UPDATE:   only when is_deleted transitions (soft-delete or soft-undelete)
  --   DELETE:   row physically removed → affects count
  IF TG_OP = 'UPDATE' AND OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted THEN
    -- is_deleted did not change (e.g., a content edit) — nothing to do
    RETURN NEW;
  END IF;

  -- Recompute the authoritative count from the source of truth.
  -- Running COUNT after the DML ensures:
  --   INSERT: the new row is included (trigger fires AFTER)
  --   UPDATE/DELETE: removed or re-included rows are reflected
  SELECT COUNT(*)::INT
  INTO v_live_count
  FROM bulletin_replies
  WHERE post_id = v_post_id
    AND is_deleted = false;

  -- Propagate to all RAG chunks for the parent post.
  -- If the post has not been indexed yet, this UPDATE affects 0 rows (safe no-op).
  UPDATE community_knowledge_chunks
  SET reply_count = v_live_count
  WHERE source_type = 'bulletin_post'
    AND source_id = v_post_id;

  -- Return the correct row reference for each operation type
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION sync_rag_chunk_reply_count() IS
  'Keeps community_knowledge_chunks.reply_count in sync with the live reply count from bulletin_replies. Fires after INSERT, UPDATE OF is_deleted, or DELETE on bulletin_replies. Uses a live COUNT query (idempotent, race-safe) rather than increment/decrement.';

-- ============================================================================
-- Trigger
-- ============================================================================

-- Drop any pre-existing version of this trigger to allow re-running migrations
-- cleanly in development environments.
DROP TRIGGER IF EXISTS trg_sync_rag_reply_count ON bulletin_replies;

CREATE TRIGGER trg_sync_rag_reply_count
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted
  ON bulletin_replies
  FOR EACH ROW
  EXECUTE FUNCTION sync_rag_chunk_reply_count();

COMMENT ON TRIGGER trg_sync_rag_reply_count ON bulletin_replies IS
  'Auto-syncs community_knowledge_chunks.reply_count whenever a reply is added, soft-deleted, or hard-deleted. Ensures RAG quality filters reflect current engagement levels without manual re-indexing.';

-- ============================================================================
-- Performance: Index to support the trigger's COUNT(*) query
-- ============================================================================
-- The sync_rag_chunk_reply_count() trigger runs on every INSERT, UPDATE OF
-- is_deleted, or DELETE on bulletin_replies. Its COUNT(*) query filters by
-- (post_id, is_deleted = false). Without a covering index on bulletin_replies,
-- this becomes a sequential scan that blocks the writing transaction —
-- increasingly expensive as posts accumulate many replies.
--
-- This partial index covers the exact predicate used in the trigger's query:
--   COUNT(*) FROM bulletin_replies WHERE post_id = v_post_id AND is_deleted = false
CREATE INDEX IF NOT EXISTS idx_bulletin_replies_post_id_active
  ON bulletin_replies (post_id)
  WHERE is_deleted = false;

-- ============================================================================
-- Permissions: Ensure both service_role and authenticated can call search_community_knowledge
-- ============================================================================
-- Migration 20260226000001 granted EXECUTE to both `authenticated` and
-- `service_role`. We re-grant both here for symmetry and future-proofing:
-- if the function is ever dropped and recreated in a subsequent migration,
-- only reading this file would leave `authenticated` without access.
-- PostgreSQL GRANTs are additive, so re-granting is a safe no-op when
-- the grants already exist.
GRANT EXECUTE ON FUNCTION search_community_knowledge(vector, float, int, text, text[], int, int)
  TO authenticated;

GRANT EXECUTE ON FUNCTION search_community_knowledge(vector, float, int, text, text[], int, int)
  TO service_role;
