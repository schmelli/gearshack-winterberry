/**
 * Composite Tool: searchGearKnowledge
 * Feature: 060-ai-agent-evolution + Community-RAG Integration (Vorschlag 15)
 *
 * Unified search across ALL data sources in a single call:
 * - User's own gear inventory
 * - Product catalog (GearGraph synced data)
 * - GearGraph knowledge graph (via Cypher)
 * - Categories and brands
 * - GearGraph INSIGHTS (HAS_TIP relationships) for found gear items
 * - Community knowledge (bulletin board posts/replies via pgvector RAG)
 *
 * Agentic RAG: When the initial search returns 0 results and the query
 * is sufficiently long (>10 chars), the tool automatically reformulates
 * the query using a fast LLM call (Haiku) and retries the search.
 * Example: "Osprey Exos 58L" → "Osprey Exos" (removes model number suffix)
 *
 * Also logs catalog gaps (zero-result searches) for data-driven catalog improvements,
 * and emits OpenTelemetry span events for the tracing dashboard.
 *
 * Replaces separate queryUserData + queryCatalog + queryGearGraph calls.
 *
 * @see specs/060-ai-agent-evolution/analysis.md - Vorschlag 2
 * @see Community-RAG Integration (Vorschlag 15, Kap. 17)
 * @see Agentic RAG — Automatische Query-Reformulierung (Kap. 20)
 */

import { createTool } from '@mastra/core/tools';
import { generateText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { extractUserId } from './utils';
import { searchCommunityKnowledge, formatCommunityResults } from '@/lib/community-rag';
import { logInfo, logWarn, createTimer } from '../logging';
import { recordSpanEvent, addSpanAttributes } from '@/lib/mastra/tracing';

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
// Agentic RAG: Query Reformulation
// =============================================================================

/** Model for query reformulation — Haiku for cost-efficiency */
const REFORMULATION_MODEL = process.env.REFORMULATION_MODEL ?? 'anthropic/claude-haiku-4-5-20251001';
/** Timeout for the reformulation LLM call (ms) */
const REFORMULATION_TIMEOUT_MS = 3000;

/**
 * Lazy-loaded gateway instance for reformulation calls.
 * NOTE: AI_GATEWAY_API_KEY / AI_GATEWAY_KEY must be present at module load time.
 * If these env vars are absent when the module first initializes, this singleton
 * will remain null for the lifetime of the module instance (no hot-reload on env changes).
 */
let reformulationGateway: ReturnType<typeof createGateway> | null = null;

function getReformulationGateway() {
  if (!reformulationGateway) {
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!apiKey) return null;
    reformulationGateway = createGateway({ apiKey });
  }
  return reformulationGateway;
}

/**
 * Reformulate a search query using a fast LLM call when the original
 * query returns 0 results. Strips model numbers, specifications, and
 * volume suffixes to broaden the search.
 *
 * Examples:
 * - "Osprey Exos 58L" → "Osprey Exos"
 * - "ultralight Isomatte für Winter" → "insulated sleeping pad"
 * - "MSR PocketRocket Deluxe 2024" → "MSR PocketRocket"
 *
 * Returns null if reformulation is unavailable or fails (graceful degradation).
 */
