-- =============================================================================
-- Prompt A/B Testing — Follow-up Fixes
-- Migration: 20260225000002
--
-- 1. Unique constraint on prompt_ab_assignments to prevent unbounded row growth:
--    Every chat message previously inserted a new assignment row.  A unique
--    partial index ensures at most one row per (experiment, user, conversation),
--    keeping the table bounded to conversation-level granularity.
--
-- 2. Analytics view refactoring — eliminate duplicate CTE logic:
--    The original prompt_ab_analytics and prompt_ab_analytics_all views
--    contained identical CTEs (assignment_stats, feedback_stats).  Any future
--    fix to the aggregation logic required two changes.  This migration
--    introduces prompt_ab_analytics_base as a single source of truth and
--    replaces the two views with thin wrappers around it.
-- =============================================================================

-- =============================================================================
-- 1. Unique Partial Index: One assignment row per (experiment, user, conversation)
-- =============================================================================

-- Prevents logAssignment() from inserting duplicate rows on every chat message.
-- Partial (WHERE conversation_id IS NOT NULL) because NULL values are never equal
-- in PostgreSQL unique constraints — a NULL conversation_id would bypass the
-- constraint.  In practice, conversation_id is always a UUID in the chat flow
-- (generated via crypto.randomUUID() if not provided by the client).
--
-- logAssignment() uses upsert with onConflict: 'experiment_id,user_id,conversation_id'
-- and ignoreDuplicates: true to silently skip re-inserts for the same conversation.
CREATE UNIQUE INDEX IF NOT EXISTS unique_ab_assignment_per_conversation
  ON prompt_ab_assignments (experiment_id, user_id, conversation_id)
  WHERE conversation_id IS NOT NULL;

-- =============================================================================
-- 2. Analytics View Refactoring: Base view + thin wrappers
-- =============================================================================

-- Drop the old views (will be recreated below)
DROP VIEW IF EXISTS prompt_ab_analytics;
DROP VIEW IF EXISTS prompt_ab_analytics_all;

-- Base view: all experiments, all variants, no is_active filter.
-- Contains the CTEs exactly once; both wrapper views select from here.
CREATE OR REPLACE VIEW prompt_ab_analytics_base AS
WITH assignment_stats AS (
  SELECT
    a.experiment_id,
    a.variant_id,
    COUNT(DISTINCT a.user_id) AS unique_users,
    COUNT(a.id)               AS total_sessions
  FROM prompt_ab_assignments a
  GROUP BY a.experiment_id, a.variant_id
),
feedback_stats AS (
  SELECT
    f.experiment_name,
    f.prompt_variant,
    COUNT(*) FILTER (WHERE f.is_positive = true)  AS positive_feedbacks,
    COUNT(*) FILTER (WHERE f.is_positive = false) AS negative_feedbacks,
    COUNT(*)                                       AS total_feedbacks
  FROM insight_feedback f
  WHERE f.experiment_name IS NOT NULL
    AND f.prompt_variant  IS NOT NULL
  GROUP BY f.experiment_name, f.prompt_variant
)
SELECT
  e.name                                          AS experiment_name,
  e.is_active,
  ast.variant_id,
  ast.unique_users,
  ast.total_sessions,
  COALESCE(fst.positive_feedbacks,  0)            AS positive_feedbacks,
  COALESCE(fst.negative_feedbacks,  0)            AS negative_feedbacks,
  COALESCE(fst.total_feedbacks,     0)            AS total_feedbacks,
  CASE
    WHEN COALESCE(fst.total_feedbacks, 0) > 0
    THEN ROUND(
           fst.positive_feedbacks::numeric / fst.total_feedbacks * 100,
           1
         )
    ELSE 0
  END                                             AS satisfaction_rate_pct
FROM prompt_ab_experiments e
JOIN assignment_stats ast
  ON ast.experiment_id = e.id
LEFT JOIN feedback_stats fst
  ON  fst.experiment_name = e.name
  AND fst.prompt_variant   = ast.variant_id;

-- Active experiments only (default dashboard view)
-- Used by GET /api/mastra/ab-analytics (no includeInactive param)
CREATE OR REPLACE VIEW prompt_ab_analytics AS
  SELECT
    experiment_name,
    variant_id,
    unique_users,
    total_sessions,
    positive_feedbacks,
    negative_feedbacks,
    total_feedbacks,
    satisfaction_rate_pct
  FROM prompt_ab_analytics_base
  WHERE is_active = true;

-- All experiments including inactive/completed (post-mortem analysis)
-- Used by GET /api/mastra/ab-analytics?includeInactive=true
CREATE OR REPLACE VIEW prompt_ab_analytics_all AS
  SELECT
    experiment_name,
    variant_id,
    unique_users,
    total_sessions,
    positive_feedbacks,
    negative_feedbacks,
    total_feedbacks,
    satisfaction_rate_pct
  FROM prompt_ab_analytics_base;
