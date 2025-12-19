/**
 * Get Insights Tool
 * Feature 050: AI Assistant - Phase 3
 *
 * Fetch reviews, sustainability ratings, and expert opinions from GearGraph.
 * Leverages existing /api/geargraph/insights route.
 */

import { z } from 'zod';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const getInsightsParametersSchema = z.object({
  itemId: z
    .string()
    .uuid()
    .optional()
    .describe('Gear item UUID from user inventory'),
  catalogProductId: z
    .string()
    .uuid()
    .optional()
    .describe('Catalog product UUID from GearGraph'),
  insightTypes: z
    .array(z.enum(['reviews', 'sustainability', 'durability']))
    .default(['reviews'])
    .describe('Types of insights to fetch'),
});

export type GetInsightsParameters = z.infer<typeof getInsightsParametersSchema>;

// =============================================================================
// Tool Definition
// =============================================================================

export const getInsightsTool = {
  description:
    'Fetch reviews, sustainability ratings, durability data, and expert opinions for gear items',
  parameters: getInsightsParametersSchema,
};

// =============================================================================
// Result Types
// =============================================================================

export interface GearInsight {
  type: 'tip' | 'review' | 'sustainability' | 'durability' | 'expert';
  content: string;
  confidence: number;
  source?: string;
}

