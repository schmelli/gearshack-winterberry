/**
 * Rate Limiter for Mastra Agentic Voice AI
 * Feature: T024 [US1] - Rate Limiting Logic
 *
 * Implements tiered rate limiting for AI operations:
 * - simple_query: Unlimited (no rate limiting)
 * - workflow: 20 requests per hour
 * - voice: 40 requests per hour
 *
 * Uses the atomic check_and_increment_rate_limit PostgreSQL function
 * to prevent race conditions between check and increment operations.
 */

import { createClient } from '@/lib/supabase/server';
import { logRateLimit, logError } from '@/lib/mastra/logging';
import type { RateLimitError } from '@/types/mastra';
import type { Json } from '@/types/supabase';

// ==================== Constants ====================

/**
 * Operation type definitions with their rate limits (per hour)
 * simple_query is unlimited (null limit)
 *
 * In development (NODE_ENV !== 'production'), all limits are disabled
 * to enable unrestricted testing.
 */
const isDevelopment = process.env.NODE_ENV !== 'production';

export const RATE_LIMITS = {
  simple_query: null, // Always unlimited
  workflow: isDevelopment ? null : 20, // Unlimited in dev, 20/hour in prod
  voice: isDevelopment ? null : 40, // Unlimited in dev, 40/hour in prod
} as const;

/**
 * Window duration in hours for rate limiting
 */
const RATE_LIMIT_WINDOW_HOURS = 1;

/**
 * Valid operation types for rate limiting
 */
export type OperationType = keyof typeof RATE_LIMITS;

// ==================== Type Definitions ====================

/**
 * Result of a rate limit check
 */
export interface RateLimitCheckResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in the window (after increment if allowed) */
  currentCount?: number;
  /** Maximum allowed requests (null for unlimited) */
  limit: number | null;
  /** Remaining requests in the window (null for unlimited) */
  remaining: number | null;
  /** When the rate limit window resets */
  resetAt: Date;
  /** Error details if rate limit exceeded */
  error?: RateLimitError['error'];
}

/**
 * Result of incrementing a rate limit counter
 * @deprecated Use checkAndIncrementRateLimit for atomic operations
 */
export interface RateLimitIncrementResult {
  success: boolean;
  error?: string;
}

/**
 * Response shape from check_and_increment_rate_limit RPC
 */
interface RateLimitRpcResponse {
  exceeded: boolean;
  count: number;
  limit: number;
  resets_at: string;
}

// ==================== Helper Functions ====================

/**
 * Calculate the reset time for the current hourly window
 * Reset is at the top of the next hour
 */
function calculateResetTime(): Date {
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setMinutes(0, 0, 0);
  resetTime.setHours(resetTime.getHours() + 1);
  return resetTime;
}

/**
 * Validate that the operation type is valid
 */
function isValidOperationType(operationType: string): operationType is OperationType {
  return operationType in RATE_LIMITS;
}

/**
 * Convert operation type to endpoint format for RPC
 * Maps our operation types to the endpoint parameter expected by check_and_increment_rate_limit
 */
function operationTypeToEndpoint(operationType: OperationType): string {
  return `mastra_${operationType}`;
}

/**
 * Format a user-friendly error message for rate limit exceeded
 */
function formatRateLimitErrorMessage(
  operationType: OperationType,
  limit: number,
  resetAt: Date
): string {
  const minutesUntilReset = Math.ceil((resetAt.getTime() - Date.now()) / 60000);
  const operationLabel = operationType === 'workflow' ? 'workflow' : 'voice';

  return `Rate limit exceeded for ${operationLabel} operations. ` +
    `You have reached the maximum of ${limit} requests per hour. ` +
    `Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`;
}

/**
 * Parse the JSON response from the RPC function
 */
function parseRpcResponse(data: Json): RateLimitRpcResponse | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  if (
    typeof obj.exceeded !== 'boolean' ||
    typeof obj.count !== 'number' ||
    typeof obj.limit !== 'number' ||
    typeof obj.resets_at !== 'string'
  ) {
    return null;
  }

  return {
    exceeded: obj.exceeded,
    count: obj.count,
    limit: obj.limit,
    resets_at: obj.resets_at,
  };
}

