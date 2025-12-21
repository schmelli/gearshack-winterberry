/**
 * Query User Data Tool (Mastra Format)
 * Feature: 001-mastra-agentic-voice (T016)
 *
 * Migrated from: lib/ai-assistant/tools/query-user-data.ts
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

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Input Schema
// =============================================================================

const queryUserDataInputSchema = z.object({
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
    .record(z.string(), z.unknown())
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

export type QueryUserDataInput = z.infer<typeof queryUserDataInputSchema>;

// =============================================================================
// Output Schema
// =============================================================================

const queryUserDataOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  table: z.string(),
  rowCount: z.number(),
  data: z.union([z.array(z.record(z.string(), z.unknown())), z.number(), z.null()]),
  error: z.string().optional(),
  metadata: z
    .object({
      executionTimeMs: z.number(),
      limitApplied: z.number(),
      filtersApplied: z.array(z.string()),
    })
    .optional(),
});

export type QueryUserDataOutput = z.infer<typeof queryUserDataOutputSchema>;

// =============================================================================
// Tool Definition
// =============================================================================

/**
 * Query User Data Tool
 *
 * Mastra-formatted tool for flexible database queries with RLS enforcement.
 * Requires userId to be passed via runtimeContext for authentication.
 */
export const queryUserDataTool = createTool({
  id: 'queryUserData',
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
- Sort by weight: {table: "gear_items", orderBy: {column: "weight_grams", ascending: true}}`,

  inputSchema: queryUserDataInputSchema,
  outputSchema: queryUserDataOutputSchema,

  execute: async ({ context, runtimeContext }): Promise<QueryUserDataOutput> => {
    const startTime = Date.now();
    const { table, operation, select, filters, search, orderBy, limit, range } = context;

    // Get userId from runtimeContext (set by chat route)
    const userId = runtimeContext?.get('userId') as string | undefined;

    if (!userId) {
      return {
        success: false,
        operation: operation ?? 'select',
        table,
        rowCount: 0,
        data: null,
        error: 'User ID not provided in runtime context',
      };
    }

    try {
      const supabase = await createClient();

      // Verify user authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        return {
          success: false,
          operation: operation ?? 'select',
          table,
          rowCount: 0,
          data: null,
          error: 'Authentication failed or user mismatch',
        };
      }

      // Start building query
      const effectiveOperation = operation ?? 'select';
      let query = supabase.from(table).select(effectiveOperation === 'count' ? '*' : select, {
        count: effectiveOperation === 'count' ? 'exact' : undefined,
        head: effectiveOperation === 'count',
      });

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
          } else if (value !== undefined) {
            query = query.eq(key, value as string | number | boolean);
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
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // Apply limit (default 50, max 100)
      const effectiveLimit = limit ?? 50;
      if (effectiveOperation !== 'count') {
        query = query.limit(effectiveLimit);
      }

      // Execute query with timeout
      const { data, error, count } = await Promise.race([
        query,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout (5s)')), 5000)
        ),
      ]);

      if (error) {
        console.error('[queryUserData] Database error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          table,
          operation: effectiveOperation,
        });
        return {
          success: false,
          operation: effectiveOperation,
          table,
          rowCount: 0,
          data: null,
          error: `Database query failed: ${error.message}${error.hint ? ` (${error.hint})` : ''}`,
        };
      }

      const executionTime = Date.now() - startTime;

      // Return results
      if (effectiveOperation === 'count') {
        return {
          success: true,
          operation: effectiveOperation,
          table,
          rowCount: count ?? 0,
          data: count ?? 0,
          metadata: {
            executionTimeMs: executionTime,
            limitApplied: 0,
            filtersApplied: appliedFilters,
          },
        };
      }

      return {
        success: true,
        operation: effectiveOperation,
        table,
        rowCount: data?.length ?? 0,
        data: (data ?? []) as unknown as Record<string, unknown>[],
        metadata: {
          executionTimeMs: executionTime,
          limitApplied: effectiveLimit,
          filtersApplied: appliedFilters,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[queryUserData] Error:', error);

      return {
        success: false,
        operation: operation ?? 'select',
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
  },
});

// =============================================================================
// Re-exports for backwards compatibility
// =============================================================================

export { queryUserDataInputSchema, queryUserDataOutputSchema };
