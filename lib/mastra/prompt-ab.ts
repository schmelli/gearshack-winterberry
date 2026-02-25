/**
 * Prompt A/B Testing Module
 * Feature: A/B Testing for System Prompts (Kap. 29)
 *
 * Provides deterministic variant assignment based on user ID,
 * experiment fetching from Supabase, and assignment logging.
 *
 * Key design decisions:
 * - Deterministic hashing: same user always gets same variant (stable per session)
 * - Server-side only: no client-side exposure of experiment details
 * - Graceful degradation: if DB unavailable, returns no variant (control group)
 */

import type {
  PromptABExperiment,
  PromptVariant,
  VariantResolution,
} from '@/types/prompt-ab';

// =============================================================================
// In-Memory Cache for Active Experiments
// =============================================================================

interface CachedExperiment {
  experiment: PromptABExperiment;
  fetchedAt: number;
}

/** Cache TTL: 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

let experimentCache: CachedExperiment | null = null;

/**
 * Clear the experiment cache (useful for testing or forced refresh)
 */
export function clearExperimentCache(): void {
  experimentCache = null;
}

// =============================================================================
// Deterministic Variant Assignment
// =============================================================================

/**
 * Deterministically assign a variant based on user ID.
 *
 * Uses the last characters of the user UUID to compute a stable hash.
 * This ensures:
 * - Same user always gets the same variant (no randomness)
 * - Even distribution across variants (UUID hex digits are uniformly distributed)
 * - No database lookup needed for assignment decision
 *
 * @param userId - User's UUID
 * @param variants - Available variants in the experiment
 * @returns The assigned variant
 */
export function assignVariant(
  userId: string,
  variants: PromptVariant[]
): PromptVariant {
  if (variants.length === 0) {
    throw new Error('Cannot assign variant: no variants defined');
  }

  if (variants.length === 1) {
    return variants[0];
  }

  // Use last 8 hex chars of UUID for deterministic bucketing
  // This gives us 4 billion possible values for even distribution
  const hexSuffix = userId.replace(/-/g, '').slice(-8);
  const numericValue = parseInt(hexSuffix, 16);
  const bucketIndex = numericValue % variants.length;

  return variants[bucketIndex];
}

/**
 * Check if a user is in the experiment's traffic allocation.
 *
 * Uses a different portion of the UUID to avoid correlation
 * with variant assignment.
 *
 * @param userId - User's UUID
 * @param trafficPercentage - Percentage of users to include (0-100)
 * @returns Whether the user should participate in the experiment
 */
export function isInTraffic(userId: string, trafficPercentage: number): boolean {
  if (trafficPercentage >= 100) return true;
  if (trafficPercentage <= 0) return false;

  // Use first 8 hex chars (different from variant assignment)
  const hexPrefix = userId.replace(/-/g, '').slice(0, 8);
  const numericValue = parseInt(hexPrefix, 16);
  // Map to 0-99 range
  const bucket = numericValue % 100;

  return bucket < trafficPercentage;
}

// =============================================================================
// Experiment Fetching
// =============================================================================

/**
 * Fetch the currently active experiment from Supabase.
 *
 * Uses an in-memory cache with 5-minute TTL to avoid
 * hitting the database on every chat request.
 *
 * @param supabaseClient - Supabase service role client
 * @returns The active experiment, or null if none exists
 */
export async function getActiveExperiment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic Supabase client type
  supabaseClient: any
): Promise<PromptABExperiment | null> {
  // Check cache first
  if (
    experimentCache &&
    Date.now() - experimentCache.fetchedAt < CACHE_TTL_MS
  ) {
    return experimentCache.experiment;
  }

  try {
    const { data, error } = await supabaseClient
      .from('prompt_ab_experiments')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // No active experiment
      experimentCache = null;
      return null;
    }

    const experiment: PromptABExperiment = {
      id: data.id,
      name: data.name,
      description: data.description,
      variants: data.variants as PromptVariant[],
      is_active: data.is_active,
      traffic_percentage: data.traffic_percentage,
      created_at: data.created_at,
      updated_at: data.updated_at,
      ends_at: data.ends_at,
    };

    // Check if experiment has expired
    if (experiment.ends_at && new Date(experiment.ends_at) < new Date()) {
      experimentCache = null;
      return null;
    }

    // Update cache
    experimentCache = {
      experiment,
      fetchedAt: Date.now(),
    };

    return experiment;
  } catch {
    // Graceful degradation: return null if DB unavailable
    return null;
  }
}

// =============================================================================
// Variant Resolution (Main Entry Point)
// =============================================================================

/**
 * Resolve which prompt variant a user should receive.
 *
 * This is the main entry point called from the chat API route.
 * It combines experiment fetching, traffic check, and variant assignment.
 *
 * @param userId - User's UUID
 * @param locale - User's locale for suffix selection
 * @param supabaseClient - Supabase service role client
 * @returns VariantResolution with the assigned variant, or null if no experiment active
 */
export async function resolveVariant(
  userId: string,
  locale: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic Supabase client type
  supabaseClient: any
): Promise<VariantResolution | null> {
  const experiment = await getActiveExperiment(supabaseClient);

  if (!experiment || experiment.variants.length === 0) {
    return null;
  }

  // Check if user is in the traffic allocation
  const inTraffic = isInTraffic(userId, experiment.traffic_percentage);
  if (!inTraffic) {
    return {
      experimentName: experiment.name,
      experimentId: experiment.id,
      variantId: 'control',
      promptSuffix: '',
      isInExperiment: false,
    };
  }

  // Assign variant deterministically
  const variant = assignVariant(userId, experiment.variants);
  const isGerman = locale === 'de';
  const suffix = isGerman ? variant.suffix_de : variant.suffix_en;

  return {
    experimentName: experiment.name,
    experimentId: experiment.id,
    variantId: variant.id,
    promptSuffix: suffix,
    isInExperiment: true,
  };
}

// =============================================================================
// Assignment Logging
// =============================================================================

/**
 * Log a variant assignment to the database for analytics.
 *
 * This is non-blocking — failures are logged but don't affect the chat flow.
 *
 * @param supabaseClient - Supabase service role client
 * @param resolution - The resolved variant assignment
 * @param userId - User's UUID
 * @param conversationId - Chat conversation UUID
 */
export async function logAssignment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic Supabase client type
  supabaseClient: any,
  resolution: VariantResolution,
  userId: string,
  conversationId: string
): Promise<void> {
  try {
    await supabaseClient.from('prompt_ab_assignments').insert({
      experiment_id: resolution.experimentId,
      user_id: userId,
      variant_id: resolution.variantId,
      conversation_id: conversationId,
      experiment_name: resolution.experimentName,
    });
  } catch {
    // Non-blocking: assignment logging failure should not affect chat
    console.warn('[PromptAB] Failed to log assignment', {
      experimentName: resolution.experimentName,
      variantId: resolution.variantId,
      userId,
    });
  }
}
