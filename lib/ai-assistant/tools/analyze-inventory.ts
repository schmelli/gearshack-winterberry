/**
 * Analyze Inventory Tool
 * Feature 050: AI Assistant - Phase 3
 *
 * Deep inventory insights for weight, price, and optimization analysis.
 * Leverages existing calculateBaseWeight() and extends with additional analysis types.
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  calculateBaseWeight,
  getPriceStatistics,
  formatWeight,
  type CategoryBreakdown,
} from '../inventory-analyzer';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const analyzeInventoryParametersSchema = z.object({
  userId: z.string().uuid().describe('User UUID to analyze inventory for'),
  analysisType: z
    .enum(['base_weight', 'category_breakdown', 'price_analysis'])
    .describe('Type of analysis to perform'),
  filters: z
    .object({
      categoryId: z.string().optional().describe('Filter to specific category'),
      status: z
        .enum(['own', 'wishlist'])
        .optional()
        .describe('Filter by item status'),
      brand: z.string().optional().describe('Filter by brand name (case-insensitive)'),
    })
    .optional()
    .describe('Optional filters to narrow analysis scope'),
});

export type AnalyzeInventoryParameters = z.infer<typeof analyzeInventoryParametersSchema>;

// =============================================================================
// Tool Definition
// =============================================================================

export const analyzeInventoryTool = {
  description:
    'Analyze user inventory for base weight, category breakdown, or price analysis with optional filtering',
  parameters: analyzeInventoryParametersSchema,
};

// =============================================================================
// Result Types
// =============================================================================

export interface BaseWeightResult {
  totalWeightGrams: number;
  totalWeightFormatted: string;
  itemCount: number;
  categoryBreakdowns: CategoryBreakdown[];
  heaviestCategory: {
    name: string;
    weightGrams: number;
    weightFormatted: string;
  } | null;
  lightestCategory: {
    name: string;
    weightGrams: number;
    weightFormatted: string;
  } | null;
}

export interface CategoryBreakdownResult {
  categories: Array<{
    categoryId: string;
    categoryName: string;
    itemCount: number;
    totalWeightGrams: number;
    totalWeightFormatted: string;
    averageWeightGrams: number;
    percentageOfTotal: number;
    heaviestItem: {
      id: string;
      name: string;
      weight: number; // weight in grams (matches CategoryBreakdown from inventory-analyzer)
    } | null;
  }>;
  totalItems: number;
  totalWeightGrams: number;
}

export interface PriceAnalysisResult {
  totalSpent: number;
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  currency: string;
  itemCount: number;
  categorySpending: Array<{
    categoryName: string;
    totalSpent: number;
    itemCount: number;
    averagePrice: number;
  }>;
}

export interface AnalyzeInventoryResponse {
  success: boolean;
  analysisType: string;
  userId: string;
  data: BaseWeightResult | CategoryBreakdownResult | PriceAnalysisResult | null;
  error?: string;
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute inventory analysis based on analysis type
 *
 * @param params - Analysis parameters including userId, analysisType, and filters
 * @returns AnalyzeInventoryResponse with analysis results
 */
