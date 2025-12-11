/**
 * GearGraph Insights API Route
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T044-T050
 *
 * Fetches intelligent insights about a gear item from the GearGraph knowledge base.
 * Returns seasonality, compatibility, weight class, and use case information.
 * Results are cached in the database for 7 days.
 *
 * GET /api/geargraph/insights?productTypeId=freestanding-tent&categoryId=shelter
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getFromCache, setCache, generateCacheKey } from '@/lib/supabase/cache';
import type { GearInsightsResponse, GearInsight, InsightType } from '@/types/geargraph';

// =============================================================================
// Zod Schemas (from contracts/geargraph-insights.md)
// =============================================================================

const gearInsightsParamsSchema = z
  .object({
    productTypeId: z.string().optional(),
    categoryId: z.string().optional(),
    brand: z.string().max(100).optional(),
    name: z.string().max(200).optional(),
  })
  .refine(
    (data) => data.productTypeId || data.categoryId || (data.brand && data.name),
    { message: 'At least one identifier required' }
  );

// =============================================================================
// Constants
// =============================================================================

const CACHE_TTL_DAYS = 7;

// =============================================================================
// Mock GearGraph Data (for development)
// =============================================================================

// In production, this would call an actual GearGraph API
// For now, we return mock data based on category/product type
const MOCK_INSIGHTS: Record<string, GearInsight[]> = {
  shelter: [
    { type: 'seasonality' as InsightType, label: '3-Season', confidence: 0.9 },
    { type: 'category' as InsightType, label: 'Backpacking', confidence: 0.95 },
    { type: 'use_case' as InsightType, label: 'Solo & Duo Camping', confidence: 0.85 },
  ],
  sleep_system: [
    { type: 'seasonality' as InsightType, label: 'Summer', confidence: 0.88 },
    { type: 'weight_class' as InsightType, label: 'Ultralight', confidence: 0.82 },
    { type: 'category' as InsightType, label: 'Backpacking', confidence: 0.9 },
  ],
  clothing: [
    { type: 'seasonality' as InsightType, label: 'Multi-Season', confidence: 0.85 },
    { type: 'category' as InsightType, label: 'Technical Apparel', confidence: 0.88 },
  ],
  kitchen: [
    { type: 'use_case' as InsightType, label: 'Hot Meals', confidence: 0.9 },
    { type: 'weight_class' as InsightType, label: 'Lightweight', confidence: 0.75 },
  ],
  electronics: [
    { type: 'use_case' as InsightType, label: 'Navigation', confidence: 0.85 },
    { type: 'use_case' as InsightType, label: 'Safety', confidence: 0.8 },
  ],
  hygiene: [
    { type: 'category' as InsightType, label: 'Personal Care', confidence: 0.95 },
  ],
  tools: [
    { type: 'use_case' as InsightType, label: 'Camp Tasks', confidence: 0.9 },
    { type: 'compatibility' as InsightType, label: 'Multi-purpose', confidence: 0.85 },
  ],
};

/**
 * Mock function to simulate GearGraph API call
 * In production, replace with actual API integration
 */
async function fetchGearGraphInsights(params: {
  productTypeId?: string;
  categoryId?: string;
  brand?: string;
  name?: string;
}): Promise<GearInsight[]> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return insights based on category if available
  if (params.categoryId && MOCK_INSIGHTS[params.categoryId]) {
    return MOCK_INSIGHTS[params.categoryId];
  }

  // Return generic insights for unknown products
  if (params.brand && params.name) {
    return [
      { type: 'category' as InsightType, label: 'Outdoor Gear', confidence: 0.7 },
    ];
  }

  return [];
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      productTypeId: searchParams.get('productTypeId') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      brand: searchParams.get('brand') ?? undefined,
      name: searchParams.get('name') ?? undefined,
    };

    // T048, T049: Validate request params with Zod
    const parseResult = gearInsightsParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      // T049: Handle missing parameters with 400 error
      return NextResponse.json(
        {
          error: 'MISSING_PARAMS',
          message: 'At least one of productTypeId, categoryId, or brand+name is required',
        },
        { status: 400 }
      );
    }

    const { productTypeId, categoryId, brand, name } = parseResult.data;

    // T045: Generate cache key and check cache
    const cacheKey = await generateCacheKey(
      `${productTypeId ?? ''}|${categoryId ?? ''}|${brand ?? ''}|${name ?? ''}`
    );
    const cached = await getFromCache<GearInsightsResponse>('geargraph', cacheKey);

    if (cached) {
      // Return cached response
      return NextResponse.json({
        ...cached.data,
        cached: true,
        expiresAt: cached.expiresAt,
      });
    }

    // T046: Call GearGraph API (mock for now)
    let insights: GearInsight[] = [];
    try {
      insights = await fetchGearGraphInsights({
        productTypeId,
        categoryId,
        brand,
        name,
      });
    } catch (apiError) {
      // T050: Handle GearGraph unavailable gracefully - return 200 with empty insights
      console.error('GearGraph API error:', apiError);
      insights = [];
    }

    const responseData: GearInsightsResponse = {
      insights,
      productTypeId: productTypeId ?? null,
      cached: false,
      expiresAt: '', // Will be set by cache
    };

    // T047: Store response in cache with 7-day TTL
    const cacheEntry = await setCache('geargraph', cacheKey, responseData, CACHE_TTL_DAYS);

    return NextResponse.json({
      ...responseData,
      cached: false,
      expiresAt: cacheEntry.expiresAt,
    });
  } catch (error) {
    console.error('GearGraph insights error:', error);
    // T050: Return 200 with empty insights on error (graceful degradation)
    return NextResponse.json({
      insights: [],
      productTypeId: null,
      cached: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
}
