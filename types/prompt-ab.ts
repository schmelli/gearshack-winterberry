/**
 * TypeScript interfaces for Prompt A/B Testing
 * Feature: A/B Testing for System Prompts (Kap. 29)
 *
 * Supports deterministic variant assignment based on user ID,
 * experiment configuration, and analytics aggregation.
 */

// =============================================================================
// Experiment Configuration
// =============================================================================

/**
 * A single variant within an A/B experiment
 */
export interface PromptVariant {
  /** Short identifier (e.g., "A", "B", "C") */
  id: string;
  /** Human-readable label (e.g., "Ultralight Focus") */
  label: string;
  /** English prompt suffix appended to system prompt */
  suffix_en: string;
  /** German prompt suffix appended to system prompt */
  suffix_de: string;
}

/**
 * An A/B test experiment definition
 */
export interface PromptABExperiment {
  id: string;
  name: string;
  description: string | null;
  variants: PromptVariant[];
  is_active: boolean;
  traffic_percentage: number;
  created_at: string;
  updated_at: string;
  ends_at: string | null;
}

// =============================================================================
// Assignment Tracking
// =============================================================================

/**
 * A recorded variant assignment for a user session
 */
export interface PromptABAssignment {
  id: string;
  experiment_id: string;
  user_id: string;
  variant_id: string;
  conversation_id: string | null;
  experiment_name: string;
  created_at: string;
}

// =============================================================================
// Variant Resolution Result
// =============================================================================

/**
 * Result of resolving which variant a user should receive
 */
export interface VariantResolution {
  /** The experiment this variant belongs to */
  experimentName: string;
  /** The experiment UUID */
  experimentId: string;
  /** The assigned variant ID (e.g., "A" or "B") */
  variantId: string;
  /** The localized prompt suffix to append */
  promptSuffix: string;
  /** Whether the user is in the experiment traffic */
  isInExperiment: boolean;
}

// =============================================================================
// Analytics
// =============================================================================

/**
 * Aggregated analytics for a single variant
 */
export interface VariantAnalytics {
  experiment_name: string;
  variant_id: string;
  unique_users: number;
  total_sessions: number;
  positive_feedbacks: number;
  negative_feedbacks: number;
  total_feedbacks: number;
  satisfaction_rate_pct: number;
}

/**
 * Complete analytics response for an experiment
 */
export interface ExperimentAnalytics {
  experiment: Pick<PromptABExperiment, 'name' | 'description' | 'is_active' | 'created_at'>;
  variants: VariantAnalytics[];
  /** Statistical significance indicator (basic chi-squared) */
  is_significant: boolean;
  /** Total sample size across all variants */
  total_feedback_count: number;
}
