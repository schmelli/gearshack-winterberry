/**
 * Query Catalog Tool - Simplified Interface
 * Feature: AI Assistant Simplification
 *
 * Queries public catalog data (products, brands, categories) with a simple
 * SQL-like interface. The AI specifies table, columns, and a WHERE clause as strings.
 *
 * Security:
 * - Read-only (SELECT only)
 * - No user-specific filtering (public data)
 * - Query timeout (5 seconds)
 * - Result limit (50 rows)
 * - Table whitelist validation
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';

// =============================================================================
// Constants
// =============================================================================

/** Tables in the public catalog */
const CATALOG_TABLES = ['catalog_products', 'catalog_brands', 'categories'] as const;
type CatalogTable = (typeof CATALOG_TABLES)[number];

/** Maximum rows to return */
const MAX_ROWS = 50;

/** Query timeout in milliseconds */
const QUERY_TIMEOUT_MS = 5000;

// =============================================================================
// Input Schema
// =============================================================================

const queryCatalogInputSchema = z.object({
  table: z
    .enum(CATALOG_TABLES)
    .describe('Table to query: catalog_products, catalog_brands, or categories'),

  select: z
    .string()
    .default('*')
    .describe(
      'Columns to select (comma-separated or * for all). Examples: "name, weight_grams, price_usd" or "*"'
    ),

  where: z
    .string()
    .optional()
    .describe(`WHERE conditions as a simple string.
Examples:
- "name ILIKE '%tent%'"
- "weight_grams < 1000"
- "brand_id = 'some-uuid'"
- "product_type = 'shelter' AND weight_grams < 500"`),

  orderBy: z
    .object({
      column: z.string(),
      ascending: z.boolean().default(true),
    })
    .optional()
    .describe('Sort order. Example: { column: "weight_grams", ascending: true }'),

  limit: z
    .number()
    .int()
    .positive()
    .max(MAX_ROWS)
    .default(25)
    .describe(`Maximum rows to return (max ${MAX_ROWS})`),
});

export type QueryCatalogInput = z.infer<typeof queryCatalogInputSchema>;

// =============================================================================
// Output Schema
// =============================================================================

const queryCatalogOutputSchema = z.object({
  success: z.boolean(),
  rowCount: z.number(),
  data: z.union([z.array(z.record(z.string(), z.unknown())), z.null()]),
  error: z.string().optional(),
  executionTimeMs: z.number().optional(),
});

export type QueryCatalogOutput = z.infer<typeof queryCatalogOutputSchema>;

// =============================================================================
// WHERE Clause Parser (Same as queryUserData)
// =============================================================================

interface ParsedCondition {
  column: string;
  operator: string;
  value: string | number | boolean | null;
  combiner?: 'AND' | 'OR';
}

/**
 * Parse a simple WHERE clause string into conditions
 * Supports: =, !=, <, >, <=, >=, ILIKE, LIKE, IS NULL, IS NOT NULL
 */
function parseWhereClause(whereStr: string): ParsedCondition[] {
  if (!whereStr.trim()) return [];

  const conditions: ParsedCondition[] = [];

  // Split by AND/OR while preserving the operator
  const parts = whereStr.split(/\s+(AND|OR)\s+/i);

  let currentCombiner: 'AND' | 'OR' | undefined;

  for (const part of parts) {
    const trimmed = part.trim();

    // Check if this is a combiner
    if (trimmed.toUpperCase() === 'AND') {
      currentCombiner = 'AND';
      continue;
    }
    if (trimmed.toUpperCase() === 'OR') {
      currentCombiner = 'OR';
      continue;
    }

    // Parse the condition
    // Match patterns like: column OPERATOR value
    const patterns = [
      // IS NULL / IS NOT NULL
      /^(\w+)\s+(IS\s+NOT\s+NULL|IS\s+NULL)$/i,
      // ILIKE / LIKE with quoted value
      /^(\w+)\s+(ILIKE|LIKE)\s+'([^']*)'$/i,
      // Comparison operators with quoted string
      /^(\w+)\s*(=|!=|<>|<=|>=|<|>)\s*'([^']*)'$/,
      // Comparison operators with number
      /^(\w+)\s*(=|!=|<>|<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/,
      // Comparison operators with boolean
      /^(\w+)\s*(=|!=)\s*(true|false)$/i,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const [, column, operator, value] = match;

        let parsedValue: string | number | boolean | null = value;

        // Parse value types
        if (operator.toUpperCase().includes('NULL')) {
          parsedValue = null;
        } else if (value !== undefined) {
          if (value.toLowerCase() === 'true') parsedValue = true;
          else if (value.toLowerCase() === 'false') parsedValue = false;
          else if (/^-?\d+(?:\.\d+)?$/.test(value)) parsedValue = parseFloat(value);
        }

        conditions.push({
          column,
          operator: operator.toUpperCase().replace(/\s+/g, ' '),
          value: parsedValue,
          combiner: conditions.length > 0 ? currentCombiner : undefined,
        });
        currentCombiner = 'AND'; // Default to AND
        break;
      }
    }
  }

  return conditions;
}

