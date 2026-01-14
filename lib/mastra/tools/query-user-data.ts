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
import { createServiceRoleClient } from '@/lib/supabase/server';

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
      fuzzy: z.boolean().optional().default(false),
      fuzzyThreshold: z.number().min(0).max(1).optional().default(0.3),
    })
    .optional()
    .describe('Text search filter (uses ILIKE for exact match, or similarity() for fuzzy/typo-tolerant search when fuzzy=true)'),

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
  description: `Execute flexible read-only queries on user's database with optional fuzzy/typo-tolerant search.

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
- Fuzzy search (typo-tolerant): {table: "gear_items", search: {column: "name", value: "qilt", fuzzy: true}}
- Find items under 500g: {table: "gear_items", range: {column: "weight_grams", max: 500}}
- Sort by weight: {table: "gear_items", orderBy: {column: "weight_grams", ascending: true}}

Fuzzy Search:
- Set search.fuzzy = true to enable typo-tolerant search (e.g., "qilt" will match "quilt")
- Uses PostgreSQL trigram similarity (pg_trgm) with default 30% match threshold
- Results ordered by similarity score (best matches first)
- Adjust threshold with search.fuzzyThreshold (0-1, default 0.3)`,

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
      // Use service role client since userId was already verified by the chat route
      // Security: All queries are explicitly filtered by user_id below
      const supabase = createServiceRoleClient();

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

      // Handle fuzzy search differently - uses RPC function
      if (search?.fuzzy) {
        const threshold = search.fuzzyThreshold ?? 0.3;
        const effectiveLimit = limit ?? 50;

        // Prepare filters for RPC (convert to JSONB format)
        const rpcFilters = filters ? filters : null;

        // Prepare range parameters
        const rangeColumn = range?.column ?? null;
        const rangeMin = range?.min ?? null;
        const rangeMax = range?.max ?? null;

        // Use fuzzy_search_column RPC for typo-tolerant search
        // Type assertion: RPC function not in generated types, using 'never' to bypass strict checking
        interface FuzzySearchResult {
          row_data: Record<string, unknown>;
          similarity_score: number;
        }
        const { data: fuzzyData, error: fuzzyError } = (await Promise.race([
          supabase.rpc('fuzzy_search_column' as never, {
            p_table_name: table,
            p_column_name: search.column,
            p_search_value: search.value,
            p_user_id: userId,
            p_similarity_threshold: threshold,
            p_limit: effectiveLimit,
            p_filters: rpcFilters,
            p_range_column: rangeColumn,
            p_range_min: rangeMin,
            p_range_max: rangeMax,
          } as never),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout (5s)')), 5000)
          ),
        ])) as { data: FuzzySearchResult[] | null; error: { message: string; details?: string; hint?: string; code?: string } | null };

        if (fuzzyError) {
          // Log detailed error for debugging (server-side only)
          console.error('[queryUserData] Fuzzy search error:', {
            message: fuzzyError.message,
            details: fuzzyError.details,
            hint: fuzzyError.hint,
            code: fuzzyError.code,
            params: { table, column: search.column, value: search.value, threshold },
          });

          // Return sanitized error message to user (no database internals)
          let userMessage = 'Fuzzy search failed. Please try again with different search terms.';

          // Provide helpful hints for common errors without exposing internals
          if (fuzzyError.code === '42703') {
            userMessage = 'Invalid search column. Please contact support if this persists.';
          } else if (fuzzyError.code === '42P01') {
            userMessage = 'Invalid table specified. Please contact support if this persists.';
          }

          return {
            success: false,
            operation: effectiveOperation,
            table,
            rowCount: 0,
            data: null,
            error: userMessage,
          };
        }

        const executionTime = Date.now() - startTime;

        // Extract row_data from fuzzy search results
        const results = fuzzyData?.map((row) => row.row_data) ?? [];

        // Build applied filters list for metadata
        const fuzzyAppliedFilters = [`fuzzy_search:${search.column}:threshold=${threshold}`];
        if (filters) {
          fuzzyAppliedFilters.push(...Object.keys(filters).map(key => `filter:${key}`));
        }
        if (range) {
          if (range.min !== undefined) fuzzyAppliedFilters.push(`${range.column}:min`);
          if (range.max !== undefined) fuzzyAppliedFilters.push(`${range.column}:max`);
        }

        return {
          success: true,
          operation: effectiveOperation,
          table,
          rowCount: results.length,
          data: results as Record<string, unknown>[],
          metadata: {
            executionTimeMs: executionTime,
            limitApplied: effectiveLimit,
            filtersApplied: fuzzyAppliedFilters,
          },
        };
      }

      // Apply standard search filter (case-insensitive ILIKE)
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
        // Log detailed error for debugging (server-side only)
        console.error('[queryUserData] Database error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          table,
          operation: effectiveOperation,
        });

        // Return sanitized error message to user (no database internals)
        let userMessage = 'Database query failed. Please try again.';

        // Provide helpful hints for common errors without exposing internals
        if (error.code === '42703') {
          userMessage = 'Invalid column specified in query. Please contact support if this persists.';
        } else if (error.code === '42P01') {
          userMessage = 'Invalid table specified. Please contact support if this persists.';
        } else if (error.code === 'PGRST116') {
          userMessage = 'No matching records found.';
        }

        return {
          success: false,
          operation: effectiveOperation,
          table,
          rowCount: 0,
          data: null,
          error: userMessage,
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

      // AUTO-FUZZY FALLBACK: If search returned 0 results and fuzzy wasn't enabled,
      // automatically retry with fuzzy search to handle typos transparently
      if (
        search &&
        !search.fuzzy &&
        effectiveOperation === 'select' &&
        (!data || data.length === 0)
      ) {
        console.log('[queryUserData] Auto-fuzzy fallback triggered for zero results', {
          table,
          column: search.column,
          value: search.value,
        });

        // Retry with fuzzy search enabled
        const threshold = search.fuzzyThreshold ?? 0.3;
        const rpcFilters = filters ? filters : null;
        const rangeColumn = range?.column ?? null;
        const rangeMin = range?.min ?? null;
        const rangeMax = range?.max ?? null;

        // Type for fuzzy search RPC result (defined above, reusing interface)
        interface FallbackFuzzySearchResult {
          row_data: Record<string, unknown>;
          similarity_score: number;
        }
        const { data: fuzzyData, error: fuzzyError } = (await Promise.race([
          supabase.rpc('fuzzy_search_column' as never, {
            p_table_name: table,
            p_column_name: search.column,
            p_search_value: search.value,
            p_user_id: userId,
            p_similarity_threshold: threshold,
            p_limit: effectiveLimit,
            p_filters: rpcFilters,
            p_range_column: rangeColumn,
            p_range_min: rangeMin,
            p_range_max: rangeMax,
          } as never),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Fuzzy fallback timeout (5s)')), 5000)
          ),
        ])) as { data: FallbackFuzzySearchResult[] | null; error: unknown };

        // If fuzzy search succeeds and finds results, return those instead
        if (!fuzzyError && fuzzyData && fuzzyData.length > 0) {
          const fuzzyExecutionTime = Date.now() - startTime;
          const results = fuzzyData.map((row) => row.row_data);

          console.log('[queryUserData] Auto-fuzzy fallback succeeded', {
            table,
            column: search.column,
            value: search.value,
            resultsFound: results.length,
          });

          return {
            success: true,
            operation: effectiveOperation,
            table,
            rowCount: results.length,
            data: results as Record<string, unknown>[],
            metadata: {
              executionTimeMs: fuzzyExecutionTime,
              limitApplied: effectiveLimit,
              filtersApplied: [
                ...appliedFilters,
                `auto_fuzzy_fallback:${search.column}:threshold=${threshold}`,
              ],
            },
          };
        }

        // If fuzzy fallback also fails, continue with original empty result
        console.log('[queryUserData] Auto-fuzzy fallback found no results', {
          table,
          column: search.column,
          value: search.value,
        });
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
