/**
 * GearGraph MCP Tool Wrappers for Mastra Agent
 * Feature: 001-mastra-agentic-voice (T058)
 *
 * Wraps GearGraph MCP tools for registration with the Mastra agent.
 * Provides typed interfaces for findAlternatives, searchGear, and queryGearGraph
 * with 5-second timeout and fallback error handling.
 *
 * These tools enable the AI to query the GearGraph for:
 * - Finding gear alternatives based on weight, price, or category
 * - Searching the gear catalog with filters
 * - Direct Cypher graph queries for complex traversals
 */

import { z } from 'zod';
import { mcpClient } from '@/lib/mastra/mcp-client';
import type { MCPToolResult } from '@/types/mastra';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default timeout for MCP tool calls (5 seconds)
 */
const MCP_TOOL_TIMEOUT_MS = 5000;

/**
 * Fallback messages when MCP is unavailable
 */
const FALLBACK_MESSAGES = {
  findAlternatives:
    'Unable to search for alternatives. The GearGraph service is temporarily unavailable. Please try again later or use the catalog search instead.',
  searchGear:
    'Unable to search gear. The GearGraph service is temporarily unavailable. Please try again later or use the standard search.',
  queryGearGraph:
    'Unable to query the gear graph. The service is temporarily unavailable. Please try a simpler query or contact support.',
};

// =============================================================================
// Tool Input Schemas (Zod)
// =============================================================================

/**
 * Input schema for findAlternatives tool
 */
export const findAlternativesInputSchema = z.object({
  itemId: z
    .string()
    .uuid()
    .describe('UUID of the gear item to find alternatives for'),
  criteria: z
    .enum(['lighter', 'cheaper', 'similar', 'higher-rated'])
    .optional()
    .default('similar')
    .describe(
      'Criteria for finding alternatives: "lighter" for weight, "cheaper" for price, "similar" for same category, "higher-rated" for better reviews'
    ),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe('Maximum number of alternatives to return (1-10)'),
});

export type FindAlternativesInput = z.infer<typeof findAlternativesInputSchema>;

/**
 * Input schema for searchGear tool
 */
export const searchGearInputSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(200)
    .describe('Search query for gear items (e.g., "ultralight tent", "2-person shelter")'),
  filters: z
    .object({
      category: z
        .string()
        .optional()
        .describe('Category slug to filter by (e.g., "tents", "sleeping-bags")'),
      brand: z
        .string()
        .optional()
        .describe('Brand name to filter by'),
      maxWeight: z
        .number()
        .positive()
        .optional()
        .describe('Maximum weight in grams'),
      maxPrice: z
        .number()
        .positive()
        .optional()
        .describe('Maximum price in user\'s currency'),
      minRating: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('Minimum rating (1-5 stars)'),
    })
    .optional()
    .describe('Optional filters to narrow search results'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(10)
    .describe('Maximum number of results to return (1-20)'),
});

export type SearchGearInput = z.infer<typeof searchGearInputSchema>;

/**
 * Input schema for queryGearGraph tool
 */
export const queryGearGraphInputSchema = z.object({
  cypherQuery: z
    .string()
    .min(10)
    .max(1000)
    .describe(
      'Cypher query to execute on the GearGraph. Must be a read-only query (no CREATE, DELETE, SET, MERGE, etc.)'
    ),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Optional parameters for parameterized Cypher queries'),
});

export type QueryGearGraphInput = z.infer<typeof queryGearGraphInputSchema>;

// =============================================================================
// Tool Output Types
// =============================================================================

/**
 * Gear alternative result
 */
export interface GearAlternative {
  id: string;
  name: string;
  brand: string;
  category: string;
  weightGrams: number | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  rating: number | null;
  reviewCount: number;
  imageUrl: string | null;
  reason: string; // e.g., "34% lighter", "Top 10% in category"
}

/**
 * Output for findAlternatives tool
 */
export interface FindAlternativesOutput {
  success: boolean;
  itemId: string;
  itemName: string;
  criteria: string;
  alternatives: GearAlternative[];
  totalFound: number;
  error?: string;
}

/**
 * Gear search result item
 */
export interface GearSearchResult {
  id: string;
  name: string;
  brand: string;
  category: string;
  weightGrams: number | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  rating: number | null;
  reviewCount: number;
  imageUrl: string | null;
  matchScore: number; // 0-100 relevance score
}

