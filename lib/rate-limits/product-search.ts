/**
 * Product Search Rate Limiting
 *
 * Feature: XXX-smart-product-search
 *
 * Rate limiting utilities for smart product search feature.
 * Free tier: 10 internet searches per day
 * Trailblazer tier: Unlimited
 *
 * Note: Catalog searches are always free (no rate limiting).
 * Rate limiting only applies to internet searches.
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

// =============================================================================
// Constants
// =============================================================================

/** Daily limit for free tier users (internet searches only) */
export const DAILY_LIMIT_FREE = 10;

/** Operation type for rate limit tracking */
export const OPERATION_TYPE = 'product_search';

/** Score threshold - below this, internet search is triggered */
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

type RateLimitRow = Database['public']['Tables']['rate_limit_tracking']['Row'];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the start of the current UTC day
 */
function getUtcDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Get the start of the next UTC day (reset time)
 */
function getNextUtcDayStart(): Date {
  const dayStart = getUtcDayStart();
  dayStart.setUTCDate(dayStart.getUTCDate() + 1);
  return dayStart;
}

// =============================================================================
// Rate Limit Functions
// =============================================================================

/**
 * Check if user can perform an internet product search
 *
 * @param userId - The user's ID
 * @returns Rate limit status including whether search is allowed
 */
export async function checkProductSearchLimit(userId: string): Promise<ProductSearchRateLimitStatus> {
  const supabase = await createClient();

  // First check subscription tier
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('[ProductSearch RateLimit] Failed to fetch profile:', profileError);
    // Default to standard tier on error
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

  // For free tier, check rate limit
  const dayStart = getUtcDayStart();

  const { data: rateLimit, error: rateLimitError } = await supabase
    .from('rate_limit_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('operation_type', OPERATION_TYPE)
    .gte('window_start', dayStart.toISOString())
    .maybeSingle();

  if (rateLimitError) {
    console.error('[ProductSearch RateLimit] Failed to fetch rate limit:', rateLimitError);
    // Allow on error to avoid blocking legitimate users
    return {
      allowed: true,
      remaining: DAILY_LIMIT_FREE,
      limit: DAILY_LIMIT_FREE,
      resetAt: getNextUtcDayStart(),
      isUnlimited: false,
    };
  }

  const currentCount = (rateLimit as RateLimitRow | null)?.request_count ?? 0;
  const remaining = Math.max(0, DAILY_LIMIT_FREE - currentCount);

  return {
    allowed: remaining > 0,
    remaining,
    limit: DAILY_LIMIT_FREE,
    resetAt: getNextUtcDayStart(),
    isUnlimited: false,
  };
}

/**
 * Record a product search usage (internet search)
 *
 * Increments the counter for the current day.
 * Creates a new record if none exists for today.
 *
 * @param userId - The user's ID
 */
export async function recordProductSearchUsage(userId: string): Promise<void> {
  const supabase = await createClient();
  const dayStart = getUtcDayStart();
  const now = new Date();

  // Try to find existing record for today
  const { data: existing, error: fetchError } = await supabase
    .from('rate_limit_tracking')
    .select('id, request_count')
    .eq('user_id', userId)
    .eq('operation_type', OPERATION_TYPE)
    .gte('window_start', dayStart.toISOString())
    .maybeSingle();

  if (fetchError) {
    console.error('[ProductSearch RateLimit] Failed to fetch existing record:', fetchError);
    return;
  }

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('rate_limit_tracking')
      .update({
        request_count: existing.request_count + 1,
        last_request_at: now.toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[ProductSearch RateLimit] Failed to update rate limit:', updateError);
    }
  } else {
    // Create new record for today
    const { error: insertError } = await supabase
      .from('rate_limit_tracking')
      .insert({
        user_id: userId,
        operation_type: OPERATION_TYPE,
        request_count: 1,
        window_start: dayStart.toISOString(),
        last_request_at: now.toISOString(),
      });

    if (insertError) {
      console.error('[ProductSearch RateLimit] Failed to create rate limit record:', insertError);
    }
  }
}

/**
 * Get current rate limit status without modifying it
 *
 * Useful for displaying remaining searches in the UI
 *
 * @param userId - The user's ID
 * @returns Rate limit status
 */
export async function getProductSearchLimitStatus(userId: string): Promise<ProductSearchRateLimitStatus> {
  return checkProductSearchLimit(userId);
}
