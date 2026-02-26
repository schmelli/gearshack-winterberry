/**
 * Query GearGraph Tool v2 - Simplified Interface
 * Feature: AI Assistant Simplification
 *
 * Provides a simplified Cypher query interface for the GearGraph.
 * The AI specifies a Cypher MATCH statement as a simple string.
 *
 * Security:
 * - Read-only (MATCH only, no CREATE/DELETE/MERGE)
 * - Query timeout (5 seconds)
 * - Result limit (100 rows)
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { mcpClient } from '@/lib/mastra/mcp-client';
import type { MCPToolResult } from '@/types/mastra';

// =============================================================================
// Constants
// =============================================================================

/** Maximum rows to return */
const MAX_ROWS = 100;

/** Query timeout in milliseconds */
const QUERY_TIMEOUT_MS = 5000;

/** Forbidden Cypher keywords (write operations) */
const FORBIDDEN_KEYWORDS = ['CREATE', 'DELETE', 'SET', 'MERGE', 'REMOVE', 'DROP', 'DETACH'];

// =============================================================================
// Input Schema
// =============================================================================

const queryGearGraphInputSchema = z.object({
  cypher: z
    .string()
    .min(10)
    .max(500)
    .describe(`Cypher MATCH query to execute. Must start with MATCH.
Examples:
- "MATCH (p:Product {name: 'MSR Hubba Hubba'}) RETURN p"
- "MATCH (p:Product)-[:MADE_BY]->(b:Brand {name: 'MSR'}) RETURN p.name, p.weight LIMIT 10"
- "MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {slug: 'tents'}) WHERE p.weight < 1000 RETURN p ORDER BY p.weight LIMIT 10"
- "MATCH (p1:Product)-[:LIGHTER_THAN]->(p2:Product) WHERE p1.name = 'Big Agnes Copper Spur' RETURN p2.name, p2.weight LIMIT 5"`),

  limit: z
    .number()
    .int()
    .positive()
    .max(MAX_ROWS)
    .default(50)
    .describe(`Maximum results to return (max ${MAX_ROWS}). Overrides LIMIT in query if lower.`),
});

export type QueryGearGraphInput = z.infer<typeof queryGearGraphInputSchema>;

// =============================================================================
// Output Schema
// =============================================================================

const queryGearGraphOutputSchema = z.object({
  success: z.boolean(),
  rowCount: z.number(),
  data: z.union([z.array(z.record(z.string(), z.unknown())), z.null()]),
  error: z.string().optional(),
  executionTimeMs: z.number().optional(),
});

export type QueryGearGraphOutput = z.infer<typeof queryGearGraphOutputSchema>;

// =============================================================================
// Query Validation
// =============================================================================

/**
 * Validate that the Cypher query is read-only (MATCH only)
 */
