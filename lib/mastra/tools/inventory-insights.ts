/**
 * Composite Tool: inventoryInsights
 * Feature: 060-ai-agent-evolution
 *
 * Provides rich inventory statistics in a SINGLE tool call. Answers:
 * - "How many tents do I have?"
 * - "What's my heaviest item?"
 * - "Which brands do I own?"
 * - "Show my gear by category"
 * - "What's my total inventory weight?"
 *
 * @see specs/060-ai-agent-evolution/analysis.md - Vorschlag 2
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { extractUserId, formatWeight as fmtWeight } from './utils';

// =============================================================================
// Schemas
// =============================================================================

const inventoryInsightsInputSchema = z.object({
  question: z.enum([
    'overview',           // Full inventory overview
    'count_by_category',  // Count items by category (with search)
    'heaviest_items',     // Top N heaviest items
    'lightest_items',     // Top N lightest items
    'brand_breakdown',    // Items grouped by brand
    'weight_distribution',// Weight stats
    'value_summary',      // Price/value summary
    'recent_additions',   // Recently added items
  ]).describe('Type of inventory insight to retrieve'),

  category: z.string().optional()
    .describe('Category search term (e.g., "tents", "Zelte", "sleeping bags"). Matches slugs, labels, and i18n translations.'),

  status: z.enum(['own', 'wishlist', 'sold', 'all']).default('own')
    .describe('Item status filter'),

  limit: z.number().int().positive().max(50).default(10)
    .describe('Maximum items to return'),
});

const inventoryInsightsOutputSchema = z.object({
  success: z.boolean(),
  summary: z.string().describe('Human-readable summary of the result'),
  data: z.unknown().optional().describe('Structured data for further processing'),
  itemCount: z.number().optional(),
  error: z.string().optional(),
});

// =============================================================================
// Tool
// =============================================================================

export const inventoryInsightsTool = createTool({
  id: 'inventoryInsights',

  description: `Get rich inventory statistics and insights in a single call. Use this for questions about the user's gear collection.

Examples:
- "How many tents do I have?" → { question: "count_by_category", category: "tents" }
- "What's my heaviest item?" → { question: "heaviest_items", limit: 5 }
- "Show my gear overview" → { question: "overview" }
- "Which brands do I own?" → { question: "brand_breakdown" }
- "What's my total gear value?" → { question: "value_summary" }
- "What did I add recently?" → { question: "recent_additions" }
- "How many sleeping bags?" → { question: "count_by_category", category: "sleeping bags" }`,

  inputSchema: inventoryInsightsInputSchema,
  outputSchema: inventoryInsightsOutputSchema,

  execute: async (input, executionContext) => {
    try {
      // Get userId
      const userId = extractUserId(executionContext);

      if (!userId) {
        return { success: false, summary: 'User not authenticated', error: 'User not authenticated' };
      }

      const supabase = createServiceRoleClient();

      switch (input.question) {
        case 'overview': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase.rpc as any)('get_inventory_intelligence', {
            p_user_id: userId,
          });
          if (error) return { success: false, summary: 'Failed to load inventory', error: error.message };

          const stats = data as Record<string, unknown>;
          const summary = `You have ${stats.totalOwned} items in your inventory` +
            (stats.totalWishlist ? ` and ${stats.totalWishlist} on your wishlist` : '') +
            `. Total weight: ${fmtWeight(stats.totalWeight as number)}.` +
            ` ${stats.brandCount} different brands.`;

          return { success: true, summary, data: stats, itemCount: stats.totalOwned as number };
        }

        case 'count_by_category': {
          if (!input.category) {
            return { success: false, summary: 'Please specify a category to count', error: 'Category required' };
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase.rpc as any)('count_items_by_category', {
            p_user_id: userId,
            p_search_term: input.category,
            p_status: input.status === 'all' ? 'own' : input.status,
          });
          if (error) return { success: false, summary: 'Failed to count items', error: error.message };

          const result = data as Record<string, unknown>;
          const count = result.count as number;
          const items = result.items as Array<Record<string, unknown>>;

          let summary: string;
          if (count === 0) {
            summary = `You don't have any "${input.category}" items in your inventory.`;
          } else if (count === 1) {
            const item = items[0];
            summary = `You have 1 "${input.category}" item: ${item.name} (${item.brand || 'unknown brand'}, ${item.weight_grams ? fmtWeight(item.weight_grams as number) : 'weight unknown'}).`;
          } else {
            summary = `You have ${count} "${input.category}" items:\n` +
              items.map(i => `  - ${i.name} (${i.brand || '?'}, ${i.weight_grams ? fmtWeight(i.weight_grams as number) : '?'})`).join('\n');
          }

          return { success: true, summary, data: result, itemCount: count };
        }

        case 'heaviest_items': {
          const { data, error } = await supabase
            .from('gear_items')
            .select('id, name, brand, weight_grams, product_type_id, categories!gear_items_product_type_id_fkey(label)')
            .eq('user_id', userId)
            .eq('status', input.status === 'all' ? 'own' : input.status)
            .not('weight_grams', 'is', null)
            .gt('weight_grams', 0)
            .order('weight_grams', { ascending: false })
            .limit(input.limit);

          if (error) return { success: false, summary: 'Failed to load items', error: error.message };

          const summary = `Your ${data.length} heaviest items:\n` +
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.map((i: any, idx: number) => `  ${idx + 1}. ${i.name} (${i.brand || '?'}): ${fmtWeight(i.weight_grams)} [${i.categories?.label || '?'}]`).join('\n');

          return { success: true, summary, data, itemCount: data.length };
        }

        case 'lightest_items': {
          const { data, error } = await supabase
            .from('gear_items')
            .select('id, name, brand, weight_grams, product_type_id, categories!gear_items_product_type_id_fkey(label)')
            .eq('user_id', userId)
            .eq('status', input.status === 'all' ? 'own' : input.status)
            .not('weight_grams', 'is', null)
            .gt('weight_grams', 0)
            .order('weight_grams', { ascending: true })
            .limit(input.limit);

          if (error) return { success: false, summary: 'Failed to load items', error: error.message };

          const summary = `Your ${data.length} lightest items:\n` +
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.map((i: any, idx: number) => `  ${idx + 1}. ${i.name} (${i.brand || '?'}): ${fmtWeight(i.weight_grams)} [${i.categories?.label || '?'}]`).join('\n');

          return { success: true, summary, data, itemCount: data.length };
        }

        case 'brand_breakdown': {
          const { data, error } = await supabase
            .from('gear_items')
            .select('brand, weight_grams')
            .eq('user_id', userId)
            .eq('status', input.status === 'all' ? 'own' : input.status)
            .not('brand', 'is', null);

          if (error) return { success: false, summary: 'Failed to load brands', error: error.message };

          // Aggregate by brand
          const brandMap = new Map<string, { count: number; totalWeight: number }>();
          for (const item of data) {
            const brand = item.brand || 'Unknown';
            const existing = brandMap.get(brand) || { count: 0, totalWeight: 0 };
            existing.count++;
            existing.totalWeight += (item.weight_grams || 0);
            brandMap.set(brand, existing);
          }

          const brands = Array.from(brandMap.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, input.limit)
            .map(([brand, stats]) => ({ brand, count: stats.count, totalWeight: stats.totalWeight }));

          const summary = `You own gear from ${brandMap.size} brands. Top ${brands.length}:\n` +
            brands.map(b => `  - ${b.brand}: ${b.count} items (${fmtWeight(b.totalWeight)})`).join('\n');

          return { success: true, summary, data: brands, itemCount: brandMap.size };
        }

        case 'weight_distribution': {
          const { data, error } = await supabase
            .from('gear_items')
            .select('weight_grams')
            .eq('user_id', userId)
            .eq('status', 'own')
            .not('weight_grams', 'is', null)
            .gt('weight_grams', 0);

          if (error) return { success: false, summary: 'Failed to load weights', error: error.message };

          const weights = data.map(i => i.weight_grams as number).sort((a, b) => a - b);
          if (weights.length === 0) {
            return { success: true, summary: 'No items with weight data found.', data: {}, itemCount: 0 };
          }

          const stats = {
            count: weights.length,
            min: weights[0],
            max: weights[weights.length - 1],
            avg: Math.round(weights.reduce((s, w) => s + w, 0) / weights.length),
            median: weights[Math.floor(weights.length / 2)],
            total: weights.reduce((s, w) => s + w, 0),
            under100g: weights.filter(w => w < 100).length,
            under500g: weights.filter(w => w < 500).length,
            over1kg: weights.filter(w => w > 1000).length,
          };

          const summary = `Weight distribution across ${stats.count} items:\n` +
            `  - Total: ${fmtWeight(stats.total)}\n` +
            `  - Range: ${fmtWeight(stats.min)} - ${fmtWeight(stats.max)}\n` +
            `  - Average: ${fmtWeight(stats.avg)}\n` +
            `  - Median: ${fmtWeight(stats.median)}\n` +
            `  - Under 100g: ${stats.under100g} items\n` +
            `  - Under 500g: ${stats.under500g} items\n` +
            `  - Over 1kg: ${stats.over1kg} items`;

          return { success: true, summary, data: stats, itemCount: stats.count };
        }

        case 'value_summary': {
          const { data, error } = await supabase
            .from('gear_items')
            .select('price_paid, currency')
            .eq('user_id', userId)
            .eq('status', 'own')
            .not('price_paid', 'is', null)
            .gt('price_paid', 0);

          if (error) return { success: false, summary: 'Failed to load prices', error: error.message };

          // Group by currency
          const currencyTotals = new Map<string, { total: number; count: number }>();
          for (const item of data) {
            const currency = item.currency || 'EUR';
            const existing = currencyTotals.get(currency) || { total: 0, count: 0 };
            existing.total += item.price_paid ?? 0;
            existing.count++;
            currencyTotals.set(currency, existing);
          }

          const summary = `Inventory value (${data.length} items with price data):\n` +
            Array.from(currencyTotals.entries())
              .map(([currency, stats]) => `  - ${currency}: ${stats.total.toFixed(2)} (${stats.count} items)`)
              .join('\n');

          return { success: true, summary, data: Object.fromEntries(currencyTotals), itemCount: data.length };
        }

        case 'recent_additions': {
          const { data, error } = await supabase
            .from('gear_items')
            .select('id, name, brand, weight_grams, created_at, categories(label)')
            .eq('user_id', userId)
            .eq('status', input.status === 'all' ? 'own' : input.status)
            .order('created_at', { ascending: false })
            .limit(input.limit);

          if (error) return { success: false, summary: 'Failed to load recent items', error: error.message };

          const summary = `Your ${data.length} most recently added items:\n` +
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.map((i: any) => {
              const date = new Date(i.created_at).toLocaleDateString();
              return `  - ${i.name} (${i.brand || '?'}, ${i.weight_grams ? fmtWeight(i.weight_grams) : '?'}) - added ${date}`;
            }).join('\n');

          return { success: true, summary, data, itemCount: data.length };
        }

        default:
          return { success: false, summary: 'Unknown question type', error: 'Invalid question parameter' };
      }
    } catch (error) {
      console.error('[inventoryInsights] Error:', error);
      return {
        success: false,
        summary: 'An error occurred while analyzing your inventory.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// fmtWeight is now imported from utils.ts
