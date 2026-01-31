/**
 * Query User Data Tool - Simplified Interface
 * Feature: AI Assistant Simplification
 *
 * Replaces the complex parameter-based queryUserData tool with a cleaner
 * interface. The AI specifies table, columns, and a WHERE clause as simple strings.
 *
 * Security:
 * - Read-only (SELECT only)
 * - Automatic user_id filtering
 * - Query timeout (5 seconds)
 * - Result limit (100 rows)
 * - Table whitelist validation
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';

// =============================================================================
// Constants
// =============================================================================

/** Tables that contain user-specific data (require user_id filtering) */
const USER_TABLES = ['gear_items', 'loadouts', 'loadout_items', 'profiles'] as const;
type _UserTable = typeof USER_TABLES[number];

/** Maximum rows to return */
const MAX_ROWS = 100;

/** Query timeout in milliseconds */
const QUERY_TIMEOUT_MS = 5000;

/** Dangerous SQL keywords that should never appear in WHERE clauses */
const DANGEROUS_SQL_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE',
  'EXEC', 'EXECUTE', 'UNION', 'INTO', 'GRANT', 'REVOKE',
  '--', ';', '/*', '*/',
] as const;

// =============================================================================
// Input Schema
// =============================================================================

const queryUserDataSqlInputSchema = z.object({
  table: z
    .enum(USER_TABLES)
    .describe('Table to query: gear_items, loadouts, loadout_items, or profiles'),

  select: z
    .string()
    .default('*')
    .describe('Columns to select (comma-separated or * for all). Examples: "name, brand, weight_grams" or "*"'),

  where: z
    .string()
    .optional()
    .describe(`WHERE conditions as a simple string. Do NOT include user_id (auto-applied).
Examples:
- "brand ILIKE '%osprey%'"
- "status = 'wishlist'"
- "weight_grams > 500"
- "name ILIKE '%tent%' AND weight_grams < 1000"`),

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
    .default(50)
    .describe(`Maximum rows to return (max ${MAX_ROWS})`),
});

export type QueryUserDataSqlInput = z.infer<typeof queryUserDataSqlInputSchema>;

// =============================================================================
// Output Schema
// =============================================================================

const queryUserDataSqlOutputSchema = z.object({
  success: z.boolean(),
  rowCount: z.number(),
  data: z.union([z.array(z.record(z.string(), z.unknown())), z.null()]),
  error: z.string().optional(),
  executionTimeMs: z.number().optional(),
});

export type QueryUserDataSqlOutput = z.infer<typeof queryUserDataSqlOutputSchema>;

// =============================================================================
// WHERE Clause Parser (Simple & Safe)
// =============================================================================

interface ParsedCondition {
  column: string;
  operator: string;
  value: string | number | boolean | null;
  combiner?: 'AND' | 'OR';
}

/**
 * Validate WHERE clause for dangerous SQL keywords
 * @throws Error if dangerous keywords are detected
 */
function validateWhereClause(whereStr: string): void {
  const upper = whereStr.toUpperCase();
  for (const keyword of DANGEROUS_SQL_KEYWORDS) {
    if (upper.includes(keyword)) {
      throw new Error(`Unsafe SQL keyword detected: ${keyword}`);
    }
  }
}

/**
 * Parse a simple WHERE clause string into conditions
 * Supports: =, !=, <, >, <=, >=, ILIKE, LIKE, IS NULL, IS NOT NULL
 */