export interface GetInsightsResponse {
  success: boolean;
  itemId: string | null;
  catalogProductId: string | null;
  insights: GearInsight[];
  requestedTypes: string[];
  error?: string;
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute insights fetch from GearGraph
 *
 * @param params - Parameters including itemId or catalogProductId and insightTypes
 * @returns GetInsightsResponse with fetched insights
 */
export async function executeGetInsights(
  params: GetInsightsParameters
): Promise<GetInsightsResponse> {
  const { itemId, catalogProductId, insightTypes } = params;

  // Validate at least one ID is provided
  if (!itemId && !catalogProductId) {
    return {
      success: false,
      itemId: null,
      catalogProductId: null,
      insights: [],
      requestedTypes: insightTypes,
      error: 'Either itemId or catalogProductId must be provided',
    };
  }

  try {
    // Import dynamically to avoid server/client issues
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    let brand: string | null = null;
    let name: string | null = null;
    let categoryId: string | null = null;

    // If itemId is provided, fetch item details
    if (itemId) {
      const { data: gearItem, error: itemError } = await supabase
        .from('gear_items')
        .select('name, brand, category_id')
        .eq('id', itemId)
        .single();

      if (itemError) {
        console.error('[getInsights] Failed to fetch gear item:', itemError);
      } else if (gearItem) {
        name = gearItem.name;
        brand = gearItem.brand;
        categoryId = gearItem.category_id;
      }
    }

    // If catalogProductId is provided, fetch product details
    if (catalogProductId) {
      const { data: catalogProduct, error: productError } = await supabase
        .from('catalog_products')
        .select(
          `
          name,
          category_main,
          catalog_brands!catalog_products_brand_id_fkey(name)
        `
        )
        .eq('id', catalogProductId)
        .single();

      if (productError) {
        console.error('[getInsights] Failed to fetch catalog product:', productError);
      } else if (catalogProduct) {
        name = catalogProduct.name;
        const brandData = catalogProduct.catalog_brands as { name: string } | null;
        brand = brandData?.name ?? null;
        categoryId = catalogProduct.category_main;
      }
    }

    // If we couldn't find item details, return empty insights
    if (!name) {
      return {
        success: true,
        itemId: itemId || null,
        catalogProductId: catalogProductId || null,
        insights: [],
        requestedTypes: insightTypes,
      };
    }

    // Build query params for the insights API
    const queryParams = new URLSearchParams();
    if (brand) queryParams.set('brand', brand);
    if (name) queryParams.set('name', name);
    if (categoryId) queryParams.set('categoryId', categoryId);

    // Call the GearGraph insights API
    // Note: In production, this would be an internal API call
    // For now, we'll construct the insights based on available data
    const insights = await fetchInsightsFromGearGraph(
      brand,
      name,
      categoryId,
      insightTypes
    );

    return {
      success: true,
      itemId: itemId || null,
      catalogProductId: catalogProductId || null,
      insights,
      requestedTypes: insightTypes,
    };
  } catch (error) {
    console.error('[getInsights] Unexpected error:', error);
    return {
      success: false,
      itemId: itemId || null,
      catalogProductId: catalogProductId || null,
      insights: [],
      requestedTypes: insightTypes,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Fetch insights from GearGraph API
 * This function makes the actual API call to the GearGraph service
 */
async function fetchInsightsFromGearGraph(
  brand: string | null,
  name: string | null,
  categoryId: string | null,
  insightTypes: string[]
): Promise<GearInsight[]> {
  const apiKey = process.env.GEARGRAPH_API_KEY;

  if (!apiKey) {
    console.warn('[getInsights] Missing GEARGRAPH_API_KEY');
    return [];
  }

  const GEARGRAPH_QUERY_URL = 'https://geargraph.gearshack.app/api/query';
  const allInsights: GearInsight[] = [];

  try {
    // Build search term from brand and name
    const searchTerms = [brand, name].filter(Boolean);
    if (searchTerms.length === 0) return [];

    const searchTerm = searchTerms.join(' ');

    // Query for insights based on requested types
    for (const insightType of insightTypes) {
      let query = '';
      let type: GearInsight['type'] = 'tip';

      switch (insightType) {
        case 'reviews':
          query = `
            MATCH (g:GearItem)-[:HAS_REVIEW]->(r:Review)
            WHERE toLower(g.name) CONTAINS toLower($search)
               OR toLower(g.brand) CONTAINS toLower($search)
            RETURN r.summary as content, r.rating as confidence
            LIMIT 3
          `;
          type = 'review';
          break;

        case 'sustainability':
          query = `
            MATCH (g:GearItem)-[:HAS_SUSTAINABILITY]->(s:Sustainability)
            WHERE toLower(g.name) CONTAINS toLower($search)
               OR toLower(g.brand) CONTAINS toLower($search)
            RETURN s.rating as content, s.score as confidence
            LIMIT 2
          `;
          type = 'sustainability';
          break;

        case 'durability':
          query = `
            MATCH (g:GearItem)-[:HAS_DURABILITY]->(d:Durability)
            WHERE toLower(g.name) CONTAINS toLower($search)
               OR toLower(g.brand) CONTAINS toLower($search)
            RETURN d.assessment as content, d.score as confidence
            LIMIT 2
          `;
          type = 'durability';
          break;

        default:
          continue;
      }

      try {
        const response = await fetch(GEARGRAPH_QUERY_URL, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            parameters: { search: searchTerm },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const results = result.results || [];

          for (const r of results) {
            const content = r.content || r['r.summary'] || r['s.rating'] || r['d.assessment'];
            const confidence = r.confidence || r['r.rating'] || r['s.score'] || r['d.score'] || 0.8;

            if (content) {
              allInsights.push({
                type,
                content: String(content),
                confidence: typeof confidence === 'number' ? confidence : 0.8,
                source: 'GearGraph',
              });
            }
          }
        }
      } catch (queryError) {
        console.error(`[getInsights] Failed to fetch ${insightType}:`, queryError);
      }
    }

    // Fallback: If no specific insights found, try general tips
    if (allInsights.length === 0) {
      const fallbackQuery = `
        MATCH (g:GearItem)-[:HAS_TIP]->(i:Insight)
        WHERE toLower(g.name) CONTAINS toLower($search)
           OR toLower(g.brand) CONTAINS toLower($search)
        RETURN i.content as content
        LIMIT 3
      `;

      try {
        const response = await fetch(GEARGRAPH_QUERY_URL, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: fallbackQuery,
            parameters: { search: searchTerm },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const results = result.results || [];

          for (const r of results) {
            if (r.content) {
              allInsights.push({
                type: 'tip',
                content: String(r.content),
                confidence: 0.7,
                source: 'GearGraph',
              });
            }
          }
        }
      } catch (fallbackError) {
        console.error('[getInsights] Fallback query failed:', fallbackError);
      }
    }

    return allInsights;
  } catch (error) {
    console.error('[getInsights] GearGraph fetch error:', error);
    return [];
  }
}
