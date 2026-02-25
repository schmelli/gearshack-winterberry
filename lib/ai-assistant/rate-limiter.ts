/**
 * Web Search Rate Limiter
 * Feature 050: AI Assistant - Phase 2B Web Search Integration
 *
 * Enforces usage quotas for web search to prevent cost overruns.
 * Implements per-conversation, daily, and monthly limits.
 */

import { createClient } from '@/lib/supabase/server';
import { validateWebSearchConfig } from '@/lib/env';
import {
  getTodayStart,
  getTodayEnd,
  getMonthStart,
  getMonthEnd,
} from '@/lib/utils/date';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Web search usage table schema
 * Defined in migration 20251220000003_web_search_usage.sql
 *
 * Note: This table may not be in the generated types yet if migrations
 * haven't been applied or types haven't been regenerated. We use type
 * assertions through 'unknown' to safely access this table.
 */
interface _WebSearchUsageRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  search_query: string;
  search_type: string;
  results_count: number;
  cached: boolean;
  cost_usd: number;
  created_at: string;
}

interface WebSearchUsageInsert {
  id?: string;
  user_id: string;
  conversation_id: string | null;
  search_query: string;
  search_type: string;
  results_count: number;
  cached: boolean;
  cost_usd: number;
  created_at?: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: {
    conversation: number;
    daily: number;
    monthly: number;
  };
  resetAt: {
    daily: string;
    monthly: string;
  };
  reason?: string;
}

/**
 * Web search usage record
 */
