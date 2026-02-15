/**
 * Composite Tool: analyzeLoadout
 * Feature: 060-ai-agent-evolution
 *
 * Complete loadout analysis in a SINGLE tool call. Replaces 3-5 sequential
 * queryUserData calls with one high-level operation that:
 * 1. Fetches loadout + items via RPC (1 DB call)
 * 2. Calculates weight breakdown by category
 * 3. Identifies Big 3 (shelter, sleep, pack)
 * 4. Detects missing essential categories for the activity type
 * 5. Finds heaviest items with potential savings
 *
 * @see specs/060-ai-agent-evolution/analysis.md - Vorschlag 2
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { extractUserId, formatWeight as fmtWeight } from './utils';

// =============================================================================
// Domain Knowledge: Essential Categories by Activity
// =============================================================================

const ESSENTIAL_CATEGORIES: Record<string, string[]> = {
  hiking: ['shelter', 'sleeping', 'packs', 'clothing', 'navigation', 'first-aid', 'water'],
  backpacking: ['shelter', 'sleeping', 'packs', 'clothing', 'cooking', 'navigation', 'first-aid', 'water'],
  camping: ['shelter', 'sleeping', 'cooking', 'lighting', 'seating'],
  packrafting: ['shelter', 'sleeping', 'packs', 'packraft', 'paddle', 'pfd', 'dry-bags', 'first-aid'],
  mountaineering: ['shelter', 'sleeping', 'packs', 'climbing', 'navigation', 'first-aid', 'insulation'],
  ski_touring: ['shelter', 'sleeping', 'packs', 'skiing', 'avalanche-safety', 'navigation', 'first-aid'],
  trail_running: ['packs', 'hydration', 'nutrition', 'navigation', 'first-aid', 'rain-protection'],
  bikepacking: ['shelter', 'sleeping', 'bike-bags', 'repair-kit', 'navigation', 'lighting'],
};

const WEIGHT_BENCHMARKS: Record<string, { ultralight: number; lightweight: number; standard: number }> = {
  hiking: { ultralight: 4500, lightweight: 6800, standard: 9000 },
  backpacking: { ultralight: 4500, lightweight: 6800, standard: 9000 },
  camping: { ultralight: 8000, lightweight: 12000, standard: 18000 },
  packrafting: { ultralight: 8000, lightweight: 12000, standard: 16000 },
  mountaineering: { ultralight: 7000, lightweight: 10000, standard: 14000 },
  ski_touring: { ultralight: 7000, lightweight: 10000, standard: 14000 },
  trail_running: { ultralight: 2000, lightweight: 3500, standard: 5000 },
  bikepacking: { ultralight: 5000, lightweight: 8000, standard: 12000 },
};

// Big 3 category slug patterns
const BIG3_PATTERNS = {
  shelter: ['shelter', 'tents', 'tarps', 'hammock', 'bivy'],
  sleepSystem: ['sleeping', 'quilts', 'sleeping_bags', 'sleeping_pads', 'insulated_pads'],
  pack: ['packs', 'backpacks', 'frameless', 'framed'],
};

// =============================================================================
// Schemas
// =============================================================================

const analyzeLoadoutInputSchema = z.object({
  loadoutId: z.string().uuid().describe('UUID of the loadout to analyze'),
  analysisType: z.enum(['full', 'weight', 'gaps', 'suitability']).default('full')
    .describe('Type of analysis: full (everything), weight (weight focus), gaps (missing items), suitability (trip readiness)'),
  destination: z.string().optional()
    .describe('Trip destination for suitability check (e.g., "Northern Sweden", "Swiss Alps")'),
  season: z.string().optional()
    .describe('Season/month for suitability check (e.g., "September", "winter")'),
});

const analyzeLoadoutOutputSchema = z.object({
  success: z.boolean(),
  loadout: z.object({
    name: z.string(),
    description: z.string().nullable(),
    activityTypes: z.array(z.string()),
    seasons: z.array(z.string()),
  }).optional(),
  weight: z.object({
    total: z.number(),
    base: z.number(),
    worn: z.number(),
    consumable: z.number(),
    formatted: z.string(),
    classification: z.string(),
    benchmarkComparison: z.string().optional(),
  }).optional(),
  big3: z.object({
    shelter: z.object({ name: z.string(), weight: z.number() }).nullable(),
    sleepSystem: z.object({ name: z.string(), weight: z.number() }).nullable(),
    pack: z.object({ name: z.string(), weight: z.number() }).nullable(),
    totalWeight: z.number(),
    percentage: z.number(),
  }).optional(),
  categoryBreakdown: z.array(z.object({
    category: z.string(),
    weight: z.number(),
    percentage: z.number(),
    itemCount: z.number(),
  })).optional(),
  items: z.array(z.object({
    name: z.string(),
    brand: z.string().nullable(),
    weight: z.number(),
    category: z.string().nullable(),
    quantity: z.number(),
    isWorn: z.boolean(),
    isConsumable: z.boolean(),
  })).optional(),
  missingEssentials: z.array(z.object({
    category: z.string(),
    why: z.string(),
  })).optional(),
  heaviestItems: z.array(z.object({
    name: z.string(),
    weight: z.number(),
    category: z.string().nullable(),
    potentialSavings: z.string().optional(),
  })).optional(),
  itemCount: z.number().optional(),
  error: z.string().optional(),
});

// =============================================================================
// Tool
// =============================================================================

export const analyzeLoadoutTool = createTool({
  id: 'analyzeLoadout',

  description: `Perform a complete loadout/pack list analysis in a single call. Returns weight breakdown, Big 3 analysis, missing essentials, and heaviest items. Use this instead of multiple queryUserData calls.

Use for questions like:
- "What's missing in my pack list?"
- "How can I optimize this loadout's weight?"
- "Is this loadout ready for [trip]?"
- "What are the heaviest items?"
- "Analyze my loadout"

The tool automatically:
1. Fetches all loadout items with full gear details
2. Calculates weight breakdown by category
3. Identifies the Big 3 (shelter, sleep system, pack)
4. Checks for missing essential categories based on activity type
5. Lists heaviest items with potential weight savings`,

  inputSchema: analyzeLoadoutInputSchema,
  outputSchema: analyzeLoadoutOutputSchema,

  execute: async (input, executionContext) => {
    const startTime = Date.now();

    try {
      // Get userId from context
      const userId = extractUserId(executionContext);

      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const supabase = createServiceRoleClient();

      // Single RPC call gets everything
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: analysis, error } = await (supabase.rpc as any)('analyze_loadout', {
        p_loadout_id: input.loadoutId,
        p_user_id: userId,
      });

      if (error) {
        return { success: false, error: `Database error: ${error.message}` };
      }

      if (!analysis || analysis.error) {
        return { success: false, error: analysis?.error || 'Loadout not found' };
      }

      // Parse the RPC result
      const loadoutMeta = analysis.loadout as Record<string, unknown>;
      const items = (analysis.items || []) as Array<Record<string, unknown>>;
      const categoryBreakdown = (analysis.categoryBreakdown || []) as Array<Record<string, unknown>>;

      const totalWeight = (analysis.totalWeight as number) || 0;
      const wornWeight = (analysis.wornWeight as number) || 0;
      const consumableWeight = (analysis.consumableWeight as number) || 0;
      const baseWeight = totalWeight - wornWeight - consumableWeight;

      // Classify weight
      const activityTypes = (loadoutMeta?.activityTypes as string[]) || [];
      const primaryActivity = activityTypes[0] || 'backpacking';
      const benchmarks = WEIGHT_BENCHMARKS[primaryActivity] || WEIGHT_BENCHMARKS.backpacking;

      let classification: string;
      let benchmarkComparison: string | undefined;

      if (baseWeight <= benchmarks.ultralight) {
        classification = 'ultralight';
        benchmarkComparison = `Base weight is ultralight for ${primaryActivity} (under ${fmtWeight(benchmarks.ultralight)})`;
      } else if (baseWeight <= benchmarks.lightweight) {
        classification = 'lightweight';
        benchmarkComparison = `Base weight is lightweight for ${primaryActivity} (${fmtWeight(benchmarks.ultralight)}-${fmtWeight(benchmarks.lightweight)})`;
      } else if (baseWeight <= benchmarks.standard) {
        classification = 'standard';
        benchmarkComparison = `Base weight is standard for ${primaryActivity} (${fmtWeight(benchmarks.lightweight)}-${fmtWeight(benchmarks.standard)})`;
      } else {
        classification = 'heavy';
        benchmarkComparison = `Base weight exceeds typical range for ${primaryActivity} (over ${fmtWeight(benchmarks.standard)})`;
      }

      // Identify Big 3
      const big3 = identifyBig3(items);

      // Find missing essentials
      const presentCategories = items
        .map(item => (item.parent_category_slug || item.category_slug || '') as string)
        .filter(Boolean);

      const essentialCats = ESSENTIAL_CATEGORIES[primaryActivity] || ESSENTIAL_CATEGORIES.backpacking;
      const missingEssentials = essentialCats
        .filter(cat => !presentCategories.some(pc => pc.includes(cat)))
        .map(cat => ({
          category: cat,
          why: `Essential for ${primaryActivity}`,
        }));

      // Format category breakdown
      const formattedCategories = categoryBreakdown.map(cat => ({
        category: (cat.category as string) || 'Uncategorized',
        weight: (cat.total_weight as number) || 0,
        percentage: totalWeight > 0 ? Math.round(((cat.total_weight as number) / totalWeight) * 100) : 0,
        itemCount: (cat.item_count as number) || 0,
      }));

      // Format heaviest items
      const heaviestItems = items
        .filter(item => item.weight_grams && (item.weight_grams as number) > 0)
        .sort((a, b) => ((b.weight_grams as number) * (b.quantity as number)) - ((a.weight_grams as number) * (a.quantity as number)))
        .slice(0, 8)
        .map(item => ({
          name: item.name as string,
          weight: (item.weight_grams as number) * (item.quantity as number),
          category: (item.parent_category_name || item.category_name || null) as string | null,
          potentialSavings: undefined as string | undefined,
        }));

      // Format items list
      const formattedItems = items.map(item => ({
        name: item.name as string,
        brand: (item.brand || null) as string | null,
        weight: (item.weight_grams as number) || 0,
        category: (item.parent_category_name || item.category_name || null) as string | null,
        quantity: (item.quantity as number) || 1,
        isWorn: (item.is_worn as boolean) || false,
        isConsumable: (item.is_consumable as boolean) || false,
      }));

      const execTime = Date.now() - startTime;
      console.log(`[analyzeLoadout] Complete in ${execTime}ms: ${items.length} items, ${fmtWeight(totalWeight)}`);

      return {
        success: true,
        loadout: {
          name: (loadoutMeta?.name as string) || 'Unknown',
          description: (loadoutMeta?.description as string | null) || null,
          activityTypes,
          seasons: (loadoutMeta?.seasons as string[]) || [],
        },
        weight: {
          total: totalWeight,
          base: baseWeight,
          worn: wornWeight,
          consumable: consumableWeight,
          formatted: `Total: ${fmtWeight(totalWeight)} (Base: ${fmtWeight(baseWeight)}, Worn: ${fmtWeight(wornWeight)}, Consumable: ${fmtWeight(consumableWeight)})`,
          classification,
          benchmarkComparison,
        },
        big3,
        categoryBreakdown: formattedCategories,
        items: formattedItems,
        missingEssentials,
        heaviestItems,
        itemCount: items.length,
      };
    } catch (error) {
      console.error('[analyzeLoadout] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// =============================================================================
// Helpers
// =============================================================================

function identifyBig3(items: Array<Record<string, unknown>>) {
  const findBig3Item = (patterns: string[]) => {
    const matching = items.filter(item => {
      const catSlug = ((item.parent_category_slug || item.category_slug || '') as string).toLowerCase();
      return patterns.some(p => catSlug.includes(p));
    });
    if (matching.length === 0) return null;
    // Return heaviest matching item (likely the main item)
    const heaviest = matching.sort((a, b) =>
      ((b.weight_grams as number) || 0) - ((a.weight_grams as number) || 0)
    )[0];
    return {
      name: heaviest.name as string,
      weight: ((heaviest.weight_grams as number) || 0) * ((heaviest.quantity as number) || 1),
    };
  };

  const shelter = findBig3Item(BIG3_PATTERNS.shelter);
  const sleepSystem = findBig3Item(BIG3_PATTERNS.sleepSystem);
  const pack = findBig3Item(BIG3_PATTERNS.pack);

  const totalBig3 = (shelter?.weight || 0) + (sleepSystem?.weight || 0) + (pack?.weight || 0);
  const totalWeight = items.reduce((sum, item) =>
    sum + ((item.weight_grams as number) || 0) * ((item.quantity as number) || 1), 0);

  return {
    shelter,
    sleepSystem,
    pack,
    totalWeight: totalBig3,
    percentage: totalWeight > 0 ? Math.round((totalBig3 / totalWeight) * 100) : 0,
  };
}

// fmtWeight is now imported from utils.ts