/**
 * Output for searchGear tool
 */
export interface SearchGearOutput {
  success: boolean;
  query: string;
  filters: Record<string, unknown>;
  results: GearSearchResult[];
  totalFound: number;
  error?: string;
}

/**
 * Output for queryGearGraph tool
 */
export interface QueryGearGraphOutput {
  success: boolean;
  query: string;
  results: unknown[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

// =============================================================================
// Execute Functions
// =============================================================================

/**
 * Execute findAlternatives via MCP
 *
 * Finds gear alternatives for a given item based on specified criteria.
 * Uses the GearGraph to find similar items, lighter alternatives, or cheaper options.
 *
 * @param input - Validated input parameters
 * @returns FindAlternativesOutput with alternatives or error
 */
export async function executeFindAlternatives(
  input: FindAlternativesInput
): Promise<FindAlternativesOutput> {
  const { itemId, criteria, maxResults } = input;

  const result: MCPToolResult = await mcpClient.callTool(
    'findAlternatives',
    {
      itemId,
      criteria,
      maxResults,
    },
    MCP_TOOL_TIMEOUT_MS
  );

  // Handle MCP errors
  if (result.error) {
    console.error('[findAlternatives] MCP error:', result.error);
    return {
      success: false,
      itemId,
      itemName: '',
      criteria: criteria ?? 'similar',
      alternatives: [],
      totalFound: 0,
      error: result.error.includes('timeout')
        ? FALLBACK_MESSAGES.findAlternatives
        : result.error,
    };
  }

  // Parse and validate result
  const data = result.result as Record<string, unknown> | null;
  if (!data) {
    return {
      success: false,
      itemId,
      itemName: '',
      criteria: criteria ?? 'similar',
      alternatives: [],
      totalFound: 0,
      error: 'No data returned from GearGraph',
    };
  }

  // Transform MCP response to typed output
  const alternatives: GearAlternative[] = Array.isArray(data.alternatives)
    ? data.alternatives.map((alt: Record<string, unknown>) => ({
        id: String(alt.id ?? ''),
        name: String(alt.name ?? ''),
        brand: String(alt.brand ?? ''),
        category: String(alt.category ?? ''),
        weightGrams: typeof alt.weightGrams === 'number' ? alt.weightGrams : null,
        priceAmount: typeof alt.priceAmount === 'number' ? alt.priceAmount : null,
        priceCurrency: typeof alt.priceCurrency === 'string' ? alt.priceCurrency : null,
        rating: typeof alt.rating === 'number' ? alt.rating : null,
        reviewCount: typeof alt.reviewCount === 'number' ? alt.reviewCount : 0,
        imageUrl: typeof alt.imageUrl === 'string' ? alt.imageUrl : null,
        reason: String(alt.reason ?? 'Similar item'),
      }))
    : [];

  return {
    success: true,
    itemId,
    itemName: String(data.itemName ?? ''),
    criteria: criteria ?? 'similar',
    alternatives,
    totalFound: typeof data.totalFound === 'number' ? data.totalFound : alternatives.length,
  };
}

/**
 * Execute searchGear via MCP
 *
 * Searches the gear catalog using the GearGraph for enhanced results.
 * Supports filtering by category, brand, weight, price, and rating.
 *
 * @param input - Validated input parameters
 * @returns SearchGearOutput with results or error
 */
export async function executeSearchGear(
  input: SearchGearInput
): Promise<SearchGearOutput> {
  const { query, filters, maxResults } = input;

  const result: MCPToolResult = await mcpClient.callTool(
    'searchGear',
    {
      query,
      filters: filters ?? {},
      maxResults,
    },
    MCP_TOOL_TIMEOUT_MS
  );

  // Handle MCP errors
  if (result.error) {
    console.error('[searchGear] MCP error:', result.error);
    return {
      success: false,
      query,
      filters: filters ?? {},
      results: [],
      totalFound: 0,
      error: result.error.includes('timeout')
        ? FALLBACK_MESSAGES.searchGear
        : result.error,
    };
  }

  // Parse and validate result
  const data = result.result as Record<string, unknown> | null;
  if (!data) {
    return {
      success: false,
      query,
      filters: filters ?? {},
      results: [],
      totalFound: 0,
      error: 'No data returned from GearGraph',
    };
  }

  // Transform MCP response to typed output
  const results: GearSearchResult[] = Array.isArray(data.results)
    ? data.results.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        brand: String(item.brand ?? ''),
        category: String(item.category ?? ''),
        weightGrams: typeof item.weightGrams === 'number' ? item.weightGrams : null,
        priceAmount: typeof item.priceAmount === 'number' ? item.priceAmount : null,
        priceCurrency: typeof item.priceCurrency === 'string' ? item.priceCurrency : null,
        rating: typeof item.rating === 'number' ? item.rating : null,
        reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : 0,
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : null,
        matchScore: typeof item.matchScore === 'number' ? item.matchScore : 0,
      }))
    : [];

  return {
    success: true,
    query,
    filters: filters ?? {},
    results,
    totalFound: typeof data.totalFound === 'number' ? data.totalFound : results.length,
  };
}

