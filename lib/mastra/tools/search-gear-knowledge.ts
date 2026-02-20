/**
 * Composite Tool: searchGearKnowledge
 * Feature: 060-ai-agent-evolution
 *
 * Unified search across ALL data sources in a single call:
 * - User's own gear inventory
 * - Product catalog (GearGraph synced data)
 * - GearGraph knowledge graph (via Cypher)
 * - Categories and brands
 * - GearGraph INSIGHTS (HAS_TIP relationships) for found gear items
 *
 * Replaces separate queryUserData + queryCatalog + queryGearGraph calls.
 *
 * @see specs/060-ai-agent-evolution/analysis.md - Vorschlag 2
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { extractUserId } from './utils';

// =============================================================================
// GearGraph Insights Integration
// =============================================================================

const GEARGRAPH_QUERY_URL = 'https://geargraph.gearshack.app/api/query';

interface CypherInsightResult {
  'i.summary': string;
  'i.content': string;
  'g.name'?: string;
}

interface CypherQueryResponse {
  results: CypherInsightResult[];
  count: number;
}

/**
 * Fetch INSIGHTS from GearGraph for a list of gear item names/brands.
 * Uses the (GearItem)-[:HAS_TIP]->(Insight) relationship.
 * Returns an empty array gracefully if the API is unavailable.
 */
async function fetchInsightsFromGearGraph(
  searchTerms: Array<{ name: string; brand: string | null }>,
  limit = 8
): Promise<Array<{ itemName: string; content: string }>> {
  const apiKey = process.env.GEARGRAPH_API_KEY;
  if (!apiKey || searchTerms.length === 0) return [];

  // Build OR conditions for up to 5 items to keep queries concise
  const top5 = searchTerms.slice(0, 5);
  const conditions = top5
    .map((item) => {
      const escapedName = item.name.replace(/'/g, "\\'");
      if (item.brand) {
        const escapedBrand = item.brand.replace(/'/g, "\\'");
        return `toLower(g.name) CONTAINS toLower('${escapedName}') OR toLower(g.brand) CONTAINS toLower('${escapedBrand}')`;
      }
      return `toLower(g.name) CONTAINS toLower('${escapedName}')`;
    })
    .join(' OR ');

  const query = `
    MATCH (g:GearItem)-[:HAS_TIP]->(i:Insight)
    WHERE ${conditions}
    RETURN g.name, i.summary, i.content
    LIMIT ${limit}
  `;

  try {
    const response = await fetch(GEARGRAPH_QUERY_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, parameters: {} }),
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) return [];

    const result: CypherQueryResponse = await response.json();
    return (result.results || []).map((r) => ({
      itemName: r['g.name'] || '',
      content: r['i.content'] || r['i.summary'] || '',
    })).filter((r) => r.content.length > 0);
  } catch {
    // Graceful degradation - insights are enrichment, not critical
    return [];
  }
}

// =============================================================================
// Schemas
// =============================================================================

const searchGearKnowledgeInputSchema = z.object({
  query: z.string().min(1).max(200)
    .describe('Search query (product name, brand, category, or general term)'),

  scope: z.enum(['my_gear', 'catalog', 'all']).default('all')
    .describe('Where to search: my_gear (user inventory only), catalog (product catalog only), all (both)'),

  filters: z.object({
    category: z.string().optional().describe('Category filter (slug or name, e.g., "tents", "Zelte")'),
    brand: z.string().optional().describe('Brand filter'),
    maxWeight: z.number().optional().describe('Maximum weight in grams'),
    minWeight: z.number().optional().describe('Minimum weight in grams'),
    maxPrice: z.number().optional().describe('Maximum price'),
    status: z.enum(['own', 'wishlist', 'sold', 'all']).optional().describe('Item status filter (for user gear)'),
  }).optional().describe('Optional filters to narrow results'),

  sortBy: z.enum(['weight_asc', 'weight_desc', 'price_asc', 'price_desc', 'name', 'relevance']).default('relevance')
    .describe('Sort order for results'),

  limit: z.number().int().positive().max(30).default(10)
    .describe('Maximum results per source'),

  offset: z.number().int().min(0).default(0)
    .describe('Number of results to skip (for pagination)'),
});

