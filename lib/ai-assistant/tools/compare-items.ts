/**
 * Compare Items Tool
 * Feature 050: AI Assistant - Phase 3
 *
 * Detailed side-by-side comparison of 2-4 gear items.
 * Queries gear_items and/or catalog_products tables.
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { formatWeight } from '../inventory-analyzer';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const compareItemsParametersSchema = z.object({
  itemIds: z
    .array(z.string().uuid())
    .min(2)
    .max(4)
    .describe('Array of 2-4 item UUIDs to compare'),
  comparisonFields: z
    .array(z.enum(['weight', 'price', 'specs']))
    .default(['weight', 'price'])
    .describe('Fields to compare between items'),
});

export type CompareItemsParameters = z.infer<typeof compareItemsParametersSchema>;

// =============================================================================
// Tool Definition
// =============================================================================

export const compareItemsTool = {
  description:
    'Detailed side-by-side comparison of 2-4 gear items including weight, price, and specifications',
  parameters: compareItemsParametersSchema,
};

// =============================================================================
// Result Types
// =============================================================================

export interface ComparisonItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  source: 'inventory' | 'catalog';
  // Weight data
  weightGrams: number | null;
  weightFormatted: string | null;
  // Price data
  price: number | null;
  currency: string | null;
  // Specs (if requested)
  specs: Record<string, string | number | null> | null;
}

export interface ComparisonMetric {
  field: string;
  winner: string | null; // Item ID with best value
  winnerValue: string | number | null;
  analysis: string; // Human-readable comparison
}

export interface CompareItemsResponse {
  success: boolean;
  items: ComparisonItem[];
  metrics: ComparisonMetric[];
  summary: string;
  error?: string;
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute item comparison
 *
 * @param params - Comparison parameters including itemIds and comparisonFields
 * @returns CompareItemsResponse with comparison data and analysis
 */
