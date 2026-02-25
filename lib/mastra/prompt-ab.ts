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

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logWarn } from '@/lib/mastra/logging';
import type {
  PromptABExperiment,
  PromptVariant,
  VariantResolution,
} from '@/types/prompt-ab';

// =============================================================================
// Zod Validation Schema for DB data
// =============================================================================

const promptVariantSchema = z.object({
  id: z.string().max(10),
  label: z.string().max(100),
  // Max 500 chars to prevent excessively long injections into the system prompt
  suffix_en: z.string().max(500),
  suffix_de: z.string().max(500),
});

const promptVariantArraySchema = z.array(promptVariantSchema);

// =============================================================================
// In-Memory Cache for Active Experiments
// =============================================================================

interface CachedExperiment {
  experiment: PromptABExperiment;
  fetchedAt: number;
}

/** Cache TTL: 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * NOTE: This cache is module-level (per Node.js process / server instance).
 * In serverless environments each cold start resets the cache, so TTL
 * primarily helps within a single long-running server process. This is
 * intentional — the TTL still reduces DB queries significantly under load.
 */
let experimentCache: CachedExperiment | null = null;

/**
 * Tracks the last time we confirmed there was NO active experiment.
 * Prevents hitting the DB on every request when no experiment is running.
 */
let noExperimentFetchedAt: number | null = null;

/**
 * Clear the experiment cache (useful for testing or forced refresh)
 */
export function clearExperimentCache(): void {
  experimentCache = null;
  noExperimentFetchedAt = null;
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
 * NOTE: Only the most recently created active experiment is returned.
 * Multi-experiment support is a future enhancement.
 *
 * @param supabaseClient - Supabase service role client
 * @returns The active experiment, or null if none exists
 */
export async function getActiveExperiment(
  supabaseClient: SupabaseClient
): Promise<PromptABExperiment | null> {
  const now = Date.now();

  // Check positive cache: a known active experiment
  if (experimentCache && now - experimentCache.fetchedAt < CACHE_TTL_MS) {
    const cached = experimentCache.experiment;
    // Also validate ends_at hasn't passed since we cached it
    if (cached.ends_at && new Date(cached.ends_at) < new Date()) {
      // Experiment expired while in cache — invalidate and fall through to DB
      experimentCache = null;
    } else {
      return cached;
    }
  }

  // Check negative cache: we recently confirmed no active experiment exists
  if (noExperimentFetchedAt !== null && now - noExperimentFetchedAt < CACHE_TTL_MS) {
    return null;
  }

  try {
    // Filter by ends_at at the DB level to avoid fetching already-expired experiments.
    // The client-side expiry check below handles the cache-served case.
    const { data, error } = await supabaseClient
      .from('prompt_ab_experiments')
      .select('*')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // PGRST116 = PostgREST "no rows returned" for a .single() call —
      // this is the expected state when no active experiment exists.
      // Stamp the negative cache so we skip the DB for the next 5 min.
      //
      // Any other error code is a transient/infrastructure failure (network
      // timeout, connection refused, etc.).  Do NOT stamp the negative cache
      // for these — the next request should retry instead of being silently
      // suppressed for 5 minutes.
      if (error.code === 'PGRST116') {
        noExperimentFetchedAt = now;
        experimentCache = null;
      } else {
        console.error('[PromptAB] Transient DB error fetching experiment', { error });
      }
      return null;
    }

    if (!data) {
      // Defensive: .single() without error shouldn't return null data, but handle it.
      noExperimentFetchedAt = now;
      experimentCache = null;
      return null;
    }

    // Validate variants JSONB field at runtime to catch malformed DB data
    const variantsResult = promptVariantArraySchema.safeParse(data.variants);
    if (!variantsResult.success) {
      console.error('[PromptAB] Invalid variants schema in DB', {
        experimentName: data.name,
        error: variantsResult.error.flatten(),
      });
      noExperimentFetchedAt = now;
      return null;
    }

    const experiment: PromptABExperiment = {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string | null,
      variants: variantsResult.data,
      is_active: data.is_active as boolean,
      traffic_percentage: data.traffic_percentage as number,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      ends_at: data.ends_at as string | null,
    };

    // Check if experiment has already expired
    if (experiment.ends_at && new Date(experiment.ends_at) < new Date()) {
      noExperimentFetchedAt = now;
      experimentCache = null;
      return null;
    }

    // Update positive cache
    experimentCache = {
      experiment,
      fetchedAt: now,
    };
    noExperimentFetchedAt = null;

    return experiment;
  } catch (error) {
    // Graceful degradation: return null if DB unavailable
    console.error('[PromptAB] Failed to fetch active experiment', { error });
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
  supabaseClient: SupabaseClient
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
  supabaseClient: SupabaseClient,
  resolution: VariantResolution,
  userId: string,
  conversationId: string
): Promise<void> {
  try {
    // Upsert with ignoreDuplicates to prevent unbounded row growth.
    // Every chat message calls logAssignment; without deduplication the table
    // would accumulate one row per message (not per conversation).
    // The unique index on (experiment_id, user_id, conversation_id) WHERE
    // conversation_id IS NOT NULL (added in migration 20260225000002) makes
    // this upsert a no-op for subsequent messages in the same conversation.
    await supabaseClient.from('prompt_ab_assignments').upsert(
      {
        experiment_id: resolution.experimentId,
        user_id: userId,
        variant_id: resolution.variantId,
        conversation_id: conversationId,
        experiment_name: resolution.experimentName,
      },
      {
        onConflict: 'experiment_id,user_id,conversation_id',
        ignoreDuplicates: true,
      }
    );
  } catch {
    // Non-blocking: assignment logging failure should not affect chat
    logWarn('[PromptAB] Failed to log assignment', {
      metadata: {
        experimentName: resolution.experimentName,
        variantId: resolution.variantId,
        userId,
      },
    });
  }
}