function parseWhereClause(whereStr: string): ParsedCondition[] {
  if (!whereStr.trim()) return [];

  // Security: Validate for dangerous keywords before parsing
  validateWhereClause(whereStr);

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
          else if (/^-?\d+(?:\.\d+)?$/.test(value)) {
          const parsed = parseFloat(value);
          parsedValue = Number.isFinite(parsed) ? parsed : null;
        }
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
    // Handle OR conditions by wrapping in .or()
    // For simplicity, we'll use simple chaining (AND logic)
    // OR support would require more complex query building

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

export const queryUserDataSqlTool = createTool({
  id: 'queryUserData',

  description: `Query user data tables with simple parameters.

## Available Tables & Columns

**gear_items** (user's gear inventory):
- id, name, brand, weight_grams, price_paid, currency
- category_id, status ('own', 'wishlist', 'sold'), notes, image_url
- created_at, updated_at

**loadouts** (user's loadout/packing lists):
- id, name, description, total_weight
- activity_types (text[]), seasons (text[])
- hero_image_id, created_at

**loadout_items** (items in loadouts):
- loadout_id, gear_item_id, quantity, worn, consumable

**profiles** (user profile):
- id, username, display_name, subscription_tier

## WHERE Clause Syntax

Use simple SQL-like conditions (user_id is auto-applied):
- Equality: "status = 'wishlist'"
- Comparison: "weight_grams > 500"
- Pattern: "brand ILIKE '%osprey%'" (case-insensitive)
- Multiple: "status = 'own' AND weight_grams < 1000"

## Examples

Find all owned gear: { table: "gear_items", where: "status = 'own'" }
Heavy items: { table: "gear_items", where: "weight_grams > 500", orderBy: { column: "weight_grams", ascending: false } }
Search brand: { table: "gear_items", where: "brand ILIKE '%osprey%'" }
List loadouts: { table: "loadouts", select: "name, total_weight" }`,

  inputSchema: queryUserDataSqlInputSchema,
  outputSchema: queryUserDataSqlOutputSchema,

  execute: async (input, executionContext): Promise<QueryUserDataSqlOutput> => {
    const startTime = Date.now();
    const { table, select, where, orderBy, limit } = input;

    // Get userId from execution context's requestContext (renamed from runtimeContext in Mastra v1.0+)
    // Note: requestContext is passed at runtime but not exposed in ToolExecutionContext type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestContext = (executionContext as any)?.requestContext as Map<string, unknown> | undefined;
    const userId = requestContext?.get('userId') as string | undefined;

    if (!userId) {
      return {
        success: false,
        rowCount: 0,
        data: null,
        error: 'User ID not provided',
      };
    }

    try {
      const supabase = createServiceRoleClient();

      // Start query
      let query = supabase.from(table).select(select || '*');

      // Apply user_id filter (security)
      // IMPORTANT: Using service role client bypasses RLS, so we must filter manually
      if (table === 'profiles') {
        query = query.eq('id', userId);
      } else if (table === 'loadout_items') {
        // loadout_items doesn't have user_id - must filter via loadout ownership
        // First get user's loadout IDs, then filter loadout_items
        const { data: userLoadouts, error: loadoutsError } = await supabase
          .from('loadouts')
          .select('id')
          .eq('user_id', userId);

        // SECURITY FIX: Check for database errors before proceeding
        if (loadoutsError) {
          console.error('[query-user-data-sql] Failed to fetch user loadouts:', loadoutsError);
          return {
            success: false,
            rowCount: 0,
            data: [],
            error: 'Database query failed',
            executionTimeMs: Date.now() - startTime,
          };
        }

        const loadoutIds = userLoadouts?.map((l) => l.id) ?? [];
        if (loadoutIds.length === 0) {
          // User has no loadouts - return empty result
          return {
            success: true,
            rowCount: 0,
            data: [],
            executionTimeMs: Date.now() - startTime,
          };
        }
        query = query.in('loadout_id', loadoutIds);
      } else {
        // gear_items and loadouts have user_id
        query = query.eq('user_id', userId);
      }

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
      query = query.limit(limit ?? 50);

      // Execute with timeout
      const { data, error } = await Promise.race([
        query,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout (5s)')), QUERY_TIMEOUT_MS)
        ),
      ]);

      if (error) {
        console.error('[queryUserData] Database error:', error);
        return {
          success: false,
          rowCount: 0,
          data: null,
          error: `Query failed: ${error.message}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const executionTime = Date.now() - startTime;
      console.log(`[queryUserData] Success: ${data?.length ?? 0} rows in ${executionTime}ms`);

      return {
        success: true,
        rowCount: data?.length ?? 0,
        data: (data ?? []) as unknown as Record<string, unknown>[],
        executionTimeMs: executionTime,
      };
    } catch (error) {
      console.error('[queryUserData] Error:', error);
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

export { queryUserDataSqlInputSchema, queryUserDataSqlOutputSchema };
