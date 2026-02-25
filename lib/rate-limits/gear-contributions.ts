/**
 * Gear Contributions Rate Limiting
 * Feature: URL-Import & Contributions Pipeline
 *
 * Rate limiting for gear contribution submissions.
 * All users: 50 contributions per hour
 * Uses atomic database function to prevent race conditions.
 */

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

// =============================================================================
// Configuration
// =============================================================================

/** Hourly limit for all users */
export const HOURLY_LIMIT = 50;

/** Operation type identifier for rate limit tracking */
export const OPERATION_TYPE = 'gear_contribution';

/** Window duration in hours */
const WINDOW_HOURS = 1;

// =============================================================================
// Types
// =============================================================================

export interface ContributionRateLimitStatus {
  /** Whether the user can submit a contribution */
  allowed: boolean;
  /** Number of contributions remaining this hour */
  remaining: number;
  /** Total hourly limit */
  limit: number;
  /** When the limit resets (top of next hour) */
  resetAt: Date;
}

interface RateLimitRpcResponse {
  exceeded: boolean;
  count: number;
  limit: number;
  resets_at: string;
}

// =============================================================================
// Rate Limit Functions
// =============================================================================

/**
 * Check and record a gear contribution usage (atomically check and increment).
 * Returns the updated rate limit status.
 *
 * Uses database advisory locks to prevent race conditions in distributed
 * serverless environments.
 *
 * @param userId - The user's UUID
 * @returns Rate limit status with remaining contributions
 */
export async function checkAndRecordContribution(
  userId: string
): Promise<ContributionRateLimitStatus> {
  const supabase = await createClient();

  // Use atomic database function to check and increment
  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: userId,
    p_endpoint: OPERATION_TYPE,
    p_limit: HOURLY_LIMIT,
    p_window_hours: WINDOW_HOURS,
  });

  if (error) {
    console.error('[GearContribution RateLimit] Failed to check rate limit:', error);
    // Fail open on error to avoid blocking legitimate users
    return {
      allowed: true,
      remaining: HOURLY_LIMIT,
      limit: HOURLY_LIMIT,
      resetAt: getNextHourStart(),
    };
  }

  const result = parseRpcResponse(data);
  if (!result) {
    console.error('[GearContribution RateLimit] Invalid RPC response format');
    return {
      allowed: true,
      remaining: HOURLY_LIMIT,
      limit: HOURLY_LIMIT,
      resetAt: getNextHourStart(),
    };
  }

  return {
    allowed: !result.exceeded,
    remaining: result.exceeded ? 0 : Math.max(0, HOURLY_LIMIT - result.count),
    limit: HOURLY_LIMIT,
    resetAt: new Date(result.resets_at),
  };
}

/**
 * Check current contribution rate limit status without incrementing.
 * Useful for displaying remaining quota in the UI.
 *
 * @param userId - The user's UUID
 * @returns Current rate limit status
 */
export async function getContributionLimitStatus(
  userId: string
): Promise<ContributionRateLimitStatus> {
  const supabase = await createClient();

  // Query current count from ai_rate_limits table
  const { data, error } = await supabase
    .from('ai_rate_limits')
    .select('count, window_start')
    .eq('user_id', userId)
    .eq('endpoint', OPERATION_TYPE)
    .maybeSingle();

  if (error) {
    console.error('[GearContribution RateLimit] Failed to fetch status:', error);
    return {
      allowed: true,
      remaining: HOURLY_LIMIT,
      limit: HOURLY_LIMIT,
      resetAt: getNextHourStart(),
    };
  }

  // No record means no contributions this hour
  if (!data) {
    return {
      allowed: true,
      remaining: HOURLY_LIMIT,
      limit: HOURLY_LIMIT,
      resetAt: getNextHourStart(),
    };
  }

  // Check if window has expired
  const windowStart = new Date(data.window_start);
  const windowEnd = new Date(windowStart.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  if (windowEnd < new Date()) {
    // Window expired, would reset on next request
    return {
      allowed: true,
      remaining: HOURLY_LIMIT,
      limit: HOURLY_LIMIT,
      resetAt: getNextHourStart(),
    };
  }

  const remaining = Math.max(0, HOURLY_LIMIT - data.count);

  return {
    allowed: remaining > 0,
    remaining,
    limit: HOURLY_LIMIT,
    resetAt: windowEnd,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/** Get the start of the next hour (reset time) */
function getNextHourStart(): Date {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  return nextHour;
}

/** Parse the JSON response from the RPC function */
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