export async function executeCompareItems(
  params: CompareItemsParameters
): Promise<CompareItemsResponse> {
  const { itemIds, comparisonFields } = params;

  try {
    const supabase = await createClient();
    const items: ComparisonItem[] = [];

    // First try to find items in user's inventory
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('gear_items')
      .select(
        `
        id,
        name,
        brand,
        weight_grams,
        price_paid,
        currency,
        primary_image_url,
        category_id,
        categories(label, i18n)
      `
      )
      .in('id', itemIds);

    if (inventoryError) {
      console.error('[compareItems] Inventory query error:', inventoryError);
    }

    // Map inventory items
    const foundIds = new Set<string>();
    for (const item of inventoryItems || []) {
      foundIds.add(item.id);
      const category = (item as Record<string, unknown>).categories as {
        label: string;
        i18n?: Record<string, string>;
      } | null;

      items.push({
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: category?.i18n?.en ?? category?.label ?? null,
        imageUrl: item.primary_image_url,
        source: 'inventory',
        weightGrams: item.weight_grams,
        weightFormatted: item.weight_grams ? formatWeight(item.weight_grams) : null,
        price: item.price_paid,
        currency: item.currency,
        specs: null, // Will be populated if specs requested
      });
    }

    // Check catalog for remaining IDs
    const remainingIds = itemIds.filter((id) => !foundIds.has(id));
    if (remainingIds.length > 0) {
      // Note: catalog_products doesn't have primary_image_url column
      const { data: catalogItems, error: catalogError } = await supabase
        .from('catalog_products')
        .select(
          `
          id,
          name,
          weight_grams,
          price_usd,
          category_main,
          catalog_brands!catalog_products_brand_id_fkey(name)
        `
        )
        .in('id', remainingIds);

      if (catalogError) {
        console.error('[compareItems] Catalog query error:', catalogError);
      }

      for (const item of catalogItems || []) {
        foundIds.add(item.id);
        const brandData = item.catalog_brands as { name: string } | null;

        items.push({
          id: item.id,
          name: item.name,
          brand: brandData?.name ?? null,
          category: item.category_main,
          imageUrl: null, // catalog_products doesn't have image column
          source: 'catalog',
          weightGrams: item.weight_grams,
          weightFormatted: item.weight_grams ? formatWeight(item.weight_grams) : null,
          price: item.price_usd,
          currency: 'USD',
          specs: null,
        });
      }
    }

    // Check if we found all items
    if (items.length < 2) {
      return {
        success: false,
        items: [],
        metrics: [],
        summary: '',
        error: `Could not find enough items to compare. Found ${items.length} of ${itemIds.length} requested items.`,
      };
    }

    // Calculate comparison metrics
    const metrics: ComparisonMetric[] = [];

    // Weight comparison
    if (comparisonFields.includes('weight')) {
      const itemsWithWeight = items.filter((item) => item.weightGrams !== null);
      if (itemsWithWeight.length >= 2) {
        const lightest = itemsWithWeight.reduce((min, item) =>
          (item.weightGrams || Infinity) < (min.weightGrams || Infinity) ? item : min
        );
        const heaviest = itemsWithWeight.reduce((max, item) =>
          (item.weightGrams || 0) > (max.weightGrams || 0) ? item : max
        );

        const weightDiffGrams = (heaviest.weightGrams || 0) - (lightest.weightGrams || 0);
        const weightDiffPercent =
          heaviest.weightGrams && lightest.weightGrams
            ? ((weightDiffGrams / heaviest.weightGrams) * 100).toFixed(0)
            : '0';

        metrics.push({
          field: 'weight',
          winner: lightest.id,
          winnerValue: lightest.weightFormatted,
          analysis: `${lightest.brand || ''} ${lightest.name} is the lightest at ${lightest.weightFormatted}. It's ${formatWeight(weightDiffGrams)} (${weightDiffPercent}%) lighter than ${heaviest.brand || ''} ${heaviest.name}.`,
        });
      }
    }

    // Price comparison
    if (comparisonFields.includes('price')) {
      const itemsWithPrice = items.filter((item) => item.price !== null);
      if (itemsWithPrice.length >= 2) {
        const cheapest = itemsWithPrice.reduce((min, item) =>
          (item.price || Infinity) < (min.price || Infinity) ? item : min
        );
        const mostExpensive = itemsWithPrice.reduce((max, item) =>
          (item.price || 0) > (max.price || 0) ? item : max
        );

        const priceDiff = (mostExpensive.price || 0) - (cheapest.price || 0);
        const priceDiffPercent =
          mostExpensive.price && cheapest.price
            ? ((priceDiff / mostExpensive.price) * 100).toFixed(0)
            : '0';

        metrics.push({
          field: 'price',
          winner: cheapest.id,
          winnerValue: `${cheapest.currency || '$'}${cheapest.price}`,
          analysis: `${cheapest.brand || ''} ${cheapest.name} is the most affordable at ${cheapest.currency || '$'}${cheapest.price}. It's ${cheapest.currency || '$'}${priceDiff.toFixed(2)} (${priceDiffPercent}%) cheaper than ${mostExpensive.brand || ''} ${mostExpensive.name}.`,
        });
      }
    }

    // Value comparison (weight per dollar)
    if (
      comparisonFields.includes('weight') &&
      comparisonFields.includes('price')
    ) {
      const itemsWithBoth = items.filter(
        (item) => item.weightGrams !== null && item.price !== null && item.price > 0
      );
      if (itemsWithBoth.length >= 2) {
        // Calculate grams per dollar (lower is better - paying less for less weight)
        const itemsWithValue = itemsWithBoth.map((item) => ({
          ...item,
          valueRatio: (item.price || 1) / (item.weightGrams || 1), // $/g
        }));

        const bestValue = itemsWithValue.reduce((best, item) =>
          item.valueRatio < best.valueRatio ? item : best
        );

        metrics.push({
          field: 'value',
          winner: bestValue.id,
          winnerValue: `$${bestValue.valueRatio.toFixed(3)}/g`,
          analysis: `${bestValue.brand || ''} ${bestValue.name} offers the best value at $${bestValue.valueRatio.toFixed(3)} per gram.`,
        });
      }
    }

    // Generate summary
    const summary = generateComparisonSummary(items, metrics);

    return {
      success: true,
      items,
      metrics,
      summary,
    };
  } catch (error) {
    console.error('[compareItems] Unexpected error:', error);
    return {
      success: false,
      items: [],
      metrics: [],
      summary: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateComparisonSummary(
  items: ComparisonItem[],
  metrics: ComparisonMetric[]
): string {
  const itemNames = items
    .map((item) => `${item.brand || ''} ${item.name}`.trim())
    .join(', ');

  const summaryParts = [`Comparing ${items.length} items: ${itemNames}.`];

  // Add metric winners
  for (const metric of metrics) {
    if (metric.winner) {
      const winner = items.find((item) => item.id === metric.winner);
      if (winner) {
        summaryParts.push(
          `Best ${metric.field}: ${winner.brand || ''} ${winner.name} (${metric.winnerValue}).`
        );
      }
    }
  }

  return summaryParts.join(' ');
}
