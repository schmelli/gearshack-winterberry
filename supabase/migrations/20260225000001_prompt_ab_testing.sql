-- =============================================================================
-- Prompt A/B Testing Infrastructure
-- Feature: A/B Testing for System Prompts
--
-- Tables:
--   prompt_ab_experiments: Defines A/B test experiments with variants
--   prompt_ab_assignments: Tracks which user got which variant per session
--
-- Integrates with existing insight_feedback for satisfaction measurement.
-- =============================================================================

-- =============================================================================
-- 1. Experiments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS prompt_ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  -- JSONB array of variant definitions: [{ "id": "A", "suffix": "...", "label": "Ultralight Focus" }]
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Whether this experiment is currently active
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Percentage of traffic to include (0-100), default 100%
  traffic_percentage SMALLINT NOT NULL DEFAULT 100
    CHECK (traffic_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Optional: end date for automatic deactivation
  ends_at TIMESTAMPTZ
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_prompt_ab_experiments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prompt_ab_experiments_updated_at
  BEFORE UPDATE ON prompt_ab_experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_ab_experiments_updated_at();

-- =============================================================================
-- 2. Variant Assignments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS prompt_ab_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES prompt_ab_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id VARCHAR(10) NOT NULL,
  conversation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Denormalized experiment name for fast queries
  experiment_name VARCHAR(100) NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_ab_assignments_experiment_user
  ON prompt_ab_assignments(experiment_id, user_id);
CREATE INDEX idx_ab_assignments_user
  ON prompt_ab_assignments(user_id);
CREATE INDEX idx_ab_assignments_variant
  ON prompt_ab_assignments(experiment_id, variant_id);
CREATE INDEX idx_ab_assignments_created
  ON prompt_ab_assignments(created_at DESC);

-- =============================================================================
-- 2b. Single Active Experiment Constraint
-- =============================================================================

-- Enforce that only one experiment can be active at a time.
-- The application logic (prompt-ab.ts) uses LIMIT 1 and documents this constraint;
-- this index makes it explicit at the DB level and prevents accidental double-activation.
-- To run a new experiment: first set is_active = false on the current one,
-- then create/activate the new one.
CREATE UNIQUE INDEX unique_one_active_experiment
  ON prompt_ab_experiments (is_active)
  WHERE is_active = true;

-- =============================================================================
-- 3. Chat Session Feedback Linking (extends insight_feedback)
-- =============================================================================

-- Add prompt_variant column to insight_feedback for A/B correlation
-- This allows joining feedback data with variant assignments
ALTER TABLE insight_feedback
  ADD COLUMN IF NOT EXISTS prompt_variant VARCHAR(10),
  ADD COLUMN IF NOT EXISTS experiment_name VARCHAR(100);

-- Index for A/B analytics queries
CREATE INDEX IF NOT EXISTS idx_insight_feedback_variant
  ON insight_feedback(prompt_variant)
  WHERE prompt_variant IS NOT NULL;

-- =============================================================================
-- 4. RLS Policies
-- =============================================================================

ALTER TABLE prompt_ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_ab_assignments ENABLE ROW LEVEL SECURITY;

-- Experiments: NO direct read access for regular authenticated users.
-- Experiment details (variant IDs, suffix text, traffic percentages) must NOT be
-- visible to participants — exposing them defeats experiment blinding.
-- All access is mediated server-side via API routes that use the service role client.
--
-- NOTE: The previously considered "Authenticated users can read experiments" policy
-- is intentionally omitted.  Adding it would allow any authenticated user to query
-- prompt_ab_experiments directly (e.g. via Supabase client) and discover which
-- variant they are in, invalidating the blind assignment.

-- Assignments: users can read their own assignments
CREATE POLICY "Users can read own assignments"
  ON prompt_ab_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage everything (for API routes)
CREATE POLICY "Service role manages experiments"
  ON prompt_ab_experiments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages assignments"
  ON prompt_ab_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 5. Seed Default Experiment
-- =============================================================================

INSERT INTO prompt_ab_experiments (name, description, variants, is_active, traffic_percentage)
VALUES (
  'prompt-focus-v1',
  'Tests whether ultralight-focused (A) or value-focused (B) prompt suffix improves user satisfaction',
  '[
    {"id": "A", "label": "Ultralight Focus", "suffix_en": "Always prioritize weight savings and ultralight alternatives in your suggestions.", "suffix_de": "Priorisiere immer Gewichtseinsparungen und Ultraleicht-Alternativen in deinen Vorschlägen."},
    {"id": "B", "label": "Value Focus", "suffix_en": "Always consider budget constraints and value-for-money in your suggestions.", "suffix_de": "Berücksichtige immer Budgetbeschränkungen und das Preis-Leistungs-Verhältnis in deinen Vorschlägen."}
  ]'::jsonb,
  true,
  100
)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 6. Analytics View
-- =============================================================================

-- Refactored from LATERAL JOIN (N+1) to CTEs for O(1) scalability.
-- Assignment and feedback counts are aggregated separately then joined once.
--
-- prompt_ab_analytics      → active experiments only (default dashboard view)
-- prompt_ab_analytics_all  → all experiments including completed ones (post-mortem analysis)

CREATE OR REPLACE VIEW prompt_ab_analytics AS
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
  AND fst.prompt_variant   = ast.variant_id
WHERE e.is_active = true;

-- Same as above but includes inactive/completed experiments for post-mortem analysis.
-- Use via GET /api/mastra/ab-analytics?includeInactive=true
CREATE OR REPLACE VIEW prompt_ab_analytics_all AS
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
