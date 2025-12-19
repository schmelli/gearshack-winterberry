/**
 * Web Search Rate Limiter
 * Feature 050: AI Assistant - Phase 2B Web Search Integration
 *
 * Enforces usage quotas for web search to prevent cost overruns.
 * Implements per-conversation, daily, and monthly limits.
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type assertion helper for web_search_usage table
// This table is defined in migration 20251220000003_web_search_usage.sql
// but may not be in the generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebSearchUsageClient = SupabaseClient<any>;

// =============================================================================
// Types
// =============================================================================

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
 * Rate limit configuration
 * These can be overridden via environment variables
 */
const RATE_LIMITS = {
  perConversation: parseInt(process.env.WEB_SEARCH_CONVERSATION_LIMIT || '2', 10),
  perDay: parseInt(process.env.WEB_SEARCH_DAILY_LIMIT || '10', 10),
  perMonth: parseInt(process.env.WEB_SEARCH_MONTHLY_LIMIT || '100', 10),
};

/**
 * Check if web search is enabled
 */
const WEB_SEARCH_ENABLED = process.env.WEB_SEARCH_ENABLED === 'true';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the start of today in ISO format
 */
function getTodayStart(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/**
 * Get the end of today in ISO format
 */
function getTodayEnd(): string {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

/**
 * Get the start of this month in ISO format
 */
function getMonthStart(): string {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/**
 * Get the end of this month in ISO format
 */
function getMonthEnd(): string {
  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  now.setDate(0); // Last day of current month
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if a user can perform a web search.
 * Enforces rate limits at conversation, daily, and monthly levels.
 *
 * @param userId - User's UUID
 * @param conversationId - Current conversation UUID (optional)
 * @returns Rate limit check result with remaining quotas
 */
export async function checkWebSearchLimit(
  userId: string,
  conversationId?: string | null
): Promise<RateLimitResult> {
  // Check if web search is enabled
  if (!WEB_SEARCH_ENABLED) {
    return {
      allowed: false,
      remaining: { conversation: 0, daily: 0, monthly: 0 },
      resetAt: { daily: getTodayEnd(), monthly: getMonthEnd() },
      reason: 'Web search is not enabled',
    };
  }

  try {
    // Cast to any-typed client for web_search_usage table access
    // Table exists via migration but types may not be regenerated yet
    const supabase = (await createClient()) as WebSearchUsageClient;
    const todayStart = getTodayStart();
    const monthStart = getMonthStart();

    // Count usage for this conversation (if provided)
    let conversationCount = 0;
    if (conversationId) {
      const { count: convCount, error: convError } = await supabase
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
    const { count: dailyCount, error: dailyError } = await supabase
      .from('web_search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart);

    if (dailyError) {
      console.error('[Rate Limiter] Error checking daily usage:', dailyError);
    }

    // Count this month's usage
    const { count: monthlyCount, error: monthlyError } = await supabase
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
    return {
      allowed: true,
      remaining: {
        conversation: RATE_LIMITS.perConversation,
        daily: RATE_LIMITS.perDay,
        monthly: RATE_LIMITS.perMonth,
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
    // Cast to any-typed client for web_search_usage table access
    const supabase = (await createClient()) as WebSearchUsageClient;

    const { error } = await supabase.from('web_search_usage').insert({
      user_id: usage.userId,
      conversation_id: usage.conversationId,
      search_query: usage.query,
      search_type: usage.searchType,
      results_count: usage.resultCount,
      cached: usage.cacheHit,
      cost_usd: 0.0003, // ~$0.0003 per Serper API call
      created_at: usage.createdAt || new Date().toISOString(),
    });

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
  limits: typeof RATE_LIMITS;
}> {
  try {
    // Cast to any-typed client for web_search_usage table access
    const supabase = (await createClient()) as WebSearchUsageClient;
    const todayStart = getTodayStart();
    const monthStart = getMonthStart();

    // Get today's usage
    const { count: todayCount } = await supabase
      .from('web_search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart);

    // Get this month's usage
    const { count: monthCount } = await supabase
      .from('web_search_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart);

    return {
      today: todayCount || 0,
      thisMonth: monthCount || 0,
      limits: RATE_LIMITS,
    };
  } catch (error) {
    console.error('[Rate Limiter] Error getting usage statistics:', error);
    return {
      today: 0,
      thisMonth: 0,
      limits: RATE_LIMITS,
    };
  }
}

/**
 * Check if web search feature is enabled.
 * Convenience function for UI conditional rendering.
 */
export function isWebSearchEnabled(): boolean {
  return WEB_SEARCH_ENABLED;
}

/**
 * Get rate limit configuration.
 * Useful for displaying limits in the UI.
 */
export function getRateLimits(): typeof RATE_LIMITS {
  return { ...RATE_LIMITS };
}
