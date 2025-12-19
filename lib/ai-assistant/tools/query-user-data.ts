/**
 * Query User Data Tool
 * Feature 050: AI Assistant - Flexible Database Queries
 *
 * Allows AI to execute flexible read-only queries on user's Supabase data.
 * Replaces fixed-schema tools (analyzeInventory, compareItems, etc.) with
 * a single powerful tool that can answer any question about user data.
 *
 * Security:
 * - Read-only (SELECT/COUNT only)
 * - Automatic RLS enforcement (user_id filtering)
 * - Query timeout (5 seconds)
 * - Result limit (100 rows)
 * - No destructive operations
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const queryUserDataParametersSchema = z.object({
  table: z
    .enum(['gear_items', 'loadouts', 'loadout_items', 'categories', 'profiles'])
    .describe('Database table to query'),

  operation: z
    .enum(['select', 'count'])
    .default('select')
    .describe('Query operation type'),

  select: z
    .string()
    .default('*')
    .describe('Columns to select (comma-separated, e.g., "id,name,brand,weight_grams")'),

  filters: z
    .record(z.any())
    .optional()
    .describe('Filters to apply (e.g., {"brand": "Osprey", "status": "own"})'),

  search: z
    .object({
      column: z.string(),
      value: z.string(),
      caseSensitive: z.boolean().optional().default(false),
    })
    .optional()
    .describe('Text search filter (uses ILIKE for case-insensitive search)'),

  orderBy: z
    .object({
      column: z.string(),
      ascending: z.boolean().optional().default(true),
    })
    .optional()
    .describe('Sort results by column'),

  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum number of rows to return (max 100)'),

  range: z
    .object({
      column: z.string(),
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional()
    .describe('Range filter for numeric columns (e.g., weight, price)'),
});

export type QueryUserDataParameters = z.infer<typeof queryUserDataParametersSchema>;

// =============================================================================
// Tool Definition
// =============================================================================

export const queryUserDataTool = {
  description: `Execute flexible read-only queries on user's database.

  Available tables:
  - gear_items: User's gear inventory (id, name, brand, weight_grams, price_paid, category_id, status, etc.)
  - loadouts: User's loadouts (id, name, description, total_weight, activity_types, seasons, etc.)
  - loadout_items: Items in loadouts (loadout_id, gear_item_id, quantity, etc.)
  - categories: Gear categories (id, label, i18n, icon, etc.)
  - profiles: User profile data (id, username, subscription_tier, etc.)

  All queries automatically filtered to current user's data (RLS enforced).

  Examples:
  - Find all Osprey gear: {table: "gear_items", filters: {brand: "Osprey"}}
  - Count wishlist items: {table: "gear_items", operation: "count", filters: {status: "wishlist"}}
  - Search by name: {table: "gear_items", search: {column: "name", value: "tent"}}
  - Find items under 500g: {table: "gear_items", range: {column: "weight_grams", max: 500}}
  - Sort by weight: {table: "gear_items", orderBy: {column: "weight_grams", ascending: true}}
  `,
  parameters: queryUserDataParametersSchema,
};

// =============================================================================
// Result Types
// =============================================================================

export interface QueryUserDataResponse {
  success: boolean;
  operation: string;
  table: string;
  rowCount: number;
  data: any[] | number | null;
  error?: string;
  metadata?: {
    executionTimeMs: number;
    limitApplied: number;
    filtersApplied: string[];
  };
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute user data query with RLS enforcement
 *
 * @param params - Query parameters
 * @param userId - Current user ID (for RLS)
 * @returns QueryUserDataResponse with results
 */
export async function executeQueryUserData(
  params: QueryUserDataParameters,
  userId: string
): Promise<QueryUserDataResponse> {
  const startTime = Date.now();
  const { table, operation, select, filters, search, orderBy, limit, range } = params;

  try {
    const supabase = await createClient();

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      return {
        success: false,
        operation,
        table,
        rowCount: 0,
        data: null,
        error: 'Authentication failed or user mismatch',
      };
    }

    // Start building query
    let query = supabase.from(table).select(
      operation === 'count' ? '*' : select,
      { count: operation === 'count' ? 'exact' : undefined, head: operation === 'count' }
    );

    // Track applied filters for metadata
    const appliedFilters: string[] = [];

    // Apply user_id filter for tables that have it (automatic RLS)
    // Note: RLS policies should already handle this, but we add it explicitly for safety
    if (['gear_items', 'loadouts', 'profiles'].includes(table)) {
      if (table === 'profiles') {
        query = query.eq('id', userId);
      } else {
        query = query.eq('user_id', userId);
      }
      appliedFilters.push('user_id');
    }

    // Apply exact match filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value === null) {
          query = query.is(key, null);
        } else {
          query = query.eq(key, value);
        }
        appliedFilters.push(key);
      }
    }

    // Apply search filter (case-insensitive ILIKE)
    if (search) {
      if (search.caseSensitive) {
        query = query.like(search.column, `%${search.value}%`);
      } else {
        query = query.ilike(search.column, `%${search.value}%`);
      }
      appliedFilters.push(`search:${search.column}`);
    }

    // Apply range filter
    if (range) {
      if (range.min !== undefined) {
        query = query.gte(range.column, range.min);
        appliedFilters.push(`${range.column}:min`);
      }
      if (range.max !== undefined) {
        query = query.lte(range.column, range.max);
        appliedFilters.push(`${range.column}:max`);
      }
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }

    // Apply limit (default 50, max 100)
    if (operation !== 'count') {
      query = query.limit(limit || 50);
    }

    // Execute query with timeout
    const { data, error, count } = await Promise.race([
      query,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout (5s)')), 5000)
      ),
    ]);

    if (error) {
      return {
        success: false,
        operation,
        table,
        rowCount: 0,
        data: null,
        error: `Database query failed: ${error.message}`,
      };
    }

    const executionTime = Date.now() - startTime;

    // Return results
    if (operation === 'count') {
      return {
        success: true,
        operation,
        table,
        rowCount: count || 0,
        data: count || 0,
        metadata: {
          executionTimeMs: executionTime,
          limitApplied: 0,
          filtersApplied: appliedFilters,
        },
      };
    }

    return {
      success: true,
      operation,
      table,
      rowCount: data?.length || 0,
      data: data || [],
      metadata: {
        executionTimeMs: executionTime,
        limitApplied: limit || 50,
        filtersApplied: appliedFilters,
      },
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('[queryUserData] Error:', error);

    return {
      success: false,
      operation,
      table,
      rowCount: 0,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: {
        executionTimeMs: executionTime,
        limitApplied: 0,
        filtersApplied: [],
      },
    };
  }
}
