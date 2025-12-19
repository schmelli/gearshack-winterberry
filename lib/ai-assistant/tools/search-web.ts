/**
 * Search Web Tool
 * Feature 050: AI Assistant - Phase 2B Web Search Integration
 *
 * Vercel AI SDK tool definition for web search functionality.
 * Enables AI to search the web for current information about gear,
 * trail conditions, reviews, and outdoor news.
 */

import { z } from 'zod';
import {
  searchWeb,
  type WebSearchType,
  type SearchFreshness,
  type WebSearchResult,
} from '../web-search-service';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const searchWebParametersSchema = z.object({
  query: z
    .string()
    .min(3)
    .max(200)
    .describe('Search query - should be specific to outdoor gear, hiking, or backpacking'),
  searchType: z
    .enum(['general', 'news', 'reviews', 'conditions'])
    .default('general')
    .describe(
      'Type of search: "general" for info, "news" for recent articles, "reviews" for gear reviews, "conditions" for trail conditions'
    ),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .describe('Maximum number of results to return (1-5)'),
  freshness: z
    .enum(['day', 'week', 'month', 'any'])
    .default('any')
    .describe(
      'How recent should results be: "day" (24h), "week", "month", or "any" (no filter)'
    ),
});

export type SearchWebParameters = z.infer<typeof searchWebParametersSchema>;

// =============================================================================
// Tool Definition
// =============================================================================

/**
 * Search Web Tool for Vercel AI SDK
 *
 * This tool allows the AI to search the web for current information
 * about outdoor gear, trail conditions, reviews, and news.
 *
 * Usage examples:
 * - "What are the best tents for the PCT in 2024?" -> reviews search
 * - "Current trail conditions at Half Dome" -> conditions search
 * - "Is the new Zpacks Duplex any good?" -> reviews search
 * - "Latest ultralight gear news" -> news search
 */
export const searchWebTool = {
  description: `Search the web for current information about outdoor gear, hiking, backpacking, and trail conditions. Use this when:
- User asks about recent gear releases or updates
- User needs current trail conditions
- User wants product reviews or comparisons
- User asks about outdoor news or events
- Information might be newer than training data

Do NOT use for:
- Basic gear knowledge (use existing knowledge)
- User's own inventory (use inventory analysis tools)
- Community offers (use community search tools)`,
  parameters: searchWebParametersSchema,
};

// =============================================================================
// Response Types
// =============================================================================

export interface SearchWebResponse {
  success: boolean;
  query: string;
  searchType: WebSearchType;
  summary: string;
  sources: Array<{
    title: string;
    link: string;
    snippet: string;
    domain: string;
    trustScore: number;
  }>;
  totalResults: number;
  cacheHit: boolean;
  rateLimitRemaining?: {
    conversation: number;
    daily: number;
    monthly: number;
  };
  error?: string;
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute web search
 *
 * @param params - Search parameters
 * @param context - Execution context with user/conversation info
 * @returns SearchWebResponse with results and metadata
 */
export async function executeSearchWeb(
  params: SearchWebParameters,
  context?: {
    userId?: string;
    conversationId?: string;
  }
): Promise<SearchWebResponse> {
  const { query, searchType, maxResults, freshness } = params;

  try {
    // Execute the search
    const result: WebSearchResult = await searchWeb(query, {
      searchType: searchType as WebSearchType,
      maxResults,
      freshness: freshness as SearchFreshness,
      userId: context?.userId,
      conversationId: context?.conversationId,
    });

    // Check for errors
    if (result.error && result.sources.length === 0) {
      return {
        success: false,
        query,
        searchType: searchType as WebSearchType,
        summary: result.summary,
        sources: [],
        totalResults: 0,
        cacheHit: result.cacheHit,
        rateLimitRemaining: result.rateLimitStatus?.remaining,
        error: result.error,
      };
    }

    // Transform sources to the expected format
    const sources = result.sources.map((source) => ({
      title: source.title,
      link: source.link,
      snippet: source.snippet,
      domain: source.domain || '',
      trustScore: source.trustScore,
    }));

    return {
      success: true,
      query,
      searchType: searchType as WebSearchType,
      summary: result.summary,
      sources,
      totalResults: result.totalResults,
      cacheHit: result.cacheHit,
      rateLimitRemaining: result.rateLimitStatus?.remaining,
    };
  } catch (error) {
    console.error('[searchWeb] Unexpected error:', error);
    return {
      success: false,
      query,
      searchType: searchType as WebSearchType,
      summary: 'An unexpected error occurred while searching.',
      sources: [],
      totalResults: 0,
      cacheHit: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Format for AI Response
// =============================================================================

/**
 * Format search results for inclusion in AI response
 *
 * @param response - Search response
 * @returns Formatted string for AI context
 */
export function formatSearchResultsForAI(response: SearchWebResponse): string {
  if (!response.success || response.sources.length === 0) {
    return response.error
      ? `Web search failed: ${response.error}`
      : 'No relevant results found.';
  }

  const lines: string[] = [
    `Web search results for "${response.query}":`,
    '',
  ];

  for (const source of response.sources) {
    lines.push(`[${source.domain}] ${source.title}`);
    lines.push(`  ${source.snippet}`);
    lines.push(`  Source: ${source.link}`);
    lines.push('');
  }

  if (response.cacheHit) {
    lines.push('(Results from cache)');
  }

  return lines.join('\n');
}