// ==================== Main Functions ====================

/**
 * Check if a user has exceeded their rate limit for a given operation type.
 * This is a read-only check that does NOT increment the counter.
 * Use checkAndIncrementRateLimit for atomic check-and-increment.
 *
 * @param userId - The user's UUID
 * @param operationType - The type of operation ('simple_query', 'workflow', 'voice')
 * @returns RateLimitCheckResult indicating whether the request would be allowed
 *
 * @example
 * ```ts
 * const result = await checkRateLimit(userId, 'workflow');
 * if (!result.allowed) {
 *   // Return 429 with result.error
 * }
 * ```
 */
export async function checkRateLimit(
  userId: string,
  operationType: string
): Promise<RateLimitCheckResult> {
  const resetAt = calculateResetTime();

  // Validate operation type
  if (!isValidOperationType(operationType)) {
    logError('Invalid operation type for rate limit check', undefined, {
      userId,
      metadata: { operationType },
    });

    return {
      allowed: false,
      limit: null,
      remaining: null,
      resetAt,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Invalid operation type: ${operationType}`,
        operationType: 'workflow', // Default for error response
        limit: 0,
        resetAt,
      },
    };
  }

  const limit = RATE_LIMITS[operationType];

  // simple_query is unlimited - always allow
  if (limit === null) {
    logRateLimit(userId, operationType, true);
    return {
      allowed: true,
      limit: null,
      remaining: null,
      resetAt,
    };
  }

  try {
    const supabase = await createClient();
    const endpoint = operationTypeToEndpoint(operationType);

    // Query current count from ai_rate_limits table
    const { data, error } = await supabase
      .from('ai_rate_limits')
      .select('count, window_start')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .single();

    if (error) {
      // PGRST116 = no rows found, which means no requests yet
      if (error.code === 'PGRST116') {
        logRateLimit(userId, operationType, true, limit);
        return {
          allowed: true,
          currentCount: 0,
          limit,
          remaining: limit,
          resetAt,
        };
      }

      logError('Failed to check rate limit', error, {
        userId,
        metadata: { operationType, limit },
      });

      // On error, fail open (allow the request) but log the issue
      return {
        allowed: true,
        limit,
        remaining: null,
        resetAt,
      };
    }

    // Check if window has expired
    const windowStart = new Date(data.window_start);
    const windowEnd = new Date(
      windowStart.getTime() + RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000
    );

    if (windowEnd < new Date()) {
      // Window expired, would reset on next request
      logRateLimit(userId, operationType, true, limit);
      return {
        allowed: true,
        currentCount: 0,
        limit,
        remaining: limit,
        resetAt,
      };
    }

    const currentCount = data.count;
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount);
    const actualResetAt = windowEnd;

    logRateLimit(userId, operationType, allowed, remaining);

    if (!allowed) {
      return {
        allowed: false,
        currentCount,
        limit,
        remaining: 0,
        resetAt: actualResetAt,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: formatRateLimitErrorMessage(operationType, limit, actualResetAt),
          operationType: operationType as 'workflow' | 'voice',
          limit,
          resetAt: actualResetAt,
        },
      };
    }

    return {
      allowed: true,
      currentCount,
      limit,
      remaining,
      resetAt: actualResetAt,
    };
  } catch (err) {
    logError('Unexpected error checking rate limit', err, {
      userId,
      metadata: { operationType, limit },
    });

    // Fail open on unexpected errors
    return {
      allowed: true,
      limit,
      remaining: null,
      resetAt,
    };
  }
}

/**
 * Increment the rate limit counter for a user and operation type.
 *
 * @deprecated DO NOT USE - This function is deprecated and will be removed in a future version.
 * Use checkAndIncrementRateLimit for atomic operations.
 * This separate increment function can cause race conditions and defeats atomic rate limiting.
 *
 * @internal This function should not be used in new code and will be removed.
 *
 * @param userId - The user's UUID
 * @param operationType - The type of operation ('simple_query', 'workflow', 'voice')
 * @returns RateLimitIncrementResult indicating success or failure
 */
async function _incrementRateLimit(
  userId: string,
  operationType: string
): Promise<RateLimitIncrementResult> {
  // Validate operation type
  if (!isValidOperationType(operationType)) {
    logError('Invalid operation type for rate limit increment', undefined, {
      userId,
      metadata: { operationType },
    });

    return {
      success: false,
      error: `Invalid operation type: ${operationType}`,
    };
  }

  const limit = RATE_LIMITS[operationType];

  // simple_query is unlimited - no need to track
  if (limit === null) {
    return { success: true };
  }

  // Use the atomic function which increments if not exceeded
  // Note: This means we need to call the full check_and_increment even for increment-only
  // This is intentional to maintain atomicity
  try {
    const supabase = await createClient();
    const endpoint = operationTypeToEndpoint(operationType);

    const { error } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_limit: limit + 1, // +1 to always allow increment (we already checked)
      p_window_hours: RATE_LIMIT_WINDOW_HOURS,
    });

    if (error) {
      logError('Failed to increment rate limit', error, {
        userId,
        metadata: { operationType },
      });

      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    logError('Unexpected error incrementing rate limit', err, {
      userId,
      metadata: { operationType },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check rate limit and increment atomically in a single database operation.
 * This is the recommended function for rate limiting to prevent race conditions.
 *
 * Uses the PostgreSQL check_and_increment_rate_limit function which:
 * 1. Acquires an advisory lock for the user+endpoint
 * 2. Checks if the rate limit would be exceeded
 * 3. If not exceeded, increments the counter
 * 4. Returns the result atomically
 *
 * @param userId - The user's UUID
 * @param operationType - The type of operation ('simple_query', 'workflow', 'voice')
 * @returns RateLimitCheckResult (increment happens atomically if allowed)
 *
 * @example
 * ```ts
 * const result = await checkAndIncrementRateLimit(userId, 'workflow');
 * if (!result.allowed) {
 *   return NextResponse.json(result.error, { status: 429 });
 * }
 * // Proceed with operation...
 * ```
 */
export async function checkAndIncrementRateLimit(
  userId: string,
  operationType: string
): Promise<RateLimitCheckResult> {
  // TESTING: Bypass rate limiting if disabled via environment variable
  // SECURITY: Only allow bypass in non-production environments
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[RATE LIMITER] WARNING: Cannot disable rate limiting in production');
    } else {
      console.log('[RATE LIMITER] BYPASSED - DISABLE_RATE_LIMITING=true (development only)');
      return {
        allowed: true,
        limit: null,
        remaining: null,
        resetAt: calculateResetTime(),
      };
    }
  }

  const resetAt = calculateResetTime();

  // Validate operation type
  if (!isValidOperationType(operationType)) {
    logError('Invalid operation type for rate limit', undefined, {
      userId,
      metadata: { operationType },
    });

    return {
      allowed: false,
      limit: null,
      remaining: null,
      resetAt,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Invalid operation type: ${operationType}`,
        operationType: 'workflow',
        limit: 0,
        resetAt,
      },
    };
  }

  const limit = RATE_LIMITS[operationType];

  // simple_query is unlimited - always allow without tracking
  if (limit === null) {
    logRateLimit(userId, operationType, true);
    return {
      allowed: true,
      limit: null,
      remaining: null,
      resetAt,
    };
  }

  try {
    const supabase = await createClient();
    const endpoint = operationTypeToEndpoint(operationType);

    // Call atomic check_and_increment function
    const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_limit: limit,
      p_window_hours: RATE_LIMIT_WINDOW_HOURS,
    });

    if (error) {
      logError('Failed to check and increment rate limit', error, {
        userId,
        metadata: { operationType, limit },
      });

      // On error, fail open (allow the request) but log the issue
      return {
        allowed: true,
        limit,
        remaining: null,
        resetAt,
      };
    }

    // Parse the response
    const response = parseRpcResponse(data);
    if (!response) {
      logError('Invalid rate limit response format', undefined, {
        userId,
        metadata: { operationType, rawData: data },
      });

      return {
        allowed: true,
        limit,
        remaining: null,
        resetAt,
      };
    }

    const allowed = !response.exceeded;
    const actualResetAt = new Date(response.resets_at);
    const remaining = allowed ? Math.max(0, limit - response.count) : 0;

    logRateLimit(userId, operationType, allowed, remaining);

    if (!allowed) {
      return {
        allowed: false,
        currentCount: response.count,
        limit,
        remaining: 0,
        resetAt: actualResetAt,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: formatRateLimitErrorMessage(operationType, limit, actualResetAt),
          operationType: operationType as 'workflow' | 'voice',
          limit,
          resetAt: actualResetAt,
        },
      };
    }

    return {
      allowed: true,
      currentCount: response.count,
      limit,
      remaining,
      resetAt: actualResetAt,
    };
  } catch (err) {
    logError('Unexpected error in rate limit check', err, {
      userId,
      metadata: { operationType, limit },
    });

    // Fail open on unexpected errors
    return {
      allowed: true,
      limit,
      remaining: null,
      resetAt,
    };
  }
}

