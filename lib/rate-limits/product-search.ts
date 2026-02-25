/**
 * Product Search Rate Limiting
 * Feature: XXX-smart-product-search
 *
 * Rate limiting for smart product search (internet searches only).
 * Free tier: 10/day | Trailblazer: Unlimited
 * Uses atomic database function to prevent race conditions.
 */

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Configuration (centralized for easy tuning)
// =============================================================================

/** Daily limit for free tier users (internet searches only) */
export const DAILY_LIMIT_FREE = 10;

/** Operation type identifier for rate limit tracking */
export const OPERATION_TYPE = 'product_search';

/**
 * Catalog score threshold - below this, internet search is triggered.
 * Set at 0.7 because scores above this indicate a confident catalog match.
 */
export const CATALOG_SCORE_THRESHOLD = 0.7;

// =============================================================================
// Types
// =============================================================================

export interface ProductSearchRateLimitStatus {
  /** Whether the user can perform internet search */
  allowed: boolean;
  /** Number of internet searches remaining today */
  remaining: number;
  /** Total daily limit */
  limit: number;
  /** When the limit resets (start of next UTC day) */
  resetAt: Date;
  /** Whether user is on unlimited tier */
  isUnlimited: boolean;
}

interface RateLimitResult {
  exceeded: boolean;
  count: number;
  limit: number;
  remaining: number;
  resets_at: string;
}

// =============================================================================
// Rate Limit Functions
// =============================================================================

/**
 * Check if user can perform an internet product search.
 * Does NOT increment the counter - use recordProductSearchUsage() for that.
 */
export async function checkProductSearchLimit(userId: string): Promise<ProductSearchRateLimitStatus> {
  const supabase = await createClient();

  // Check subscription tier first
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('[ProductSearch RateLimit] Failed to fetch profile:', profileError);
  }

  const isTrailblazer = profile?.subscription_tier === 'trailblazer';

  // Trailblazer users have unlimited searches
  if (isTrailblazer) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      resetAt: getNextUtcDayStart(),
      isUnlimited: true,
    };
  }

  // Use database function to get current status (doesn't increment)
  const { data, error } = await supabase.rpc('get_daily_rate_limit_status', {
    p_user_id: userId,
    p_operation_type: OPERATION_TYPE,
    p_limit: DAILY_LIMIT_FREE,
  });

  if (error) {
    console.error('[ProductSearch RateLimit] Failed to check rate limit:', error);
    // Allow on error to avoid blocking legitimate users
    return {
      allowed: true,
      remaining: DAILY_LIMIT_FREE,
      limit: DAILY_LIMIT_FREE,
      resetAt: getNextUtcDayStart(),
      isUnlimited: false,
    };
  }

  const result = data as unknown as RateLimitResult;

  return {
    allowed: !result.exceeded,
    remaining: result.remaining,
    limit: result.limit,
    resetAt: new Date(result.resets_at),
    isUnlimited: false,
  };
}

/**
 * Record a product search usage (atomically check and increment).
 * Returns the updated rate limit status.
 *
 * Uses database advisory locks to prevent race conditions.
 */
export async function recordProductSearchUsage(userId: string): Promise<ProductSearchRateLimitStatus> {
  const supabase = await createClient();

  // First check if user is Trailblazer (no need to record)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profile?.subscription_tier === 'trailblazer') {
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      resetAt: getNextUtcDayStart(),
      isUnlimited: true,
    };
  }

  // Use atomic database function to check and increment
  const { data, error } = await supabase.rpc('check_and_increment_daily_rate_limit', {
    p_user_id: userId,
    p_operation_type: OPERATION_TYPE,
    p_limit: DAILY_LIMIT_FREE,
  });

  if (error) {
    console.error('[ProductSearch RateLimit] Failed to record usage:', error);
    // Return conservative estimate on error
    return {
      allowed: false,
      remaining: 0,
      limit: DAILY_LIMIT_FREE,
      resetAt: getNextUtcDayStart(),
      isUnlimited: false,
    };
  }

  const result = data as unknown as RateLimitResult;

  return {
    allowed: !result.exceeded,
    remaining: result.remaining,
    limit: result.limit,
    resetAt: new Date(result.resets_at),
    isUnlimited: false,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/** Get the start of the next UTC day (reset time) */
function getNextUtcDayStart(): Date {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ));
  return tomorrow;
}