/**
 * Execute queryGearGraph via MCP
 *
 * Executes a direct Cypher query on the GearGraph for complex traversals.
 * Only read-only queries are allowed for safety.
 *
 * @param input - Validated input parameters
 * @returns QueryGearGraphOutput with results or error
 */
export async function executeQueryGearGraph(
  input: QueryGearGraphInput
): Promise<QueryGearGraphOutput> {
  const { cypherQuery, parameters } = input;

  // Basic read-only validation (server-side validation is authoritative)
  const forbiddenKeywords = ['CREATE', 'DELETE', 'SET', 'MERGE', 'REMOVE', 'DROP'];
  const upperQuery = cypherQuery.toUpperCase();
  for (const keyword of forbiddenKeywords) {
    if (upperQuery.includes(keyword)) {
      return {
        success: false,
        query: cypherQuery,
        results: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: `Query contains forbidden keyword: ${keyword}. Only read-only queries are allowed.`,
      };
    }
  }

  const result: MCPToolResult = await mcpClient.callTool(
    'queryGearGraph',
    {
      cypherQuery,
      parameters: parameters ?? {},
    },
    MCP_TOOL_TIMEOUT_MS
  );

  // Handle MCP errors
  if (result.error) {
    console.error('[queryGearGraph] MCP error:', result.error);
    return {
      success: false,
      query: cypherQuery,
      results: [],
      rowCount: 0,
      executionTimeMs: result.latencyMs,
      error: result.error.includes('timeout')
        ? FALLBACK_MESSAGES.queryGearGraph
        : result.error,
    };
  }

  // Parse and validate result
  const data = result.result as Record<string, unknown> | null;
  if (!data) {
    return {
      success: false,
      query: cypherQuery,
      results: [],
      rowCount: 0,
      executionTimeMs: result.latencyMs,
      error: 'No data returned from GearGraph',
    };
  }

  const results = Array.isArray(data.results) ? data.results : [];

  return {
    success: true,
    query: cypherQuery,
    results,
    rowCount: results.length,
    executionTimeMs: typeof data.executionTimeMs === 'number' ? data.executionTimeMs : result.latencyMs,
  };
}

// =============================================================================
// Format Helpers for AI Response
// =============================================================================

/**
 * Format findAlternatives results for AI response
 */
