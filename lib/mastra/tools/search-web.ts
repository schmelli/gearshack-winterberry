/**
 * Search Web Tool - Mastra Format
 * Feature: 001-mastra-agentic-voice (T018)
 *
 * Migrated from lib/ai-assistant/tools/search-web.ts to Mastra tool format.
 * Enables the Mastra agent to search the web for current information about gear,
 * trail conditions, reviews, and outdoor news.
 *
 * Preserves all existing business logic - only adapted to Mastra tool format.
 * Delegates to the existing web-search-service for actual search operations.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  searchWeb,
  type WebSearchType,
  type SearchFreshness,
  type WebSearchResult,
} from '@/lib/ai-assistant/web-search-service';

// =============================================================================
// Input Schema (Zod)
// =============================================================================

/**
 * Input schema for the search web tool.
 * Validates and describes the parameters for web search operations.
 */
const searchWebInputSchema = z.object({
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

// =============================================================================
// Output Schema (Zod)
// =============================================================================

/**
 * Schema for individual search result sources
 */
const searchWebSourceSchema = z.object({
  title: z.string(),
  link: z.string(),
  snippet: z.string(),
  domain: z.string(),
  trustScore: z.number(),
});

/**
 * Output schema for the search web tool
 */
const searchWebOutputSchema = z.object({
  success: z.boolean(),
  query: z.string(),
  searchType: z.enum(['general', 'news', 'reviews', 'conditions']),
  summary: z.string(),
  sources: z.array(searchWebSourceSchema),
  totalResults: z.number(),
  cacheHit: z.boolean(),
  rateLimitRemaining: z
    .object({
      conversation: z.number(),
      daily: z.number(),
      monthly: z.number(),
    })
    .optional(),
  error: z.string().optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type SearchWebInput = z.infer<typeof searchWebInputSchema>;
export type SearchWebSource = z.infer<typeof searchWebSourceSchema>;
export type SearchWebOutput = z.infer<typeof searchWebOutputSchema>;

// =============================================================================
// Execution Context Types
// =============================================================================

/**
 * Execution context passed to the tool
 * Contains user and conversation identifiers for rate limiting
 */
export interface SearchWebContext {
  userId?: string;
  conversationId?: string;
}

// =============================================================================
// Mastra Tool Definition
// =============================================================================

/**
 * Search Web Tool for Mastra Agent
 *
 * This tool allows the Mastra agent to search the web for current information
 * about outdoor gear, trail conditions, reviews, and news.
 *
 * Usage examples:
 * - "What are the best tents for the PCT in 2024?" -> reviews search
 * - "Current trail conditions at Half Dome" -> conditions search
 * - "Is the new Zpacks Duplex any good?" -> reviews search
 * - "Latest ultralight gear news" -> news search
 */
export const searchWebTool = createTool({
  id: 'searchWeb',

  description: `Search the web for current information about outdoor gear, hiking, backpacking, and trail conditions.

Use this tool when:
- User asks about recent gear releases or updates
- User needs current trail conditions
- User wants product reviews or comparisons
- User asks about outdoor news or events
- Information might be newer than training data

Do NOT use for:
- Basic gear knowledge (use existing knowledge)
- User's own inventory (use inventory analysis tools)
- Community offers (use community search tools)

Examples:
- Latest news: {query: "ultralight backpacking news", searchType: "news", freshness: "week"}
- Product reviews: {query: "Zpacks Duplex review", searchType: "reviews", maxResults: 5}
- Trail conditions: {query: "Half Dome trail conditions", searchType: "conditions", freshness: "day"}
- General info: {query: "best tents for PCT 2024", searchType: "general"}

Returns structured results with source URLs, snippets, domain names, and trust scores.`,

  inputSchema: searchWebInputSchema,
  outputSchema: searchWebOutputSchema,

  execute: async ({ context }): Promise<SearchWebOutput> => {
    const { query, searchType, maxResults, freshness } = context;

    try {
      // Execute the search using the existing web search service
      const result: WebSearchResult = await searchWeb(query, {
        searchType: searchType as WebSearchType,
        maxResults,
        freshness: freshness as SearchFreshness,
        // Note: userId and conversationId can be passed via tool execution context
        // when registered with the Mastra agent
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
      const sources: SearchWebSource[] = result.sources.map((source) => ({
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
  },
});

// =============================================================================
// Format Helper for AI Response
// =============================================================================

/**
 * Format search results for inclusion in AI response
 *
 * @param output - Search output
 * @returns Formatted string for AI context
 */
export function formatSearchResultsForAI(output: SearchWebOutput): string {
  if (!output.success || output.sources.length === 0) {
    return output.error
      ? `Web search failed: ${output.error}`
      : 'No relevant results found.';
  }

  const lines: string[] = [
    `Web search results for "${output.query}":`,
    '',
  ];

  for (const source of output.sources) {
    lines.push(`[${source.domain}] ${source.title}`);
    lines.push(`  ${source.snippet}`);
    lines.push(`  Source: ${source.link}`);
    lines.push('');
  }

  if (output.cacheHit) {
    lines.push('(Results from cache)');
  }

  return lines.join('\n');
}

// =============================================================================
// Standalone Execute Function (for non-Mastra usage)
// =============================================================================

/**
 * Execute web search directly without Mastra tool wrapper
 *
 * Useful for calling from other parts of the application that don't use
 * the Mastra agent but need web search functionality.
 *
 * @param input - Validated search input parameters
 * @param context - Optional execution context with user/conversation info
 * @returns SearchWebOutput with results and metadata
 */
export async function executeSearchWeb(
  input: SearchWebInput,
  context?: SearchWebContext
): Promise<SearchWebOutput> {
  const { query, searchType, maxResults, freshness } = input;

  try {
    const result: WebSearchResult = await searchWeb(query, {
      searchType: searchType as WebSearchType,
      maxResults,
      freshness: freshness as SearchFreshness,
      userId: context?.userId,
      conversationId: context?.conversationId,
    });

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

    const sources: SearchWebSource[] = result.sources.map((source) => ({
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
// Re-export Input Schema for External Use
// =============================================================================

/**
 * Export the input schema for use in Mastra agent registration
 * or for external validation
 */
export { searchWebInputSchema, searchWebOutputSchema };
