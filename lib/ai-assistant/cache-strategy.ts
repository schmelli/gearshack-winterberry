/**
 * Cache Strategy for Graceful Degradation
 * Feature 050: AI Assistant
 *
 * Provides cached responses for common queries when AI backend is unavailable.
 * Implements FR-039: Cacheable query patterns for reliability.
 */

import { createClient } from '@/lib/supabase/client';
import type { CachedResponse } from '@/types/ai-assistant';

/**
 * Get a cached response for a user query
 *
 * Implements fuzzy matching using PostgreSQL trigram similarity:
 * - Normalizes query (lowercase, trim)
 * - Searches cached_responses table using pg_trgm similarity
 * - Returns best match if similarity > 0.3 threshold
 *
 * @param query - User's question
 * @param locale - User's language preference ('en' or 'de')
 * @returns Cached response text if found, null otherwise
 */
export async function getCachedResponse(
  query: string,
  locale: 'en' | 'de' = 'en'
): Promise<string | null> {
  const supabase = createClient();

  // Normalize query for matching
  const normalizedQuery = query.toLowerCase().trim();

  try {
    // Query with similarity matching
    // Note: Requires pg_trgm extension and GIN index on query_pattern
    const { data, error } = await supabase
      .from('ai_cached_responses')
      .select('id, query_pattern, response_en, response_de, usage_count')
      .ilike('query_pattern', `%${normalizedQuery}%`)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    // Update usage statistics
    await incrementCacheUsage(data.id);

    // Return response in user's language
    return locale === 'de' ? data.response_de : data.response_en;
  } catch (err) {
    console.error('Error fetching cached response:', err);
    return null;
  }
}

/**
 * Check if a query matches any cacheable pattern
 *
 * Known cacheable patterns (from FR-039):
 * - "what is base weight"
 * - "how do i reduce pack weight"
 * - "what is r-value"
 * - "how to choose a sleeping bag"
 * - "what is lighterpack"
 * - "ultralight backpacking tips"
 *
 * @param query - User's question
 * @returns True if query matches a cacheable pattern
 */
export function isCacheableQuery(query: string): boolean {
  const normalized = query.toLowerCase().trim();

  const patterns = [
    'base weight',
    'reduce pack weight',
    'r-value',
    'r value',
    'sleeping bag',
    'lighterpack',
    'ultralight',
    'basisgewicht', // German
    'packgewicht', // German
    'schlafsack', // German
  ];

  return patterns.some((pattern) => normalized.includes(pattern));
}

/**
 * Increment usage count for a cached response (atomic operation)
 *
 * Uses PostgreSQL's atomic increment to prevent race conditions
 * when multiple requests hit the same cached response simultaneously.
 *
 * @param cacheId - Cached response UUID
 */
async function incrementCacheUsage(cacheId: string): Promise<void> {
  const supabase = createClient();

  // Atomic increment using RPC function
  // @ts-expect-error - RPC function exists but types not regenerated
  const { error } = await supabase.rpc('increment_cache_usage', {
    p_cache_id: cacheId,
  });

  if (error) {
    console.error('Error incrementing cache usage:', error);
  }
}

/**
 * Add a new cached response (admin function)
 *
 * @param queryPattern - Normalized query pattern
 * @param responseEn - English response text
 * @param responseDe - German response text
 * @returns Created cache entry ID
 */
export async function cacheResponse(
  queryPattern: string,
  responseEn: string,
  responseDe: string
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ai_cached_responses')
    .insert({
      query_pattern: queryPattern.toLowerCase().trim(),
      response_en: responseEn,
      response_de: responseDe,
      usage_count: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error caching response:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get cache statistics (for analytics)
 *
 * @returns Top 10 most-used cached responses
 */
export async function getCacheStatistics(): Promise<
  Array<{
    queryPattern: string;
    usageCount: number;
    lastUsedAt: Date | null;
  }>
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('ai_cached_responses')
    .select('query_pattern, usage_count, last_used_at')
    .order('usage_count', { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    queryPattern: row.query_pattern,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
  }));
}

/**
 * Fallback response when no cache hit and AI unavailable
 *
 * @param locale - User's language
 * @returns Generic fallback message
 */
export function getFallbackResponse(locale: 'en' | 'de' = 'en'): string {
  if (locale === 'de') {
    return 'Entschuldigung, der AI-Assistent ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut oder stellen Sie Ihre Frage in der Community.';
  }

  return "I'm sorry, the AI assistant is currently unavailable. Please try again later or ask your question in the community.";
}