export function formatAlternativesForAI(output: FindAlternativesOutput): string {
  if (!output.success || output.alternatives.length === 0) {
    return output.error || 'No alternatives found for this item.';
  }

  const lines: string[] = [
    `Alternatives for "${output.itemName}" (criteria: ${output.criteria}):`,
    '',
  ];

  for (const alt of output.alternatives) {
    const details: string[] = [];
    if (alt.weightGrams) details.push(`${alt.weightGrams}g`);
    if (alt.priceAmount && alt.priceCurrency) {
      details.push(`${alt.priceCurrency}${alt.priceAmount}`);
    }
    if (alt.rating) details.push(`${alt.rating}/5 stars`);

    lines.push(`- ${alt.brand} ${alt.name}`);
    if (details.length > 0) {
      lines.push(`  ${details.join(' | ')}`);
    }
    lines.push(`  Reason: ${alt.reason}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format searchGear results for AI response
 */
export function formatSearchResultsForAI(output: SearchGearOutput): string {
  if (!output.success || output.results.length === 0) {
    return output.error || 'No gear found matching your search.';
  }

  const lines: string[] = [
    `Search results for "${output.query}" (${output.totalFound} total):`,
    '',
  ];

  for (const item of output.results) {
    const details: string[] = [];
    if (item.weightGrams) details.push(`${item.weightGrams}g`);
    if (item.priceAmount && item.priceCurrency) {
      details.push(`${item.priceCurrency}${item.priceAmount}`);
    }
    if (item.rating) details.push(`${item.rating}/5`);

    lines.push(`- ${item.brand} ${item.name} (${item.category})`);
    if (details.length > 0) {
      lines.push(`  ${details.join(' | ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// =============================================================================
// Mastra Tool Definitions
// =============================================================================

/**
 * Find Alternatives Tool for Mastra Agent
 *
 * Finds gear alternatives based on a reference item from the user's inventory
 * or the catalog. Uses the GearGraph to find similar, lighter, cheaper, or
 * higher-rated alternatives.
 */
export const findAlternativesTool = {
  id: 'findAlternatives',
  description: `Find gear alternatives for a specific item using the GearGraph.

Use this tool when:
- User asks "What's a lighter alternative to my [gear item]?"
- User wants cheaper options for existing gear
- User asks for similar items or upgrades
- User wants higher-rated alternatives

Returns alternatives with weight, price, rating, and reasoning for each suggestion.
Falls back gracefully if the GearGraph is unavailable.`,
  parameters: findAlternativesInputSchema,

  execute: async (
    params: FindAlternativesInput
  ): Promise<FindAlternativesOutput> => {
    return executeFindAlternatives(params);
  },
};

/**
 * Search Gear Tool for Mastra Agent
 *
 * Searches the gear catalog using the GearGraph for enhanced results
 * with filtering and relevance scoring.
 */
export const searchGearTool = {
  id: 'searchGear',
  description: `Search the gear catalog using the GearGraph for enhanced results.

Use this tool when:
- User searches for gear by name, type, or description
- User wants filtered results (by category, brand, weight, price, rating)
- User asks "What tents are under 1kg?" or similar queries

Returns ranked results with relevance scores and full product details.
Supports filtering by category, brand, maxWeight, maxPrice, and minRating.`,
  parameters: searchGearInputSchema,

  execute: async (params: SearchGearInput): Promise<SearchGearOutput> => {
    return executeSearchGear(params);
  },
};

/**
 * Query GearGraph Tool for Mastra Agent
 *
 * Executes direct Cypher queries on the GearGraph for complex
 * graph traversals that can't be expressed with the simpler tools.
 */
export const queryGearGraphTool = {
  id: 'queryGearGraph',
  description: `Execute direct Cypher queries on the GearGraph for complex traversals.

Use this tool when:
- User needs complex graph relationships (e.g., "Find tents used by hikers with my sleeping bag")
- Simpler tools (findAlternatives, searchGear) can't express the query
- User explicitly asks for graph-based insights

Only read-only queries are allowed (no CREATE, DELETE, SET, MERGE, etc.).
Returns raw query results - format them appropriately for the user.

Example queries:
- MATCH (g:Gear)-[:SIMILAR_TO]->(alt:Gear) WHERE g.id = $itemId RETURN alt LIMIT 5
- MATCH (u:User)-[:OWNS]->(t:Gear {category: 'tent'})<-[:PAIRS_WITH]-(s:Gear {category: 'sleeping-bag'}) RETURN t, s`,
  parameters: queryGearGraphInputSchema,

  execute: async (
    params: QueryGearGraphInput
  ): Promise<QueryGearGraphOutput> => {
    return executeQueryGearGraph(params);
  },
};

// =============================================================================
// Tool Collection Export
// =============================================================================

/**
 * All MCP graph tools for Mastra agent registration
 */
export const mcpGraphTools = {
  findAlternatives: findAlternativesTool,
  searchGear: searchGearTool,
  queryGearGraph: queryGearGraphTool,
};

/**
 * Array of all MCP graph tools for bulk registration
 */
export const mcpGraphToolsArray = [
  findAlternativesTool,
  searchGearTool,
  queryGearGraphTool,
];

// =============================================================================
// Type Exports
// =============================================================================

export type FindAlternativesTool = typeof findAlternativesTool;
export type SearchGearTool = typeof searchGearTool;
export type QueryGearGraphTool = typeof queryGearGraphTool;