/**
 * Apply parsed conditions to a Supabase query builder
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyConditions(query: any, conditions: ParsedCondition[]): any {
  let result = query;

  for (const cond of conditions) {
    switch (cond.operator) {
      case '=':
        result = result.eq(cond.column, cond.value as string | number);
        break;
      case '!=':
      case '<>':
        result = result.neq(cond.column, cond.value as string | number);
        break;
      case '<':
        result = result.lt(cond.column, cond.value as number);
        break;
      case '>':
        result = result.gt(cond.column, cond.value as number);
        break;
      case '<=':
        result = result.lte(cond.column, cond.value as number);
        break;
      case '>=':
        result = result.gte(cond.column, cond.value as number);
        break;
      case 'ILIKE':
        result = result.ilike(cond.column, cond.value as string);
        break;
      case 'LIKE':
        result = result.like(cond.column, cond.value as string);
        break;
      case 'IS NULL':
        result = result.is(cond.column, null);
        break;
      case 'IS NOT NULL':
        result = result.not(cond.column, 'is', null);
        break;
    }
  }

  return result;
}

// =============================================================================
// Tool Definition
// =============================================================================

export const queryCatalogTool = createTool({
  id: 'queryCatalog',

  description: `Query public catalog data (products, brands, categories).

## Available Tables & Columns

**catalog_products** (product catalog):
- id, name, product_type, product_type_id, description
- price_usd, weight_grams, brand_id
- created_at, updated_at

**catalog_brands** (brand directory):
- id, name, logo_url, country, website
- description, founded_year

**categories** (product categories):
- id, label, slug, level, parent_id
- icon, i18n (translations)

## WHERE Clause Syntax

Use simple SQL-like conditions:
- Equality: "product_type = 'shelter'"
- Comparison: "weight_grams < 1000"
- Pattern: "name ILIKE '%tent%'" (case-insensitive)
- Multiple: "product_type = 'shelter' AND weight_grams < 500"

## Examples

Find ultralight tents: { table: "catalog_products", where: "name ILIKE '%tent%' AND weight_grams < 1000", orderBy: { column: "weight_grams", ascending: true } }
List brands: { table: "catalog_brands", select: "name, country" }
Search shelters: { table: "catalog_products", where: "product_type = 'shelter'" }`,

  inputSchema: queryCatalogInputSchema,
  outputSchema: queryCatalogOutputSchema,

  execute: async ({ context }): Promise<QueryCatalogOutput> => {
    const startTime = Date.now();
    const { table, select, where, orderBy, limit } = context;

    try {
      const supabase = createServiceRoleClient();

      // Start query
      let query = supabase.from(table).select(select || '*');

      // Parse and apply WHERE conditions
      if (where) {
        const conditions = parseWhereClause(where);
        if (conditions.length > 0) {
          query = applyConditions(query, conditions);
        }
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // Apply limit
      query = query.limit(limit ?? 25);

      // Execute with timeout
      const { data, error } = await Promise.race([
        query,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout (5s)')), QUERY_TIMEOUT_MS)
        ),
      ]);

      if (error) {
        console.error('[queryCatalog] Database error:', error);
        return {
          success: false,
          rowCount: 0,
          data: null,
          error: `Query failed: ${error.message}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const executionTime = Date.now() - startTime;
      console.log(`[queryCatalog] Success: ${data?.length ?? 0} rows in ${executionTime}ms`);

      return {
        success: true,
        rowCount: data?.length ?? 0,
        data: (data ?? []) as unknown as Record<string, unknown>[],
        executionTimeMs: executionTime,
      };
    } catch (error) {
      console.error('[queryCatalog] Error:', error);
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

export { queryCatalogInputSchema, queryCatalogOutputSchema };