const searchGearKnowledgeOutputSchema = z.object({
  success: z.boolean(),
  summary: z.string().describe('Human-readable summary of search results'),
  myGear: z.array(z.object({
    id: z.string(),
    name: z.string(),
    brand: z.string().nullable(),
    weightGrams: z.number().nullable(),
    pricePaid: z.number().nullable(),
    category: z.string().nullable(),
    status: z.string(),
  })).optional().describe('Results from user inventory'),
  catalogProducts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    brand: z.string().nullable(),
    weightGrams: z.number().nullable(),
    priceUsd: z.number().nullable(),
    productType: z.string().nullable(),
    description: z.string().nullable(),
  })).optional().describe('Results from product catalog'),
  gearGraphInsights: z.array(z.object({
    itemName: z.string().describe('Gear item this insight applies to'),
    content: z.string().describe('Expert tip, recommendation, or warning from the GearGraph knowledge base'),
  })).optional().describe('Expert insights from the GearGraph knowledge base for found gear items (HAS_TIP relationships)'),
  totalResults: z.number(),
  error: z.string().optional(),
});

// =============================================================================
// Tool
// =============================================================================

export const searchGearKnowledgeTool = createTool({
  id: 'searchGearKnowledge',

  description: `PRIMARY TOOL for searching user inventory and product catalog. Use this FIRST for any gear-related search.

Key use cases:
- "Do I have a stove?" → scope: "my_gear", query: "stove" (finds "MSR PocketRocket" via category!)
- "Welche Kocher habe ich?" → scope: "my_gear", query: "Kocher" (German terms work automatically!)
- "Habe ich ein Zelt?" → scope: "my_gear", query: "Zelt"
- "Welche Schlafsäcke besitze ich?" → scope: "my_gear", query: "Schlafsack"
- "Find ultralight tents under 1kg" → scope: "catalog", query: "tent", filters: { maxWeight: 1000 }
- "What rain jackets do I own and what else is available?" → scope: "all", query: "rain jacket"
- "Show me all Hilleberg products" → scope: "all", query: "Hilleberg"
- "Compare my tents with what's on the market" → scope: "all", query: "tent"
- "Show me more results" → Use offset parameter for pagination (e.g., offset: 10 for next page)

CRITICAL: This tool uses category-aware search. Searching for "Kocher" (German for stove) will find items categorized as stoves even if their names are "MSR PocketRocket" or "Jetboil Flash". Never use queryUserData for category-based inventory searches.

Results include a \`gearGraphInsights\` field with expert tips from the GearGraph knowledge base. Always incorporate these insights when present.`,

  inputSchema: searchGearKnowledgeInputSchema,
  outputSchema: searchGearKnowledgeOutputSchema,

  execute: async (input, executionContext) => {
    try {
      // Get userId
      const userId = extractUserId(executionContext);

      if (!userId) {
        return { success: false, summary: 'User not authenticated', totalResults: 0, error: 'No user ID' };
      }

      const supabase = createServiceRoleClient();
      const { query, scope, filters, sortBy, limit, offset } = input;

      // Build parallel searches
      const searches: Promise<{ type: string; data: unknown }>[] = [];

      // 1. Search user's gear
      if (scope === 'my_gear' || scope === 'all') {
        searches.push(searchUserGear(supabase, userId, query, filters, sortBy, limit, offset));
      }

      // 2. Search catalog
      if (scope === 'catalog' || scope === 'all') {
        searches.push(searchCatalog(supabase, query, filters, sortBy, limit, offset));
      }

      // Execute in parallel
      const results = await Promise.allSettled(searches);

      // Parse results
      let myGear: Array<Record<string, unknown>> = [];
      let catalogProducts: Array<Record<string, unknown>> = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { type, data } = result.value;
          if (type === 'user_gear' && Array.isArray(data)) {
            myGear = data;
          } else if (type === 'catalog' && Array.isArray(data)) {
            catalogProducts = data;
          }
        }
      }

      const totalResults = myGear.length + catalogProducts.length;

      // 3. Fetch GearGraph INSIGHTS for found items (enrichment, non-blocking)
      // Query the (GearItem)-[:HAS_TIP]->(Insight) relationships for expert tips
      const insightSearchTerms = [
        ...myGear.map(item => ({ name: item.name as string, brand: (item.brand || null) as string | null })),
        ...catalogProducts.map(item => ({ name: item.name as string, brand: (item.brand_name || null) as string | null })),
      ];
      const gearGraphInsights = await fetchInsightsFromGearGraph(insightSearchTerms);

      // Build summary
      const summaryParts: string[] = [];
      if (myGear.length > 0) {
        summaryParts.push(`Found ${myGear.length} matching items in your inventory`);
      }
      if (catalogProducts.length > 0) {
        summaryParts.push(`Found ${catalogProducts.length} matching products in the catalog`);
      }
      if (gearGraphInsights.length > 0) {
        summaryParts.push(`${gearGraphInsights.length} expert insights from GearGraph`);
      }
      if (totalResults === 0) {
        summaryParts.push(`No results found for "${query}"`);
      }

      return {
        success: true,
        summary: summaryParts.join('. ') + '.',
        myGear: myGear.map(item => ({
          id: item.id as string,
          name: item.name as string,
          brand: (item.brand || null) as string | null,
          weightGrams: (item.weight_grams || null) as number | null,
          pricePaid: (item.price_paid || null) as number | null,
          category: (item.category_label || null) as string | null,
          status: (item.status || 'own') as string,
        })),
        catalogProducts: catalogProducts.map(item => ({
          id: item.id as string,
          name: item.name as string,
          brand: (item.brand_name || null) as string | null,
          weightGrams: (item.weight_grams || null) as number | null,
          priceUsd: (item.price_usd || null) as number | null,
          productType: (item.product_type || null) as string | null,
          description: (item.description || null) as string | null,
        })),
        gearGraphInsights: gearGraphInsights.length > 0 ? gearGraphInsights : undefined,
        totalResults,
      };
    } catch (error) {
      console.error('[searchGearKnowledge] Error:', error);
      return {
        success: false,
        summary: 'Search failed.',
        totalResults: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// =============================================================================
// Search Functions
// =============================================================================

/**
 * Resolve a category search term to matching category IDs.
 * Supports English and German search terms via i18n translations.
 * Includes child categories of matching parents.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveCategoryIds(supabase: any, searchTerm: string): Promise<string[]> {
  const searchLower = searchTerm.toLowerCase();

  const { data: allCategories, error } = await supabase
    .from('categories')
    .select('id, slug, label, parent_id, i18n');

  if (error || !allCategories || allCategories.length === 0) return [];

  const matchingIds = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const cat of allCategories as any[]) {
    const fields: string[] = [
      cat.slug,
      cat.label,
      ...(typeof cat.i18n === 'object' && cat.i18n !== null
        ? Object.values(cat.i18n as Record<string, string>)
        : []),
    ].filter((f): f is string => typeof f === 'string');

    if (fields.some(f => f.toLowerCase().includes(searchLower))) {
      matchingIds.add(cat.id as string);
    }
  }

  // Include descendant categories (children, grandchildren, etc.)
  let prevSize = 0;
  while (matchingIds.size > prevSize) {
    prevSize = matchingIds.size;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const cat of allCategories as any[]) {
      if (cat.parent_id && matchingIds.has(cat.parent_id as string)) {
        matchingIds.add(cat.id as string);
      }
    }
  }

  return Array.from(matchingIds);
}

async function searchUserGear(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  query: string,
  filters: z.infer<typeof searchGearKnowledgeInputSchema>['filters'],
  sortBy: string,
  limit: number,
  offset: number
): Promise<{ type: string; data: unknown }> {
  let dbQuery = supabase
    .from('gear_items')
    .select('id, name, brand, weight_grams, price_paid, status, product_type_id, categories(label)')
    .eq('user_id', userId);

  // Build search: combine text search with category-based search.
  // This ensures German category terms like "Kocher" (stove) match items
  // that are categorized as stoves but named "MSR PocketRocket", etc.
  const categoryIds = await resolveCategoryIds(supabase, query);

  console.log(`[searchGearKnowledge] query="${query}" → categoryIds=[${categoryIds.join(',')}]`);

  if (categoryIds.length > 0) {
    // Search by text fields OR by matching category
    const orFilters = [
      `name.ilike.%${query}%`,
      `brand.ilike.%${query}%`,
      `notes.ilike.%${query}%`,
      `product_type_id.in.(${categoryIds.join(',')})`,
    ];
    const orString = orFilters.join(',');
    console.log(`[searchGearKnowledge] OR filter: ${orString}`);
    dbQuery = dbQuery.or(orString);
  } else {
    // Fallback: text-only search
    console.log(`[searchGearKnowledge] No categories found, using text-only search`);
    dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%,notes.ilike.%${query}%`);
  }

  // Apply filters
  if (filters?.status && filters.status !== 'all') {
    dbQuery = dbQuery.eq('status', filters.status);
  } else {
    dbQuery = dbQuery.eq('status', 'own');
  }

  if (filters?.maxWeight) {
    dbQuery = dbQuery.lte('weight_grams', filters.maxWeight);
  }
  if (filters?.minWeight) {
    dbQuery = dbQuery.gte('weight_grams', filters.minWeight);
  }
  if (filters?.maxPrice) {
    dbQuery = dbQuery.lte('price_paid', filters.maxPrice);
  }

  // Sort
  switch (sortBy) {
    case 'weight_asc':
      dbQuery = dbQuery.order('weight_grams', { ascending: true, nullsFirst: false });
      break;
    case 'weight_desc':
      dbQuery = dbQuery.order('weight_grams', { ascending: false });
      break;
    case 'price_asc':
      dbQuery = dbQuery.order('price_paid', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      dbQuery = dbQuery.order('price_paid', { ascending: false });
      break;
    case 'name':
      dbQuery = dbQuery.order('name', { ascending: true });
      break;
    default:
      dbQuery = dbQuery.order('name', { ascending: true });
  }

  const { data, error } = await dbQuery.range(offset, offset + limit - 1);
  if (error) {
    console.error(`[searchGearKnowledge] User gear search error: ${error.message}`, error);
    throw new Error(`User gear search: ${error.message}`);
  }
  console.log(`[searchGearKnowledge] Found ${(data || []).length} user gear items for query="${query}"`);

  // Flatten category label
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattened = (data || []).map((item: any) => ({
    ...item,
    category_label: item.categories?.label || null,
    categories: undefined,
  }));

  return { type: 'user_gear', data: flattened };
}

async function searchCatalog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  query: string,
  filters: z.infer<typeof searchGearKnowledgeInputSchema>['filters'],
  sortBy: string,
  limit: number,
  offset: number
): Promise<{ type: string; data: unknown }> {
  let dbQuery = supabase
    .from('catalog_products')
    .select('id, name, product_type, description, price_usd, weight_grams, catalog_brands(name)');

  // Text search
  dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,product_type.ilike.%${query}%`);

  // Apply filters
  if (filters?.maxWeight) {
    dbQuery = dbQuery.lte('weight_grams', filters.maxWeight);
  }
  if (filters?.minWeight) {
    dbQuery = dbQuery.gte('weight_grams', filters.minWeight);
  }
  if (filters?.maxPrice) {
    dbQuery = dbQuery.lte('price_usd', filters.maxPrice);
  }
  if (filters?.brand) {
    dbQuery = dbQuery.ilike('catalog_brands.name', `%${filters.brand}%`);
  }

  // Sort
  switch (sortBy) {
    case 'weight_asc':
      dbQuery = dbQuery.order('weight_grams', { ascending: true, nullsFirst: false });
      break;
    case 'weight_desc':
      dbQuery = dbQuery.order('weight_grams', { ascending: false });
      break;
    case 'price_asc':
      dbQuery = dbQuery.order('price_usd', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      dbQuery = dbQuery.order('price_usd', { ascending: false });
      break;
    default:
      dbQuery = dbQuery.order('name', { ascending: true });
  }

  const { data, error } = await dbQuery.range(offset, offset + limit - 1);
  if (error) throw new Error(`Catalog search: ${error.message}`);

  // Flatten brand name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattened = (data || []).map((item: any) => ({
    ...item,
    brand_name: item.catalog_brands?.name || null,
    catalog_brands: undefined,
  }));

  return { type: 'catalog', data: flattened };
}