async function reformulateQuery(query: string): Promise<string | null> {
  const gateway = getReformulationGateway();
  if (!gateway) return null;

  // Truncate long input to avoid excessive LLM cost and latency beyond what the
  // timeout would reliably catch. Real gear queries are short; anything over
  // 500 chars is almost certainly not a meaningful search term.
  const queryForLLM = query.length > 500 ? query.slice(0, 500) : query;

  let timerId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => reject(new Error('Reformulation timeout')), REFORMULATION_TIMEOUT_MS);
    });

    const { text } = await Promise.race([
      generateText({
        model: gateway(REFORMULATION_MODEL),
        messages: [
          {
            role: 'system',
            content: 'Simplify gear search queries. Remove model numbers, volume/size specifications (like "58L"), and year designations. Keep the brand name, core product category, and the original language of the query. Reply with only the simplified query, nothing else.',
          },
          { role: 'user', content: queryForLLM },
        ],
        temperature: 0,
      }),
      timeoutPromise,
    ]);

    clearTimeout(timerId);

    const reformulated = text.trim();
    // Sanity check: don't accept empty results, results identical to input, or oversized results
    if (!reformulated || reformulated.toLowerCase() === query.toLowerCase() || reformulated.length > 200) {
      return null;
    }
    return reformulated;
  } catch (error) {
    clearTimeout(timerId);
    // Graceful degradation — reformulation is an optimization, not critical
    logWarn('Query reformulation failed', {
      metadata: { original: query, error: error instanceof Error ? error.message : String(error) },
    });
    return null;
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
  reformulatedQuery: z.string().optional()
    .describe('Simplified query used when original returned no results (Agentic RAG). Present when query was automatically reformulated.'),
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
  communityInsights: z.array(z.object({
    source: z.string().describe('Source type (e.g., "Community Post [gear_advice]", "Community Reply")'),
    content: z.string().describe('Relevant community experience or discussion from bulletin board posts'),
    similarity: z.number().describe('Semantic similarity score (0-1)'),
  })).optional().describe('Relevant community experiences and discussions from the bulletin board, found via semantic search (pgvector RAG). Contains real user experiences about gear — always cite these as "According to the community..." when present.'),
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

Results include:
- \`gearGraphInsights\`: Expert tips from the GearGraph knowledge base. Always incorporate these insights when present.
- \`communityInsights\`: Real experiences from community members (bulletin board posts/replies), found via semantic search. When present, cite these as "According to the community..." or "Community members report that...". This is unique knowledge that comes from real users sharing their gear experiences.

LATENCY NOTE: Zero-result queries trigger automatic query reformulation (Agentic RAG) — a fast LLM call (max 3 s) plus a second DB round-trip. Expect up to ~4 s additional latency for zero-result searches on queries longer than 10 characters. All other queries are unaffected.`,

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

      // Helper: execute parallel searches for a given query string
      async function executeSearches(searchQuery: string, currentUserId: string) {
        const searches: Promise<{ type: string; data: unknown }>[] = [];
        if (scope === 'my_gear' || scope === 'all') {
          searches.push(searchUserGear(supabase, currentUserId, searchQuery, filters, sortBy, limit, offset));
        }
        if (scope === 'catalog' || scope === 'all') {
          searches.push(searchCatalog(supabase, searchQuery, filters, sortBy, limit, offset));
        }
        const results = await Promise.allSettled(searches);

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
        return { myGear, catalogProducts };
      }

      // 1. Initial search with original query
      let { myGear, catalogProducts } = await executeSearches(query, userId);
      let totalResults = myGear.length + catalogProducts.length;
      let reformulatedQuery: string | null = null;

      // 2. Agentic RAG: Reformulate query and retry if 0 results
      //    Only attempt reformulation for queries long enough to be worth simplifying
      if (totalResults === 0 && query.length > 10) {
        const getElapsed = createTimer();
        reformulatedQuery = await reformulateQuery(query);
        const reformulationLatencyMs = getElapsed();

        if (reformulatedQuery) {
          const retryResults = await executeSearches(reformulatedQuery, userId);
          myGear = retryResults.myGear;
          catalogProducts = retryResults.catalogProducts;
          totalResults = myGear.length + catalogProducts.length;

          logInfo('Agentic RAG: query reformulated and retried', {
            metadata: {
              original: query,
              reformulated: reformulatedQuery,
              reformulationLatencyMs,
              found: totalResults,
            },
          });
        } else {
          logWarn('Query reformulation returned no alternative', {
            metadata: { original: query, latencyMs: reformulationLatencyMs },
          });
        }
      }

      // 3. Log catalog gap if zero results (non-blocking)
      if (totalResults === 0) {
        // OTel span event for tracing dashboard
        // Truncate query to limit PII exposure in distributed traces
        recordSpanEvent('catalog_gap_detected', {
          'catalog_gap.query': query.length > 100 ? `${query.slice(0, 97)}...` : query,
          'catalog_gap.scope': scope,
          'catalog_gap.category_hint': filters?.category || '',
        });
        addSpanAttributes({
          'search.result_count': 0,
          'search.is_catalog_gap': true,
        });

        // Structured logging to catalog_gaps table (fire-and-forget)
        logCatalogGap(supabase, {
          query,
          scope,
          categoryHint: filters?.category || null,
          filters: filters ? JSON.parse(JSON.stringify(filters)) : {},
          userId,
        }).catch((err) => {
          console.error('[searchGearKnowledge] Failed to log catalog gap:', err);
        });
      } else {
        addSpanAttributes({
          'search.result_count': totalResults,
          'search.is_catalog_gap': false,
        });
      }

      // 4. Fetch GearGraph INSIGHTS and Community Knowledge in parallel
      // Both are enrichment layers — non-blocking, graceful degradation
      const insightSearchTerms = [
        ...myGear.map(item => ({ name: item.name as string, brand: (item.brand || null) as string | null })),
        ...catalogProducts.map(item => ({ name: item.name as string, brand: (item.brand_name || null) as string | null })),
      ];

      const [gearGraphInsights, communityResults] = await Promise.all([
        // 4a. GearGraph INSIGHTS (HAS_TIP relationships)
        fetchInsightsFromGearGraph(insightSearchTerms),
        // 4b. Community Knowledge (bulletin board posts via pgvector RAG)
        searchCommunityKnowledge(query, { topK: 3 }).catch(() => []),
      ]);

      const communityInsights = formatCommunityResults(communityResults);

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
      if (communityInsights.length > 0) {
        summaryParts.push(`${communityInsights.length} relevant community experiences`);
      }
      // Agentic RAG: inform the agent when results came from a reformulated query
      if (reformulatedQuery && totalResults > 0) {
        summaryParts.push(`Note: query was automatically simplified from "${query}" to "${reformulatedQuery}" to broaden results`);
      }
      if (totalResults === 0 && communityInsights.length === 0) {
        const noResultsMsg = reformulatedQuery
          ? `No results found for "${query}" (also tried simplified query "${reformulatedQuery}")`
          : `No results found for "${query}"`;
        summaryParts.push(noResultsMsg);
      }

      return {
        success: true,
        summary: summaryParts.join('. ') + '.',
        reformulatedQuery: reformulatedQuery ?? undefined,
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
        communityInsights: communityInsights.length > 0 ? communityInsights : undefined,
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
    .select('id, name, brand, weight_grams, price_paid, status, product_type_id, categories!gear_items_product_type_id_fkey(label)')
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

// =============================================================================
// Catalog Gap Logging
// =============================================================================

/**
 * Log a catalog gap (zero-result search) for data-driven catalog improvements.
 * Uses the upsert_catalog_gap RPC function for atomic increment + deduplication.
 * This is fire-and-forget — failures are logged but never block the search response.
 */
async function logCatalogGap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  params: {
    query: string;
    scope: string;
    categoryHint: string | null;
    filters: Record<string, unknown>;
    userId: string | null;
  }
): Promise<void> {
  const { query, scope, categoryHint, filters, userId } = params;

  const { error } = await supabase.rpc('upsert_catalog_gap', {
    p_query: query,
    p_scope: scope,
    p_category_hint: categoryHint,
    p_filters: filters,
    p_user_id: userId || null,
  });

  if (error) {
    console.error('[searchGearKnowledge] catalog_gap upsert error:', error.message);
  }
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
  // Pre-filter by brand if specified (needed before RPC call)
  let brandIds: string[] | null = null;
  if (filters?.brand) {
    const { data: matchingBrands } = await supabase
      .from('catalog_brands')
      .select('id')
      .ilike('name', `%${filters.brand}%`);
    brandIds = (matchingBrands ?? []).map((b: { id: string }) => b.id);
    if (brandIds.length === 0) {
      return { type: 'catalog', data: [] };
    }
  }

  // Use enrichment-aware RPC function for search
  // Falls back to standard ILIKE on name/description/product_type when
  // search_enrichment is NULL (unenriched products still found).
  const { data: rpcResults, error: rpcError } = await supabase.rpc('search_catalog_enriched', {
    p_query: query,
    p_limit: limit * 3, // Overfetch to allow for post-filtering
    p_offset: 0,        // We handle offset after filtering
  });

  if (rpcError) {
    // Fallback: if RPC not available (e.g., migration not yet applied),
    // use the standard ILIKE approach
    logWarn('search_catalog_enriched RPC failed, falling back to standard search', {
      metadata: { error: rpcError.message },
    });
    return searchCatalogFallback(supabase, query, filters, sortBy, limit, offset);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: any[] = rpcResults || [];

  // Apply post-RPC filters (brand, weight, price)
  if (brandIds) {
    const matchedBrandIds = brandIds;
    results = results.filter((item: { brand_id: string | null }) =>
      item.brand_id && matchedBrandIds.includes(item.brand_id)
    );
  }
  if (filters?.maxWeight) {
    results = results.filter((item: { weight_grams: number | null }) =>
      item.weight_grams !== null && item.weight_grams <= (filters.maxWeight as number)
    );
  }
  if (filters?.minWeight) {
    results = results.filter((item: { weight_grams: number | null }) =>
      item.weight_grams !== null && item.weight_grams >= (filters.minWeight as number)
    );
  }
  if (filters?.maxPrice) {
    results = results.filter((item: { price_usd: number | null }) =>
      item.price_usd !== null && item.price_usd <= (filters.maxPrice as number)
    );
  }

  // Apply sorting
  switch (sortBy) {
    case 'weight_asc':
      results.sort((a, b) => (a.weight_grams ?? Infinity) - (b.weight_grams ?? Infinity));
      break;
    case 'weight_desc':
      results.sort((a, b) => (b.weight_grams ?? 0) - (a.weight_grams ?? 0));
      break;
    case 'price_asc':
      results.sort((a, b) => (a.price_usd ?? Infinity) - (b.price_usd ?? Infinity));
      break;
    case 'price_desc':
      results.sort((a, b) => (b.price_usd ?? 0) - (a.price_usd ?? 0));
      break;
    default:
      // RPC already sorts by relevance then name
      break;
  }

  // Apply pagination
  const paginated = results.slice(offset, offset + limit);

  // Resolve brand names for results
  const uniqueBrandIds = [...new Set(
    paginated
      .map((item: { brand_id: string | null }) => item.brand_id)
      .filter((id: string | null): id is string => id !== null)
  )];

  const brandNameMap = new Map<string, string>();
  if (uniqueBrandIds.length > 0) {
    const { data: brands } = await supabase
      .from('catalog_brands')
      .select('id, name')
      .in('id', uniqueBrandIds);
    for (const brand of brands || []) {
      brandNameMap.set(brand.id, brand.name);
    }
  }

  // Flatten results with brand name and match source
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattened = paginated.map((item: any) => ({
    ...item,
    brand_name: brandNameMap.get(item.brand_id) || null,
    brand_id: undefined,
    search_enrichment: undefined,
  }));

  return { type: 'catalog', data: flattened };
}

/**
 * Fallback search when search_catalog_enriched RPC is unavailable.
 * Uses standard ILIKE on name, description, and product_type.
 */
async function searchCatalogFallback(
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

  dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,product_type.ilike.%${query}%`);

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
    const { data: matchingBrands } = await supabase
      .from('catalog_brands')
      .select('id')
      .ilike('name', `%${filters.brand}%`);
    const brandIds = (matchingBrands ?? []).map((b: { id: string }) => b.id);
    if (brandIds.length > 0) {
      dbQuery = dbQuery.in('brand_id', brandIds);
    } else {
      return { type: 'catalog', data: [] };
    }
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattened = (data || []).map((item: any) => ({
    ...item,
    brand_name: item.catalog_brands?.name || null,
    catalog_brands: undefined,
  }));

  return { type: 'catalog', data: flattened };
}
