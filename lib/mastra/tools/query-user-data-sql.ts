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
Supports: =, !=, <, >, <=, >=, ILIKE, LIKE, IS NULL, IS NOT NULL, IN, AND, OR.
Examples:
- "brand ILIKE '%osprey%'"
- "status = 'wishlist'"
- "weight_grams > 500"
- "name ILIKE '%tent%' AND weight_grams < 1000"
- "name ILIKE '%tent%' OR name ILIKE '%zelt%'"
- "category_id IN ('uuid1', 'uuid2', 'uuid3')"
- "category_id IN ('id1', 'id2') OR name ILIKE '%tent%'"`),

  orderBy: z
    .object({
      column: z.string(),
      ascending: z.boolean().default(true),
    })
    .optional()
    .describe('Sort order. Example: { column: "weight_grams", ascending: true }'),

  categorySearch: z
    .string()
    .optional()
    .describe('Search gear_items by category name or slug (e.g., "tents", "shelter", "Zelte", "sleeping"). Automatically resolves the full category hierarchy including child categories AND searches item names. Use this instead of manually looking up category IDs with queryCatalog. Only works with gear_items table.'),

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
  value: string | number | boolean | null | string[];
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

    // Special case: IN clause - column IN ('val1', 'val2', ...)
    const inMatch = trimmed.match(/^(\w+)\s+IN\s*\(([^)]+)\)$/i);
    if (inMatch) {
      const rawValues = inMatch[2].split(',').map(v => v.trim().replace(/^'|'$/g, ''));
      conditions.push({
        column: inMatch[1],
        operator: 'IN',
        value: rawValues,
        combiner: conditions.length > 0 ? currentCombiner : undefined,
      });
      currentCombiner = 'AND';
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
 * Convert a parsed condition to PostgREST filter format for use in .or() calls
 */
function conditionToPostgrestFilter(cond: ParsedCondition): string {
  const col = cond.column;
  switch (cond.operator) {
    case '=': return `${col}.eq.${cond.value}`;
    case '!=':
    case '<>': return `${col}.neq.${cond.value}`;
    case '<': return `${col}.lt.${cond.value}`;
    case '>': return `${col}.gt.${cond.value}`;
    case '<=': return `${col}.lte.${cond.value}`;
    case '>=': return `${col}.gte.${cond.value}`;
    case 'ILIKE': return `${col}.ilike.${cond.value}`;
    case 'LIKE': return `${col}.like.${cond.value}`;
    case 'IS NULL': return `${col}.is.null`;
    case 'IS NOT NULL': return `${col}.not.is.null`;
    case 'IN': {
      const vals = cond.value as string[];
      return `${col}.in.(${vals.join(',')})`;
    }
    default: return '';
  }
}

/**
 * Apply a single condition directly to a Supabase query builder
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySingleCondition(query: any, cond: ParsedCondition): any {
  switch (cond.operator) {
    case '=':
      return query.eq(cond.column, cond.value as string | number);
    case '!=':
    case '<>':
      return query.neq(cond.column, cond.value as string | number);
    case '<':
      return query.lt(cond.column, cond.value as number);
    case '>':
      return query.gt(cond.column, cond.value as number);
    case '<=':
      return query.lte(cond.column, cond.value as number);
    case '>=':
      return query.gte(cond.column, cond.value as number);
    case 'ILIKE':
      return query.ilike(cond.column, cond.value as string);
    case 'LIKE':
      return query.like(cond.column, cond.value as string);
    case 'IS NULL':
      return query.is(cond.column, null);
    case 'IS NOT NULL':
      return query.not(cond.column, 'is', null);
    case 'IN':
      return query.in(cond.column, cond.value as string[]);
    default:
      return query;
  }
}

/**
 * Apply parsed conditions to a Supabase query builder.
 * Supports AND, OR, and IN operators.
 *
 * OR groups are handled via Supabase's .or() PostgREST filter syntax.
 * Consecutive OR-connected conditions are grouped together.
 * AND conditions are applied via direct Supabase method chaining.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyConditions(query: any, conditions: ParsedCondition[]): any {
  if (conditions.length === 0) return query;

  // Group conditions: consecutive OR-connected conditions form a group.
  // AND boundaries start a new group.
  const groups: ParsedCondition[][] = [];
  let currentGroup: ParsedCondition[] = [conditions[0]];

  for (let i = 1; i < conditions.length; i++) {
    if (conditions[i].combiner === 'OR') {
      currentGroup.push(conditions[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [conditions[i]];
    }
  }
  groups.push(currentGroup);

  // Apply each group to the query
  let result = query;
  for (const group of groups) {
    if (group.length === 1) {
      // Single condition: apply directly (AND-chained)
      result = applySingleCondition(result, group[0]);
    } else {
      // Multiple conditions in group: connected by OR → use .or()
      const filters = group.map(c => conditionToPostgrestFilter(c)).filter(Boolean);
      if (filters.length > 0) {
        result = result.or(filters.join(','));
      }
    }
  }

  return result;
}

// =============================================================================
// Category Search Helper
// =============================================================================

/**
 * Resolve a category search term to matching category IDs.
 * Searches by slug, label, and i18n fields, then includes child categories.
 * Uses a single DB query (categories table is small, ~50-100 rows).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveCategorySearch(supabase: any, search: string): Promise<string[]> {
  const searchLower = search.toLowerCase();

  // Load all categories in a single query (small dataset)
  const { data: allCategories, error } = await supabase
    .from('categories')
    .select('*');

  if (error || !allCategories || allCategories.length === 0) return [];

  // Find matching categories by slug, label, or i18n translations
  const matchingIds = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const cat of allCategories as any[]) {
    const fields: string[] = [
      cat.slug,
      cat.label,
      // Include i18n translations if available (e.g., { de: "Zelte", en: "Tents" })
      ...(typeof cat.i18n === 'object' && cat.i18n !== null
        ? Object.values(cat.i18n as Record<string, string>)
        : []),
    ].filter((f): f is string => typeof f === 'string');

    if (fields.some(f => f.toLowerCase().includes(searchLower))) {
      matchingIds.add(cat.id as string);
    }
  }

  // Also include child categories of matching parents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const cat of allCategories as any[]) {
    if (cat.parent_id && matchingIds.has(cat.parent_id as string)) {
      matchingIds.add(cat.id as string);
    }
  }

  return Array.from(matchingIds);
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
- AND: "status = 'own' AND weight_grams < 1000"
- OR: "name ILIKE '%tent%' OR name ILIKE '%zelt%'"
- IN: "category_id IN ('uuid1', 'uuid2', 'uuid3')"
- Combined: "category_id IN ('id1', 'id2') OR name ILIKE '%tent%'"

## Examples

Find all owned gear: { table: "gear_items", where: "status = 'own'" }
Heavy items: { table: "gear_items", where: "weight_grams > 500", orderBy: { column: "weight_grams", ascending: false } }
Search brand: { table: "gear_items", where: "brand ILIKE '%osprey%'" }
By category (PREFERRED): { table: "gear_items", categorySearch: "tents" }
By category + filter: { table: "gear_items", categorySearch: "sleeping", where: "weight_grams < 500" }
List loadouts: { table: "loadouts", select: "name, total_weight" }`,

  inputSchema: queryUserDataSqlInputSchema,
  outputSchema: queryUserDataSqlOutputSchema,

  execute: async (input, executionContext): Promise<QueryUserDataSqlOutput> => {
    const startTime = Date.now();
    const { table, select, where, orderBy, limit, categorySearch } = input;

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

      // Apply categorySearch filter (resolves category hierarchy in a single call)
      if (categorySearch && table === 'gear_items') {
        const categoryIds = await resolveCategorySearch(supabase, categorySearch);
        if (categoryIds.length > 0) {
          // Match by category_id (hierarchy) OR by name (fallback)
          const orFilters = [
            `category_id.in.(${categoryIds.join(',')})`,
            `name.ilike.%${categorySearch}%`,
          ];
          query = query.or(orFilters.join(','));
        } else {
          // No categories found - fall back to name search only
          query = query.ilike('name', `%${categorySearch}%`);
        }
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