function validateCypherQuery(query: string): { valid: boolean; error?: string } {
  const upperQuery = query.toUpperCase().trim();

  // Must start with MATCH
  if (!upperQuery.startsWith('MATCH')) {
    return {
      valid: false,
      error: 'Query must start with MATCH. Only read-only queries are allowed.',
    };
  }

  // Check for forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // Use word boundary matching to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(query)) {
      return {
        valid: false,
        error: `Query contains forbidden keyword: ${keyword}. Only read-only queries are allowed.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Ensure query has a LIMIT clause
 */
function ensureLimit(query: string, maxLimit: number): string {
  const upperQuery = query.toUpperCase();

  // Check if query already has LIMIT
  const limitMatch = upperQuery.match(/\bLIMIT\s+(\d+)/);
  if (limitMatch) {
    const existingLimit = parseInt(limitMatch[1], 10);
    // If existing limit is higher than max, replace it
    if (existingLimit > maxLimit) {
      return query.replace(/\bLIMIT\s+\d+/i, `LIMIT ${maxLimit}`);
    }
    return query;
  }

  // Add LIMIT if not present
  return `${query.trim()} LIMIT ${maxLimit}`;
}

// =============================================================================
// Tool Definition
// =============================================================================

export const queryGearGraphTool = createTool({
  id: 'queryGearGraph',

  description: `Query the GearGraph for product relationships, alternatives, and insights.

## Node Types

**Product** - Gear products in the catalog
- Properties: name, weight, price, description, imageUrl

**Brand** - Manufacturers and brands
- Properties: name, country, website, founded

**Category** - Product categories
- Properties: name, slug, description

**ProductFamily** - Product lines (e.g., "MSR Hubba" series)
- Properties: name, description

**Technology** - Materials and technologies
- Properties: name, description (e.g., "Dyneema", "Cuben Fiber")

**Activity** - Outdoor activities
- Properties: name, description (e.g., "Backpacking", "Bikepacking")

**Season** - Usage seasons
- Properties: name (e.g., "3-season", "4-season", "Summer")

## Relationship Types

- \`(Product)-[:MADE_BY]->(Brand)\`
- \`(Product)-[:IN_CATEGORY]->(Category)\`
- \`(Product)-[:PART_OF]->(ProductFamily)\`
- \`(Product)-[:USES]->(Technology)\`
- \`(Product)-[:SUITED_FOR]->(Activity)\`
- \`(Product)-[:SUITABLE_FOR]->(Season)\`
- \`(Product)-[:LIGHTER_THAN]->(Product)\`
- \`(Product)-[:SIMILAR_TO]->(Product)\`
- \`(Product)-[:PAIRS_WITH]->(Product)\`

## Example Queries

Find products by brand:
\`MATCH (p:Product)-[:MADE_BY]->(b:Brand {name: 'MSR'}) RETURN p.name, p.weight\`

Find lighter alternatives:
\`MATCH (p1:Product {name: 'Big Agnes Copper Spur'})-[:LIGHTER_THAN]->(p2:Product) RETURN p2.name, p2.weight\`

Find products using Dyneema:
\`MATCH (p:Product)-[:USES]->(t:Technology {name: 'Dyneema'}) RETURN p.name, p.weight ORDER BY p.weight\`

Find ultralight tents:
\`MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {slug: 'tents'}) WHERE p.weight < 1000 RETURN p ORDER BY p.weight\``,

  inputSchema: queryGearGraphInputSchema,
  outputSchema: queryGearGraphOutputSchema,

  execute: async (input): Promise<QueryGearGraphOutput> => {
    const startTime = Date.now();
    const { cypher, limit } = input;

    // Validate query is read-only
    const validation = validateCypherQuery(cypher);
    if (!validation.valid) {
      return {
        success: false,
        rowCount: 0,
        data: null,
        error: validation.error,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Ensure query has appropriate limit
    const limitedQuery = ensureLimit(cypher, limit ?? 50);

    try {
      // Execute via MCP client
      const result: MCPToolResult = await mcpClient.callTool(
        'queryGearGraph',
        {
          cypherQuery: limitedQuery,
          parameters: {},
        },
        QUERY_TIMEOUT_MS
      );

      // Handle MCP errors
      if (result.error) {
        console.error('[queryGearGraph] MCP error:', result.error);
        return {
          success: false,
          rowCount: 0,
          data: null,
          error: result.error.includes('timeout')
            ? 'Query timeout (5s). Try a simpler query or reduce the scope.'
            : result.error,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Parse result
      const data = result.result as Record<string, unknown> | null;
      if (!data) {
        return {
          success: false,
          rowCount: 0,
          data: null,
          error: 'No data returned from GearGraph',
          executionTimeMs: Date.now() - startTime,
        };
      }

      const results = Array.isArray(data.results) ? data.results : [];
      const executionTime = Date.now() - startTime;

      console.log(`[queryGearGraph] Success: ${results.length} rows in ${executionTime}ms`);

      return {
        success: true,
        rowCount: results.length,
        data: results as Record<string, unknown>[],
        executionTimeMs: executionTime,
      };
    } catch (error) {
      console.error('[queryGearGraph] Error:', error);
      return {
        success: false,
        rowCount: 0,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
});

export { queryGearGraphInputSchema, queryGearGraphOutputSchema };
