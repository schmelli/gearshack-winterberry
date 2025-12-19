/**
 * Web Search Service
 * Feature 050: AI Assistant - Phase 2B Web Search Integration
 *
 * Core web search functionality using Serper API.
 * Implements caching, domain filtering, and result processing.
 */

import { createClient } from '@/lib/supabase/server';
import { generateCacheKey } from '@/lib/supabase/cache';
import type { Json } from '@/types/database';
import {
  filterAndScoreResults,
  type ScoredSearchResult,
  type SearchResultWithDomain,
} from './domain-trust';
import {
  checkWebSearchLimit,
  recordWebSearchUsage,
  type RateLimitResult,
} from './rate-limiter';

// =============================================================================
// Types
// =============================================================================

/**
 * Search type determines query context and caching strategy
 */
export type WebSearchType = 'general' | 'news' | 'reviews' | 'conditions';

/**
 * Freshness filter for search results
 */
export type SearchFreshness = 'day' | 'week' | 'month' | 'any';

/**
 * Search options
 */
export interface WebSearchOptions {
  searchType?: WebSearchType;
  maxResults?: number;
  freshness?: SearchFreshness;
  userId?: string;
  conversationId?: string;
}

/**
 * Web search result
 */
export interface WebSearchResult {
  summary: string;
  sources: ScoredSearchResult[];
  totalResults: number;
  cacheHit: boolean;
  rateLimitStatus?: RateLimitResult;
  error?: string;
}

/**
 * Serper API response type
 */
interface SerperSearchResponse {
  searchParameters: {
    q: string;
    type: string;
    num: number;
  };
  organic?: Array<{
    title: string;
    link: string;
    snippet: string;
    domain?: string;
    position: number;
    date?: string;
  }>;
  news?: Array<{
    title: string;
    link: string;
    snippet: string;
    source: string;
    date: string;
  }>;
  knowledgeGraph?: {
    title: string;
    description: string;
  };
}

// =============================================================================
// Configuration
// =============================================================================

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_API_URL = 'https://google.serper.dev/search';
const WEB_SEARCH_ENABLED = process.env.WEB_SEARCH_ENABLED === 'true';

/**
 * Cache TTL configuration (in days)
 */
const CACHE_TTL: Record<WebSearchType, number> = {
  reviews: 7,        // Reviews are stable
  general: 3,        // General info changes moderately
  conditions: 0.25,  // Trail conditions: 6 hours
  news: 0.083,       // News: 2 hours
};

/**
 * Map freshness to Serper tbs parameter
 */
const FRESHNESS_MAP: Record<SearchFreshness, string | undefined> = {
  day: 'qdr:d',
  week: 'qdr:w',
  month: 'qdr:m',
  any: undefined,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate cache key for web search
 */
async function generateSearchCacheKey(
  query: string,
  searchType: WebSearchType,
  freshness: SearchFreshness
): Promise<string> {
  const input = `web_search|${searchType}|${freshness}|${query.toLowerCase().trim()}`;
  return generateCacheKey(input);
}

/**
 * Get cached search result
 */
async function getCachedResult(
  cacheKey: string
): Promise<{ data: WebSearchResult; expiresAt: string } | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('api_cache')
      .select('response_data, expires_at')
      .eq('service', 'web_search')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      data: data.response_data as unknown as WebSearchResult,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error('[Web Search] Cache lookup error:', error);
    return null;
  }
}

/**
 * Store search result in cache
 */
async function setCacheResult(
  cacheKey: string,
  result: WebSearchResult,
  ttlDays: number
): Promise<void> {
  try {
    const supabase = await createClient();

    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    await supabase.from('api_cache').upsert(
      {
        service: 'web_search',
        cache_key: cacheKey,
        response_data: result as unknown as Json,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'service,cache_key' }
    );
  } catch (error) {
    console.error('[Web Search] Cache store error:', error);
  }
}

/**
 * Add outdoor gear context to query
 */
function enhanceQuery(query: string, searchType: WebSearchType): string {
  const trimmed = query.trim();

  switch (searchType) {
    case 'reviews':
      // Add review context for gear
      if (!trimmed.toLowerCase().includes('review')) {
        return `${trimmed} review outdoor gear`;
      }
      return trimmed;

    case 'conditions':
      // Add trail conditions context
      if (!trimmed.toLowerCase().includes('conditions')) {
        return `${trimmed} trail conditions current`;
      }
      return trimmed;

    case 'news':
      // News about outdoor gear or trails
      return `${trimmed} outdoor news`;

    default:
      // General query - add outdoor context if not present
      if (!trimmed.toLowerCase().includes('outdoor') &&
          !trimmed.toLowerCase().includes('hiking') &&
          !trimmed.toLowerCase().includes('backpacking')) {
        return `${trimmed} outdoor gear`;
      }
      return trimmed;
  }
}

/**
 * Extract query terms for relevance scoring
 */
function extractQueryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);
}

/**
 * Generate a summary from search results
 */
