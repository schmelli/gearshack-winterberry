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
import { getFromCache, setCache, generateGearGraphCacheKey } from '@/lib/supabase/cache';
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
const GEARGRAPH_QUERY_URL = 'https://geargraph.gearshack.app/api/query';

// =============================================================================
// GearGraph Cypher API Types
// =============================================================================

interface CypherInsightResult {
  'i.summary': string;
  'i.content': string;
  'g.name'?: string;
  'g.category'?: string;
}

interface CypherQueryResponse {
  results: CypherInsightResult[];
  count: number;
}

// =============================================================================
// GearGraph Cypher Query Integration
// =============================================================================

/**
 * Execute a Cypher query against the GearGraph API
 */
async function executeCypher(
  query: string,
  parameters: Record<string, string | number>,
  apiKey: string
): Promise<CypherInsightResult[]> {
  try {
    const response = await fetch(GEARGRAPH_QUERY_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, parameters }),
    });

    if (!response.ok) {
      console.error('[GearGraph] Cypher error:', response.status, response.statusText);
      return [];
    }

    const result: CypherQueryResponse = await response.json();
    return result.results || [];
  } catch (error) {
    console.error('[GearGraph] Cypher fetch error:', error);
    return [];
  }
}

/**
 * Get insights for a specific gear item by name search
 */
async function getInsightsForProduct(
  searchTerm: string,
  apiKey: string,
  limit = 5
): Promise<GearInsight[]> {
  const query = `
    MATCH (g:GearItem)-[:HAS_TIP]->(i:Insight)
    WHERE toLower(g.name) CONTAINS toLower($search)
       OR toLower(g.brand) CONTAINS toLower($search)
    RETURN g.name, i.summary, i.content
    LIMIT $limit
  `;

  const results = await executeCypher(query, { search: searchTerm, limit }, apiKey);

  return results.map((r) => ({
    type: 'tip' as InsightType,
    content: r['i.content'] || r['i.summary'],
    confidence: 0.9,
  }));
}

/**
 * Get insights for a specific brand
 */
async function getInsightsForBrand(
  brand: string,
  apiKey: string,
  limit = 5
): Promise<GearInsight[]> {
  const query = `
    MATCH (g:GearItem)-[:HAS_TIP]->(i:Insight)
    WHERE toLower(g.brand) = toLower($brand)
    RETURN DISTINCT i.summary, i.content
    LIMIT $limit
  `;

  const results = await executeCypher(query, { brand, limit }, apiKey);

  return results.map((r) => ({
    type: 'tip' as InsightType,
    content: r['i.content'] || r['i.summary'],
    confidence: 0.8,
  }));
}

/**
 * Get insights for a category (broader context)
 */
async function getInsightsForCategory(
  category: string,
  apiKey: string,
  limit = 5
): Promise<GearInsight[]> {
  const query = `
    MATCH (g:GearItem)-[:HAS_TIP]->(i:Insight)
    WHERE g.category = $category
    RETURN DISTINCT i.summary, i.content
    LIMIT $limit
  `;

  const results = await executeCypher(query, { category, limit }, apiKey);

  return results.map((r) => ({
    type: 'tip' as InsightType,
    content: r['i.content'] || r['i.summary'],
    confidence: 0.7,
  }));
}

/**
 * Fetch insights from the GearGraph Cypher API
 * Searches with intelligent fallback: product → brand → category
 */
async function fetchGearGraphInsights(params: {
  productTypeId?: string;
  categoryId?: string;
  brand?: string;
  name?: string;
}): Promise<GearInsight[]> {
  const apiKey = process.env.GEARGRAPH_API_KEY;

  if (!apiKey) {
    console.warn('[GearGraph] Missing GEARGRAPH_API_KEY');
    return [];
  }

  const allInsights: GearInsight[] = [];

  // 1. Search for specific product insights (highest priority)
  const searchTerms = [params.brand, params.name].filter(Boolean);
  if (searchTerms.length > 0) {
    // Try full search first (brand + name)
    const fullSearch = searchTerms.join(' ');
    const productInsights = await getInsightsForProduct(fullSearch, apiKey, 5);
    allInsights.push(...productInsights);

    // If no results, try just the name
    if (productInsights.length === 0 && params.name) {
      const nameInsights = await getInsightsForProduct(params.name, apiKey, 5);
      allInsights.push(...nameInsights);
    }
  }

  // 2. Try brand-specific insights if we don't have enough
  if (allInsights.length < 3 && params.brand) {
    const brandInsights = await getInsightsForBrand(params.brand, apiKey, 5);
    allInsights.push(...brandInsights);
  }

  // 3. Try category insights as last resort
  if (allInsights.length < 3 && params.categoryId) {
    // Map our category IDs to GearGraph categories
    const categoryMap: Record<string, string> = {
      shelter: 'tent',
      sleep_system: 'sleeping_bag',
      clothing: 'clothing',
      kitchen: 'cookware',
      electronics: 'accessories',
      hygiene: 'accessories',
      tools: 'accessories',
      hydration: 'water_filter',
    };

    const gearGraphCategory = categoryMap[params.categoryId] || params.categoryId;

    const categoryInsights = await getInsightsForCategory(gearGraphCategory, apiKey, 5);
    allInsights.push(...categoryInsights);
  }

  // Deduplicate by content
  const seen = new Set<string>();
  const uniqueInsights = allInsights.filter((insight) => {
    const key = insight.content.toLowerCase().trim().slice(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueInsights.slice(0, 6);
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

    // T045: Generate cache key using dedicated function (prevents collisions)
    const cacheKey = await generateGearGraphCacheKey({
      productTypeId,
      categoryId,
      brand,
      name,
    });
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