/**
 * Get rate limit status for a user across all operation types.
 * Useful for displaying quota information in the UI.
 *
 * @param userId - The user's UUID
 * @returns Object with status for each operation type
 *
 * @example
 * ```ts
 * const status = await getRateLimitStatus(userId);
 * console.log(`Workflows remaining: ${status.workflow.remaining}/${status.workflow.limit}`);
 * ```
 */
export async function getRateLimitStatus(userId: string): Promise<{
  simple_query: { limit: null; remaining: null; unlimited: true };
  workflow: { limit: number; remaining: number; resetAt: Date };
  voice: { limit: number; remaining: number; resetAt: Date };
}> {
  const resetAt = calculateResetTime();

  try {
    const supabase = await createClient();

    // Query both rate limits in parallel
    const [workflowResult, voiceResult] = await Promise.all([
      supabase
        .from('ai_rate_limits')
        .select('count, window_start')
        .eq('user_id', userId)
        .eq('endpoint', operationTypeToEndpoint('workflow'))
        .single(),
      supabase
        .from('ai_rate_limits')
        .select('count, window_start')
        .eq('user_id', userId)
        .eq('endpoint', operationTypeToEndpoint('voice'))
        .single(),
    ]);

    // Calculate remaining for workflow
    let workflowRemaining: number = RATE_LIMITS.workflow;
    let workflowResetAt = resetAt;

    if (!workflowResult.error && workflowResult.data) {
      const windowStart = new Date(workflowResult.data.window_start);
      const windowEnd = new Date(
        windowStart.getTime() + RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000
      );

      if (windowEnd > new Date()) {
        workflowRemaining = Math.max(0, RATE_LIMITS.workflow - workflowResult.data.count);
        workflowResetAt = windowEnd;
      }
    }

    // Calculate remaining for voice
    let voiceRemaining: number = RATE_LIMITS.voice;
    let voiceResetAt = resetAt;

    if (!voiceResult.error && voiceResult.data) {
      const windowStart = new Date(voiceResult.data.window_start);
      const windowEnd = new Date(
        windowStart.getTime() + RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000
      );

      if (windowEnd > new Date()) {
        voiceRemaining = Math.max(0, RATE_LIMITS.voice - voiceResult.data.count);
        voiceResetAt = windowEnd;
      }
    }

    return {
      simple_query: {
        limit: null,
        remaining: null,
        unlimited: true,
      },
      workflow: {
        limit: RATE_LIMITS.workflow,
        remaining: workflowRemaining,
        resetAt: workflowResetAt,
      },
      voice: {
        limit: RATE_LIMITS.voice,
        remaining: voiceRemaining,
        resetAt: voiceResetAt,
      },
    };
  } catch (err) {
    logError('Failed to get rate limit status', err, { userId });

    // Return default values on error
    return {
      simple_query: {
        limit: null,
        remaining: null,
        unlimited: true,
      },
      workflow: {
        limit: RATE_LIMITS.workflow,
        remaining: RATE_LIMITS.workflow,
        resetAt,
      },
      voice: {
        limit: RATE_LIMITS.voice,
        remaining: RATE_LIMITS.voice,
        resetAt,
      },
    };
  }
}