function generateSummary(
  query: string,
  results: ScoredSearchResult[],
  searchType: WebSearchType
): string {
  if (results.length === 0) {
    return `No results found for "${query}".`;
  }

  const topResults = results.slice(0, 3);
  const sources = topResults
    .map((r) => r.domain || 'unknown source')
    .join(', ');

  switch (searchType) {
    case 'reviews':
      return `Found ${results.length} reviews for "${query}" from ${sources}.`;
    case 'conditions':
      return `Found ${results.length} trail condition reports for "${query}" from ${sources}.`;
    case 'news':
      return `Found ${results.length} recent news articles about "${query}" from ${sources}.`;
    default:
      return `Found ${results.length} results for "${query}" from ${sources}.`;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Search the web using Serper API.
 *
 * @param query - Search query
 * @param options - Search options
 * @returns Search results with sources and summary
 */
export async function searchWeb(
  query: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResult> {
  const {
    searchType = 'general',
    maxResults = 3,
    freshness = 'any',
    userId,
    conversationId,
  } = options;

  // Check if feature is enabled
  if (!WEB_SEARCH_ENABLED) {
    return {
      summary: 'Web search is not enabled.',
      sources: [],
      totalResults: 0,
      cacheHit: false,
      error: 'WEB_SEARCH_ENABLED is not set to true',
    };
  }

  // Validate API key
  if (!SERPER_API_KEY) {
    console.error('[Web Search] SERPER_API_KEY not configured');
    return {
      summary: 'Web search is temporarily unavailable.',
      sources: [],
      totalResults: 0,
      cacheHit: false,
      error: 'API key not configured',
    };
  }

  // Check rate limits (if user ID provided)
  let rateLimitStatus: RateLimitResult | undefined;
  if (userId) {
    rateLimitStatus = await checkWebSearchLimit(userId, conversationId);
    if (!rateLimitStatus.allowed) {
      return {
        summary: rateLimitStatus.reason || 'Rate limit exceeded.',
        sources: [],
        totalResults: 0,
        cacheHit: false,
        rateLimitStatus,
        error: 'rate_limit_exceeded',
      };
    }
  }

  // Generate cache key
  const cacheKey = await generateSearchCacheKey(query, searchType, freshness);

  // Check cache first
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    console.log('[Web Search] Cache hit for query:', query);
    return {
      ...cached.data,
      cacheHit: true,
      rateLimitStatus,
    };
  }

  // Enhance query with context
  const enhancedQuery = enhanceQuery(query, searchType);
  const queryTerms = extractQueryTerms(query);

  try {
    // Build request body
    const requestBody: Record<string, unknown> = {
      q: enhancedQuery,
      num: Math.min(maxResults * 2, 10), // Fetch extra for filtering
    };

    // Add freshness filter if specified
    if (freshness !== 'any' && FRESHNESS_MAP[freshness]) {
      requestBody.tbs = FRESHNESS_MAP[freshness];
    }

    // Use news endpoint for news type
    const endpoint = searchType === 'news'
      ? 'https://google.serper.dev/news'
      : SERPER_API_URL;

    // Call Serper API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('[Web Search] API error:', response.status, response.statusText);
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data: SerperSearchResponse = await response.json();

    // Extract results based on search type
    let rawResults: SearchResultWithDomain[] = [];

    if (searchType === 'news' && data.news) {
      rawResults = data.news.map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        domain: item.source,
      }));
    } else if (data.organic) {
      rawResults = data.organic.map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        domain: item.domain,
      }));
    }

    // Filter and score results
    const scoredResults = filterAndScoreResults(rawResults, queryTerms);
    const topResults = scoredResults.slice(0, maxResults);

    // Generate summary
    const summary = generateSummary(query, topResults, searchType);

    const result: WebSearchResult = {
      summary,
      sources: topResults,
      totalResults: scoredResults.length,
      cacheHit: false,
      rateLimitStatus,
    };

    // Cache the result
    const ttl = CACHE_TTL[searchType];
    await setCacheResult(cacheKey, result, ttl);

    // Record usage (for non-cached results only)
    if (userId) {
      await recordWebSearchUsage({
        userId,
        conversationId: conversationId || null,
        query,
        searchType,
        resultCount: topResults.length,
        cacheHit: false,
        createdAt: new Date().toISOString(),
      });
    }

    console.log(
      `[Web Search] Query: "${query}" | Type: ${searchType} | Results: ${topResults.length}`
    );

    return result;
  } catch (error) {
    console.error('[Web Search] Error:', error);

    // Try to return cached result even if expired
    const expiredCache = await getCachedResult(cacheKey);
    if (expiredCache) {
      console.log('[Web Search] Returning expired cache due to API error');
      return {
        ...expiredCache.data,
        cacheHit: true,
        rateLimitStatus,
        error: 'API error, returning cached result',
      };
    }

    return {
      summary: 'Web search is temporarily unavailable. Please try again later.',
      sources: [],
      totalResults: 0,
      cacheHit: false,
      rateLimitStatus,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if web search is available.
 * Convenience function for UI conditional rendering.
 */
export function isWebSearchAvailable(): boolean {
  return WEB_SEARCH_ENABLED && Boolean(SERPER_API_KEY);
}