export interface WebSearchUsage {
  userId: string;
  conversationId: string | null;
  query: string;
  searchType: string;
  resultCount: number;
  cacheHit: boolean;
  createdAt: string;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Get rate limit configuration from validated environment
 */
function getRateLimitsFromEnv() {
  const config = validateWebSearchConfig();
  if (!config) {
    return {
      perConversation: 2,
      perDay: 10,
      perMonth: 100,
    };
  }
  return {
    perConversation: config.limits.conversation,
    perDay: config.limits.daily,
    perMonth: config.limits.monthly,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if a user can perform a web search.
 * Enforces rate limits at conversation, daily, and monthly levels.
 *
 * Race Condition Note:
 * This function uses a check-then-act pattern which has a theoretical race condition
 * where multiple concurrent requests could exceed limits by a small margin. This is
 * acceptable because:
 * 1. Usage is only recorded AFTER successful search completion (in recordWebSearchUsage)
 * 2. This is a cost control mechanism, not a security boundary
 * 3. The system fails open (allows search on error) to prioritize user experience
 * 4. Slight overcounting (e.g., 11/10 searches) is acceptable and self-corrects
 * 5. Postgres provides read committed isolation by default, reducing race window
 *
 * For stricter enforcement, consider:
 * - Database stored procedure with SELECT FOR UPDATE
 * - Redis atomic counters with INCR/DECR
 * - Optimistic locking with version numbers
 *
 * @param userId - User's UUID
 * @param conversationId - Current conversation UUID (optional)
 * @returns Rate limit check result with remaining quotas
 */
export async function checkWebSearchLimit(
  userId: string,
  conversationId?: string | null
): Promise<RateLimitResult> {
  // Check if rate limiting is disabled (for testing)
  const rateLimitingDisabled = process.env.NODE_ENV !== 'production' && process.env.AI_RATE_LIMITING_DISABLED === 'true';

  if (rateLimitingDisabled) {
    const limits = getRateLimitsFromEnv();
    return {
      allowed: true,
      remaining: {
        conversation: limits.perConversation,
        daily: limits.perDay,
        monthly: limits.perMonth,
      },
      resetAt: { daily: getTodayEnd(), monthly: getMonthEnd() },
      reason: 'Rate limiting disabled for testing',
    };
  }

  // Check if web search is enabled and get limits
  const config = validateWebSearchConfig();
  if (!config || !config.enabled) {
    return {
      allowed: false,
      remaining: { conversation: 0, daily: 0, monthly: 0 },
      resetAt: { daily: getTodayEnd(), monthly: getMonthEnd() },
      reason: 'Web search is not enabled',
    };
  }

  const RATE_LIMITS = getRateLimitsFromEnv();

  try {
    // Get Supabase client
    // Note: web_search_usage table may not be in generated types yet
    const supabase = await createClient();
    const todayStart = getTodayStart();
    const monthStart = getMonthStart();

    // Count usage for this conversation (if provided)
    let conversationCount = 0;
    if (conversationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: convCount, error: convError } = await (supabase as any)
        .from('web_search_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('conversation_id', conversationId);

      if (convError) {
        console.error('[Rate Limiter] Error checking conversation usage:', convError);
      } else {
        conversationCount = convCount || 0;
      }
    }

    // Count today's usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: dailyCount, error: dailyError } = await (supabase as any)
      .from('web_search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart);

    if (dailyError) {
      console.error('[Rate Limiter] Error checking daily usage:', dailyError);
    }

    // Count this month's usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: monthlyCount, error: monthlyError } = await (supabase as any)
      .from('web_search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart);

    if (monthlyError) {
      console.error('[Rate Limiter] Error checking monthly usage:', monthlyError);
    }

    const usedDaily = dailyCount || 0;
    const usedMonthly = monthlyCount || 0;

    // Calculate remaining
    const remaining = {
      conversation: Math.max(0, RATE_LIMITS.perConversation - conversationCount),
      daily: Math.max(0, RATE_LIMITS.perDay - usedDaily),
      monthly: Math.max(0, RATE_LIMITS.perMonth - usedMonthly),
    };

    // Check if any limit is exceeded
    let reason: string | undefined;
    let allowed = true;

    if (conversationId && remaining.conversation <= 0) {
      allowed = false;
      reason = `Conversation limit reached (${RATE_LIMITS.perConversation} searches per conversation)`;
    } else if (remaining.daily <= 0) {
      allowed = false;
      reason = `Daily limit reached (${RATE_LIMITS.perDay} searches per day)`;
    } else if (remaining.monthly <= 0) {
      allowed = false;
      reason = `Monthly limit reached (${RATE_LIMITS.perMonth} searches per month)`;
    }

    return {
      allowed,
      remaining,
      resetAt: {
        daily: getTodayEnd(),
        monthly: getMonthEnd(),
      },
      reason,
    };
  } catch (error) {
    console.error('[Rate Limiter] Error checking rate limits:', error);
    // Fail open - allow the search but log the error
    const limits = getRateLimitsFromEnv();
    return {
      allowed: true,
      remaining: {
        conversation: limits.perConversation,
        daily: limits.perDay,
        monthly: limits.perMonth,
      },
      resetAt: {
        daily: getTodayEnd(),
        monthly: getMonthEnd(),
      },
    };
  }
}

/**
 * Record a web search usage.
 * Should be called after a successful search (cache miss only).
 *
 * @param usage - Web search usage details
 */
export async function recordWebSearchUsage(usage: WebSearchUsage): Promise<void> {
  // Don't record cache hits - they don't cost API credits
  if (usage.cacheHit) {
    return;
  }

  try {
    // Get Supabase client
    // Note: web_search_usage table may not be in generated types yet
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('web_search_usage').insert({
      user_id: usage.userId,
      conversation_id: usage.conversationId,
      search_query: usage.query,
      search_type: usage.searchType,
      results_count: usage.resultCount,
      cached: usage.cacheHit,
      cost_usd: 0.0003, // ~$0.0003 per Serper API call
      created_at: usage.createdAt || new Date().toISOString(),
    } as WebSearchUsageInsert);

    if (error) {
      console.error('[Rate Limiter] Error recording usage:', error);
    }
  } catch (error) {
    console.error('[Rate Limiter] Error recording usage:', error);
  }
}

/**
 * Get usage statistics for a user.
 * Useful for displaying remaining quota in the UI.
 *
 * @param userId - User's UUID
 * @returns Current usage statistics
 */
export async function getUsageStatistics(userId: string): Promise<{
  today: number;
  thisMonth: number;
  limits: ReturnType<typeof getRateLimitsFromEnv>;
}> {
  const limits = getRateLimitsFromEnv();

  try {
    // Get Supabase client
    // Note: web_search_usage table may not be in generated types yet
    const supabase = await createClient();
    const todayStart = getTodayStart();
    const monthStart = getMonthStart();

    // Get today's usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: todayCount } = await (supabase as any)
      .from('web_search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart);

    // Get this month's usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: monthCount } = await (supabase as any)
      .from('web_search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart);

    return {
      today: todayCount || 0,
      thisMonth: monthCount || 0,
      limits,
    };
  } catch (error) {
    console.error('[Rate Limiter] Error getting usage statistics:', error);
    return {
      today: 0,
      thisMonth: 0,
      limits,
    };
  }
}

/**
 * Check if web search feature is enabled.
 * Convenience function for UI conditional rendering.
 */
export function isWebSearchEnabled(): boolean {
  const config = validateWebSearchConfig();
  return config !== null && config.enabled;
}

/**
 * Get rate limit configuration.
 * Useful for displaying limits in the UI.
 */
export function getRateLimits() {
  return getRateLimitsFromEnv();
}