export async function executeAnalyzeInventory(
  params: AnalyzeInventoryParameters
): Promise<AnalyzeInventoryResponse> {
  const { userId, analysisType, filters } = params;

  try {
    switch (analysisType) {
      case 'base_weight':
        return await analyzeBaseWeight(userId, filters);

      case 'category_breakdown':
        return await analyzeCategoryBreakdown(userId, filters);

      case 'price_analysis':
        return await analyzePrices(userId, filters);

      default:
        return {
          success: false,
          analysisType,
          userId,
          data: null,
          error: `Unknown analysis type: ${analysisType}`,
        };
    }
  } catch (error) {
    console.error('[analyzeInventory] Unexpected error:', error);
    return {
      success: false,
      analysisType,
      userId,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// =============================================================================
// Analysis Functions
// =============================================================================

async function analyzeBaseWeight(
  userId: string,
  filters?: AnalyzeInventoryParameters['filters']
): Promise<AnalyzeInventoryResponse> {
  const analysis = await calculateBaseWeight(userId, filters);

  // Apply category filter if specified
  let filteredBreakdowns = analysis.categoryBreakdowns;
  if (filters?.categoryId) {
    filteredBreakdowns = filteredBreakdowns.filter(
      (cat) => cat.categoryId === filters.categoryId
    );
  }

  const totalWeight = filteredBreakdowns.reduce((sum, cat) => sum + cat.totalWeight, 0);
  const sortedByWeight = [...filteredBreakdowns].sort(
    (a, b) => b.totalWeight - a.totalWeight
  );
  const heaviest = sortedByWeight[0];
  const lightest = sortedByWeight[sortedByWeight.length - 1];

  const data: BaseWeightResult = {
    totalWeightGrams: totalWeight,
    totalWeightFormatted: formatWeight(totalWeight),
    itemCount: filteredBreakdowns.reduce((sum, cat) => sum + cat.itemCount, 0),
    categoryBreakdowns: filteredBreakdowns,
    heaviestCategory: heaviest
      ? {
          name: heaviest.categoryName,
          weightGrams: heaviest.totalWeight,
          weightFormatted: formatWeight(heaviest.totalWeight),
        }
      : null,
    lightestCategory:
      lightest && lightest !== heaviest
        ? {
            name: lightest.categoryName,
            weightGrams: lightest.totalWeight,
            weightFormatted: formatWeight(lightest.totalWeight),
          }
        : null,
  };

  return {
    success: true,
    analysisType: 'base_weight',
    userId,
    data,
  };
}

async function analyzeCategoryBreakdown(
  userId: string,
  filters?: AnalyzeInventoryParameters['filters']
): Promise<AnalyzeInventoryResponse> {
  const analysis = await calculateBaseWeight(userId, filters);

  // Apply category filter if specified
  let filteredBreakdowns = analysis.categoryBreakdowns;
  if (filters?.categoryId) {
    filteredBreakdowns = filteredBreakdowns.filter(
      (cat) => cat.categoryId === filters.categoryId
    );
  }

  const totalWeight = filteredBreakdowns.reduce((sum, cat) => sum + cat.totalWeight, 0);
  const totalItems = filteredBreakdowns.reduce((sum, cat) => sum + cat.itemCount, 0);

  const data: CategoryBreakdownResult = {
    categories: filteredBreakdowns.map((cat) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      itemCount: cat.itemCount,
      totalWeightGrams: cat.totalWeight,
      totalWeightFormatted: formatWeight(cat.totalWeight),
      averageWeightGrams: cat.averageWeight,
      percentageOfTotal: totalWeight > 0 ? (cat.totalWeight / totalWeight) * 100 : 0,
      heaviestItem: cat.heaviestItem,
    })),
    totalItems,
    totalWeightGrams: totalWeight,
  };

  return {
    success: true,
    analysisType: 'category_breakdown',
    userId,
    data,
  };
}

async function analyzePrices(
  userId: string,
  filters?: AnalyzeInventoryParameters['filters']
): Promise<AnalyzeInventoryResponse> {
  const supabase = await createClient();

  // Build query for price analysis with category breakdown
  let query = supabase
    .from('gear_items')
    .select(
      'id, name, price_paid, currency, category_id, categories(id, label, i18n)'
    )
    .eq('user_id', userId)
    .not('price_paid', 'is', null);

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.brand) {
    query = query.ilike('brand', filters.brand);
  }

  const { data: gearItems, error } = await query;

  if (error) {
    return {
      success: false,
      analysisType: 'price_analysis',
      userId,
      data: null,
      error: `Database query failed: ${error.message}`,
    };
  }

  if (!gearItems || gearItems.length === 0) {
    return {
      success: true,
      analysisType: 'price_analysis',
      userId,
      data: {
        totalSpent: 0,
        averagePrice: 0,
        highestPrice: 0,
        lowestPrice: 0,
        currency: 'USD',
        itemCount: 0,
        categorySpending: [],
      },
    };
  }

  // Calculate overall statistics
  const prices = gearItems.map((item) => item.price_paid || 0);
  const totalSpent = prices.reduce((sum, price) => sum + price, 0);
  const averagePrice = totalSpent / prices.length;
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);
  const currency = gearItems[0]?.currency || 'USD';

  // Calculate category spending
  const categoryMap = new Map<
    string,
    { name: string; spent: number; count: number }
  >();

  for (const item of gearItems) {
    const catId = item.category_id || 'uncategorized';
    const category = (item as Record<string, unknown>).categories as {
      label: string;
      i18n?: Record<string, string>;
    } | null;
    const catName = category?.i18n?.en ?? category?.label ?? 'Uncategorized';

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { name: catName, spent: 0, count: 0 });
    }
    const cat = categoryMap.get(catId)!;
    cat.spent += item.price_paid || 0;
    cat.count += 1;
  }

  const categorySpending = Array.from(categoryMap.values())
    .map((cat) => ({
      categoryName: cat.name,
      totalSpent: cat.spent,
      itemCount: cat.count,
      averagePrice: cat.count > 0 ? cat.spent / cat.count : 0,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const data: PriceAnalysisResult = {
    totalSpent,
    averagePrice,
    highestPrice,
    lowestPrice,
    currency,
    itemCount: gearItems.length,
    categorySpending,
  };

  return {
    success: true,
    analysisType: 'price_analysis',
    userId,
    data,
  };
}
