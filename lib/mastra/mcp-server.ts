/**
 * GearShack MCP Server
 * Feature: 060-ai-agent-evolution — Vorschlag 8 (Kap. 11)
 *
 * Exposes GearShack's core gear management tools as a standardized MCP server,
 * allowing external agents (Claude.ai, Cursor, personal assistants) to:
 * - Analyze loadouts for weight, completeness, and optimization
 * - Search gear inventory and product catalog
 * - Get inventory statistics and insights
 *
 * Protocol: JSON-RPC 2.0 (MCP standard)
 * Transport: Stateless HTTP POST (serverless-compatible)
 * Auth: API key via X-API-Key header (MCP_SERVER_API_KEY env var)
 *
 * @see https://modelcontextprotocol.io/specification
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { formatWeight } from './tools/utils';

// ============================================================================
// Input Validation & Sanitization
// ============================================================================

/** UUID v4 format regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/** Maximum length for search queries */
const MAX_QUERY_LENGTH = 200;

/**
 * Sanitize a search string for use in Supabase ILIKE filters.
 *
 * Prevents:
 * - ILIKE wildcard injection (% and _)
 * - PostgREST operator injection (commas, parentheses, dots, colons)
 * - Backslash escape manipulation
 *
 * Follows the same pattern as admin/reseller and messaging/users search routes.
 */
function sanitizeSearchQuery(input: string): string {
  return input
    .slice(0, MAX_QUERY_LENGTH)
    .replace(/\\/g, '\\\\')   // Escape backslashes first
    .replace(/%/g, '\\%')     // Escape ILIKE %
    .replace(/_/g, '\\_')     // Escape ILIKE _
    .replace(/,/g, '')        // Remove commas (PostgREST .or() delimiter)
    .replace(/\(/g, '')       // Remove parentheses (PostgREST operators)
    .replace(/\)/g, '')
    .replace(/\./g, ' ')      // Replace dots (prevents .eq. .neq. injection)
    .replace(/:/g, '')         // Remove colons (prevents ::text casting)
    .trim();
}

/**
 * Type alias for the `status` column of `gear_items` (matches DB enum).
 * Used to satisfy the Supabase typed client when calling `.eq('status', ...)`.
 */
type GearItemStatus = 'own' | 'wishlist' | 'sold' | 'lent' | 'retired';

/**
 * Resolve the caller-supplied status string to a concrete `GearItemStatus`
 * value suitable for direct use in Supabase `.eq('status', ...)` calls.
 * The special value `'all'` falls back to `'own'` (the most common default).
 */
function resolveStatus(status: string): GearItemStatus {
  return (status === 'all' ? 'own' : status) as GearItemStatus;
}

/**
 * Sanitize a database error message before returning to the client.
 * Strips potentially sensitive information (table names, column details, etc.)
 */
function sanitizeDbError(error: { message: string }): string {
  const msg = error.message;
  // Return generic message for common Postgres errors
  if (msg.includes('permission denied')) return 'Access denied';
  if (msg.includes('violates')) return 'Data validation error';
  if (msg.includes('timeout')) return 'Request timed out';
  if (msg.includes('does not exist')) return 'Resource not found';
  // Strip detailed Postgres error info, keep first sentence only
  const firstSentence = msg.split('.')[0].split('\n')[0];
  return firstSentence.length > 100 ? 'Database operation failed' : firstSentence;
}

// ============================================================================
// MCP Protocol Types
// ============================================================================

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// ============================================================================
// Server Metadata
// ============================================================================

const SERVER_INFO = {
  name: 'gearshack',
  version: '1.0.0',
};

const PROTOCOL_VERSION = '2024-11-05';

// ============================================================================
// Domain Knowledge (shared with analyzeLoadout tool)
// ============================================================================

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

const BIG3_PATTERNS = {
  shelter: ['shelter', 'tents', 'tarps', 'hammock', 'bivy'],
  sleepSystem: ['sleeping', 'quilts', 'sleeping_bags', 'sleeping_pads', 'insulated_pads'],
  pack: ['packs', 'backpacks', 'frameless', 'framed'],
};

// ============================================================================
// Typed Interfaces for DB Rows and RPC Results
// ============================================================================

/** Row shape for category resolution */
interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  parent_id: string | null;
  i18n: Record<string, string> | null;
}

/**
 * Module-level TTL cache for category data.
 * Avoids a full `categories` table fetch on every `searchGear` call.
 * Cache is per-process-instance and resets on cold starts (acceptable for serverless).
 */
interface CategoryCache {
  data: CategoryRow[];
  expiresAt: number;
}

/** 5-minute TTL for the category cache */
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
let _categoryCache: CategoryCache | null = null;

/** Row shape for gear_items search results */
interface GearItemSearchRow {
  id: string;
  name: string;
  brand: string | null;
  weight_grams: number | null;
  price_paid: number | null;
  status: string;
  product_type_id: string | null;
  categories: { label: string } | null;
}

/** Row shape for catalog_products search results */
interface CatalogProductSearchRow {
  id: string;
  name: string;
  product_type: string | null;
  description: string | null;
  price_usd: number | null;
  weight_grams: number | null;
  catalog_brands: { name: string } | null;
}

/** Row shape for heaviest/lightest item queries */
interface WeightedItemRow {
  id: string;
  name: string;
  brand: string | null;
  weight_grams: number;
  categories: { label: string } | null;
}

/** Row shape for brand breakdown queries */
interface BrandRow {
  brand: string | null;
  weight_grams: number | null;
}

/** Row shape for weight distribution queries */
interface WeightDistRow {
  weight_grams: number;
}

/** Row shape for value summary queries */
interface ValueRow {
  price_paid: number | null;
  currency: string | null;
}

/** Row shape for recent additions queries */
interface RecentItemRow {
  id: string;
  name: string;
  brand: string | null;
  weight_grams: number | null;
  created_at: string;
  categories: { label: string } | null;
}

/** Shape returned by the `analyze_loadout` RPC function */
interface AnalyzeLoadoutRPCResult {
  error?: string;
  loadout: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  categoryBreakdown: Array<Record<string, unknown>>;
  totalWeight: number;
  wornWeight: number;
  consumableWeight: number;
}

type RPCResponse<T> = { data: T | null; error: { message: string } | null };

/**
 * Type-safe wrapper for calling Supabase RPC functions not yet in the generated
 * schema types. Concentrates the necessary `any` escape to a single location
 * instead of scattering eslint-disable comments throughout the file.
 *
 * SECURITY NOTE: The MCP server uses a service-role client that bypasses RLS.
 * The `userId` parameter in every tool is therefore validated with `isValidUUID`
 * before being passed to any DB query. Only trusted internal tooling should hold
 * the MCP_SERVER_API_KEY environment variable.
 */
function callRpc<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  functionName: string,
  params: Record<string, unknown>
): Promise<RPCResponse<T>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).rpc(functionName, params) as Promise<RPCResponse<T>>;
}

// ============================================================================
// Tool Definitions (MCP JSON Schema format)
// ============================================================================

export const TOOL_DEFINITIONS: MCPToolDefinition[] = [
  {
    name: 'analyzeLoadout',
    description: `Analyze a GearShack loadout for weight, completeness, and optimization.

Returns weight breakdown (total/base/worn/consumable), weight classification (ultralight/lightweight/standard/heavy), Big 3 analysis (shelter, sleep system, pack), missing essential categories for the activity type, heaviest items, and category-level distribution.

Use for: "Analyze my PCT loadout", "Is my pack too heavy?", "What's missing for winter camping?"`,
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'UUID of the GearShack user' },
        loadoutId: { type: 'string', description: 'UUID of the loadout to analyze' },
      },
      required: ['userId', 'loadoutId'],
    },
  },
  {
    name: 'searchGear',
    description: `Search GearShack gear inventory and product catalog.

Searches across user inventory (owned/wishlist/sold items) and product catalog. Supports category-aware i18n search (e.g., "Zelte" finds tents, "Kocher" finds stoves). Filterable by category, brand, weight range, price range, and item status.

Use for: "Find ultralight tents under 1kg", "What rain jackets do I own?", "Search for Hilleberg products"`,
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'UUID of the GearShack user' },
        query: {
          type: 'string',
          description: 'Search query (product name, brand, category, or general term)',
        },
        scope: {
          type: 'string',
          enum: ['my_gear', 'catalog', 'all'],
          description: 'Where to search: my_gear (inventory only), catalog (products only), all (both). Default: all',
        },
        filters: {
          type: 'object',
          description: 'Optional filters to narrow results',
          properties: {
            category: { type: 'string', description: 'Category filter (slug or name)' },
            brand: { type: 'string', description: 'Brand filter' },
            maxWeight: { type: 'number', description: 'Maximum weight in grams' },
            minWeight: { type: 'number', description: 'Minimum weight in grams' },
            maxPrice: { type: 'number', description: 'Maximum price' },
            status: {
              type: 'string',
              enum: ['own', 'wishlist', 'sold', 'all'],
              description: 'Item status filter (for user gear). Default: own',
            },
          },
        },
        limit: {
          type: 'number',
          description: 'Maximum results per source (1-30, default: 10)',
        },
      },
      required: ['userId', 'query'],
    },
  },
  {
    name: 'inventoryInsights',
    description: `Get inventory statistics and insights for a GearShack user.

Available insights: overview (counts, total weight, brands), count_by_category (with i18n search; note: status='all' defaults to 'own' since the underlying RPC does not support cross-status counts), heaviest_items, lightest_items, brand_breakdown, weight_distribution (min/max/avg/median), value_summary (by currency), recent_additions.

Use for: "How many tents do I have?", "What's my heaviest item?", "Which brands do I own?", "Total gear value?"`,
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'UUID of the GearShack user' },
        question: {
          type: 'string',
          enum: [
            'overview', 'count_by_category', 'heaviest_items', 'lightest_items',
            'brand_breakdown', 'weight_distribution', 'value_summary', 'recent_additions',
          ],
          description: 'Type of inventory insight to retrieve',
        },
        category: {
          type: 'string',
          description: 'Category search term (for count_by_category). Supports EN/DE terms.',
        },
        status: {
          type: 'string',
          enum: ['own', 'wishlist', 'sold', 'all'],
          description: "Item status filter. Default: own. Note: for count_by_category, status='all' falls back to 'own'.",
        },
        limit: {
          type: 'number',
          description: 'Maximum items to return (1-50, default: 10)',
        },
      },
      required: ['userId', 'question'],
    },
  },
];

// ============================================================================
// MCP Protocol Router
// ============================================================================

/**
 * Handle an incoming MCP JSON-RPC request.
 *
 * Supports the MCP tool-server protocol methods:
 * - initialize: Exchange capabilities
 * - notifications/initialized: Client acknowledgement (no response)
 * - tools/list: Return available tool definitions
 * - tools/call: Execute a tool and return results
 * - ping: Health check
 *
 * @returns JSONRPCResponse or null for notifications
 */
export async function handleMCPRequest(body: JSONRPCRequest): Promise<JSONRPCResponse | null> {
  const { method, params, id } = body;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      };

    case 'notifications/initialized':
      return null;

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: { tools: TOOL_DEFINITIONS },
      };

    case 'tools/call': {
      const toolParams = params as { name: string; arguments?: Record<string, unknown> } | undefined;
      if (!toolParams?.name) {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          error: { code: -32602, message: 'Missing tool name in params' },
        };
      }
      const result = await executeToolCall(toolParams.name, toolParams.arguments || {});
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result,
      };
    }

    case 'ping':
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {},
      };

    default: {
      // Sanitize the method name before embedding it in the error response to
      // prevent log injection from user-controlled values (CWE-117).
      const safeMethod = typeof method === 'string'
        ? method.replace(/[^\w/.-]/g, '').slice(0, 64)
        : 'unknown';
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32601, message: `Method not found: ${safeMethod}` },
      };
    }
  }
}

// ============================================================================
// Tool Execution Router
// ============================================================================

async function executeToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  try {
    switch (name) {
      case 'analyzeLoadout':
        return await handleAnalyzeLoadout(args);
      case 'searchGear':
        return await handleSearchGear(args);
      case 'inventoryInsights':
        return await handleInventoryInsights(args);
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    // Route all errors through sanitizeDbError to prevent leaking internal
    // details (table names, column info, stack traces) in the tool response.
    console.error('[MCP Server] Tool execution error:', error);
    const safeMessage = error instanceof Error ? sanitizeDbError(error) : 'Unexpected error';
    return {
      content: [{ type: 'text', text: `Tool execution failed: ${safeMessage}` }],
      isError: true,
    };
  }
}

// ============================================================================
// Tool: analyzeLoadout
// ============================================================================

async function handleAnalyzeLoadout(args: Record<string, unknown>): Promise<MCPToolResult> {
  const userId = args.userId;
  const loadoutId = args.loadoutId;

  if (!isValidUUID(userId)) {
    return errorResult('Invalid or missing userId: must be a valid UUID');
  }
  if (!isValidUUID(loadoutId)) {
    return errorResult('Invalid or missing loadoutId: must be a valid UUID');
  }

  const supabase = createServiceRoleClient();

  const { data: analysis, error } = await callRpc<AnalyzeLoadoutRPCResult>(
    supabase,
    'analyze_loadout',
    { p_loadout_id: loadoutId, p_user_id: userId }
  );

  if (error) {
    return errorResult(sanitizeDbError(error));
  }

  if (!analysis || analysis.error) {
    return {
      content: [{ type: 'text', text: analysis?.error || 'Loadout not found' }],
      isError: true,
    };
  }

  // Process the RPC result
  const loadoutMeta = analysis.loadout as Record<string, unknown>;
  const items = (analysis.items || []) as Array<Record<string, unknown>>;
  const categoryBreakdown = (analysis.categoryBreakdown || []) as Array<Record<string, unknown>>;

  const totalWeight = (analysis.totalWeight as number) || 0;
  const wornWeight = (analysis.wornWeight as number) || 0;
  const consumableWeight = (analysis.consumableWeight as number) || 0;
  // Clamp to zero: data inconsistencies can cause worn + consumable > total
  const baseWeight = Math.max(0, totalWeight - wornWeight - consumableWeight);

  // Classify weight
  const activityTypes = (loadoutMeta?.activityTypes as string[]) || [];
  const primaryActivity = activityTypes[0] || 'backpacking';
  const benchmarks = WEIGHT_BENCHMARKS[primaryActivity] || WEIGHT_BENCHMARKS.backpacking;

  let classification: string;
  if (baseWeight <= benchmarks.ultralight) classification = 'ultralight';
  else if (baseWeight <= benchmarks.lightweight) classification = 'lightweight';
  else if (baseWeight <= benchmarks.standard) classification = 'standard';
  else classification = 'heavy';

  // Identify Big 3
  const big3 = identifyBig3(items);

  // Find missing essentials
  const presentCategories = items
    .map(item => (item.parent_category_slug || item.category_slug || '') as string)
    .filter(Boolean);
  const essentialCats = ESSENTIAL_CATEGORIES[primaryActivity] || ESSENTIAL_CATEGORIES.backpacking;
  const missingEssentials = essentialCats
    .filter(cat => !presentCategories.some(pc => pc.includes(cat)))
    .map(cat => ({ category: cat, reason: `Essential for ${primaryActivity}` }));

  // Heaviest items
  const heaviestItems = items
    .filter(item => item.weight_grams && (item.weight_grams as number) > 0)
    .sort((a, b) =>
      ((b.weight_grams as number) * (b.quantity as number)) -
      ((a.weight_grams as number) * (a.quantity as number))
    )
    .slice(0, 8)
    .map(item => ({
      name: item.name as string,
      weight: formatWeight((item.weight_grams as number) * (item.quantity as number)),
      category: (item.parent_category_name || item.category_name || null) as string | null,
    }));

  // Category breakdown
  const formattedCategories = categoryBreakdown.map(cat => ({
    category: (cat.category as string) || 'Uncategorized',
    weight: formatWeight(cat.total_weight as number),
    percentage: totalWeight > 0 ? Math.round(((cat.total_weight as number) / totalWeight) * 100) : 0,
    itemCount: (cat.item_count as number) || 0,
  }));

  const result = {
    loadout: {
      name: (loadoutMeta?.name as string) || 'Unknown',
      description: (loadoutMeta?.description as string | null) || null,
      activityTypes,
      seasons: (loadoutMeta?.seasons as string[]) || [],
    },
    weight: {
      total: formatWeight(totalWeight),
      base: formatWeight(baseWeight),
      worn: formatWeight(wornWeight),
      consumable: formatWeight(consumableWeight),
      classification,
    },
    big3: {
      shelter: big3.shelter ? { name: big3.shelter.name, weight: formatWeight(big3.shelter.weight) } : null,
      sleepSystem: big3.sleepSystem ? { name: big3.sleepSystem.name, weight: formatWeight(big3.sleepSystem.weight) } : null,
      pack: big3.pack ? { name: big3.pack.name, weight: formatWeight(big3.pack.weight) } : null,
      totalWeight: formatWeight(big3.totalWeight),
      percentageOfTotal: big3.percentage,
    },
    categoryBreakdown: formattedCategories,
    missingEssentials,
    heaviestItems,
    itemCount: items.length,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

// ============================================================================
// Tool: searchGear
// ============================================================================

async function handleSearchGear(args: Record<string, unknown>): Promise<MCPToolResult> {
  const rawQuery = args.query;
  const scope = (args.scope as string) || 'all';
  const filters = args.filters as Record<string, unknown> | undefined;
  const limit = Math.min(Math.max((args.limit as number) || 10, 1), 30);

  if (!isValidUUID(args.userId)) {
    return errorResult('Invalid or missing userId: must be a valid UUID');
  }
  const userId = args.userId;

  if (typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
    return errorResult('Missing or empty query parameter');
  }

  // Sanitize query to prevent ILIKE/PostgREST injection
  const query = sanitizeSearchQuery(rawQuery);
  if (query.length === 0) {
    return errorResult('Query contains only special characters');
  }

  // Use original query for category resolution (matches slugs, not ILIKE)
  const categorySearchTerm = (rawQuery as string).slice(0, MAX_QUERY_LENGTH).trim();

  const supabase = createServiceRoleClient();
  const results: { myGear?: unknown[]; catalogProducts?: unknown[] } = {};

  // Build independent search tasks and run them in parallel when scope === 'all'
  // to halve latency for the common case.
  const searchTasks: Promise<void>[] = [];

  // Search user inventory
  if (scope === 'my_gear' || scope === 'all') {
    searchTasks.push(
      (async () => {
        // Resolve category IDs for i18n-aware search (uses exact matching, not ILIKE)
        const categoryIds = await resolveCategoryIds(supabase, categorySearchTerm);

        let gearQuery = supabase
          .from('gear_items')
          .select('id, name, brand, weight_grams, price_paid, status, product_type_id, categories!gear_items_product_type_id_fkey(label)')
          .eq('user_id', userId);

        if (categoryIds.length > 0) {
          const orFilters = [
            `name.ilike.%${query}%`,
            `brand.ilike.%${query}%`,
            `notes.ilike.%${query}%`,
            `product_type_id.in.(${categoryIds.join(',')})`,
          ];
          gearQuery = gearQuery.or(orFilters.join(','));
        } else {
          gearQuery = gearQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%,notes.ilike.%${query}%`);
        }

        // Validate status filter against allowed values
        const allowedStatuses = ['own', 'wishlist', 'sold', 'all'];
        const statusFilter = allowedStatuses.includes(filters?.status as string)
          ? (filters?.status as string)
          : 'own';
        if (statusFilter !== 'all') {
          gearQuery = gearQuery.eq('status', resolveStatus(statusFilter));
        }
        if (typeof filters?.maxWeight === 'number' && Number.isFinite(filters.maxWeight)) {
          gearQuery = gearQuery.lte('weight_grams', filters.maxWeight);
        }
        if (typeof filters?.minWeight === 'number' && Number.isFinite(filters.minWeight)) {
          gearQuery = gearQuery.gte('weight_grams', filters.minWeight);
        }
        if (typeof filters?.maxPrice === 'number' && Number.isFinite(filters.maxPrice)) {
          gearQuery = gearQuery.lte('price_paid', filters.maxPrice);
        }

        gearQuery = gearQuery.order('name', { ascending: true }).limit(limit);

        const { data, error } = await gearQuery;
        if (!error && data) {
          results.myGear = (data as GearItemSearchRow[]).map((item) => ({
            id: item.id,
            name: item.name,
            brand: item.brand || null,
            weightGrams: item.weight_grams || null,
            pricePaid: item.price_paid || null,
            category: item.categories?.label || null,
            status: item.status || 'own',
          }));
        }
      })()
    );
  }

  // Search product catalog
  if (scope === 'catalog' || scope === 'all') {
    searchTasks.push(
      (async () => {
        let catalogQuery = supabase
          .from('catalog_products')
          .select('id, name, product_type, description, price_usd, weight_grams, catalog_brands(name)')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,product_type.ilike.%${query}%`);

        if (typeof filters?.maxWeight === 'number' && Number.isFinite(filters.maxWeight)) {
          catalogQuery = catalogQuery.lte('weight_grams', filters.maxWeight);
        }
        if (typeof filters?.minWeight === 'number' && Number.isFinite(filters.minWeight)) {
          catalogQuery = catalogQuery.gte('weight_grams', filters.minWeight);
        }
        if (typeof filters?.maxPrice === 'number' && Number.isFinite(filters.maxPrice)) {
          catalogQuery = catalogQuery.lte('price_usd', filters.maxPrice);
        }

        catalogQuery = catalogQuery.order('name', { ascending: true }).limit(limit);

        const { data, error } = await catalogQuery;
        if (!error && data) {
          results.catalogProducts = (data as CatalogProductSearchRow[]).map((item) => ({
            id: item.id,
            name: item.name,
            brand: item.catalog_brands?.name || null,
            weightGrams: item.weight_grams || null,
            priceUsd: item.price_usd || null,
            productType: item.product_type || null,
            description: item.description || null,
          }));
        }
      })()
    );
  }

  // Await all search tasks in parallel
  await Promise.all(searchTasks);

  const myGearCount = results.myGear?.length || 0;
  const catalogCount = results.catalogProducts?.length || 0;
  const totalResults = myGearCount + catalogCount;

  const summaryParts: string[] = [];
  if (myGearCount > 0) summaryParts.push(`${myGearCount} items in inventory`);
  if (catalogCount > 0) summaryParts.push(`${catalogCount} catalog products`);
  if (totalResults === 0) summaryParts.push(`No results for "${query}"`);

  const result = {
    summary: summaryParts.join(', '),
    totalResults,
    ...(results.myGear && { myGear: results.myGear }),
    ...(results.catalogProducts && { catalogProducts: results.catalogProducts }),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

// ============================================================================
// Tool: inventoryInsights
// ============================================================================

async function handleInventoryInsights(args: Record<string, unknown>): Promise<MCPToolResult> {
  const question = args.question as string | undefined;
  const category = args.category as string | undefined;
  const limit = Math.min(Math.max((args.limit as number) || 10, 1), 50);

  if (!isValidUUID(args.userId)) {
    return errorResult('Invalid or missing userId: must be a valid UUID');
  }
  const userId = args.userId;

  const allowedQuestions = [
    'overview', 'count_by_category', 'heaviest_items', 'lightest_items',
    'brand_breakdown', 'weight_distribution', 'value_summary', 'recent_additions',
  ];
  if (!question || !allowedQuestions.includes(question)) {
    return errorResult(`Invalid or missing question. Must be one of: ${allowedQuestions.join(', ')}`);
  }

  // Validate status against allowed values
  const allowedStatuses = ['own', 'wishlist', 'sold', 'all'];
  const status = allowedStatuses.includes(args.status as string) ? (args.status as string) : 'own';

  const supabase = createServiceRoleClient();

  switch (question) {
    case 'overview': {
      const { data, error } = await callRpc<Record<string, unknown>>(
        supabase,
        'get_inventory_intelligence',
        { p_user_id: userId }
      );
      if (error) return errorResult(sanitizeDbError(error));

      const stats = data as Record<string, unknown>;
      return textResult({
        totalOwned: stats.totalOwned,
        totalWishlist: stats.totalWishlist,
        totalWeight: formatWeight(stats.totalWeight as number),
        brandCount: stats.brandCount,
        summary: `${stats.totalOwned} items owned, ${stats.totalWishlist || 0} on wishlist, total weight: ${formatWeight(stats.totalWeight as number)}, ${stats.brandCount} brands`,
      });
    }

    case 'count_by_category': {
      if (!category || typeof category !== 'string' || category.trim().length === 0) {
        return errorResult('Missing "category" parameter for count_by_category');
      }
      const sanitizedCategory = category.slice(0, MAX_QUERY_LENGTH).trim();
      // NOTE: The count_items_by_category RPC does not support status='all'.
      // When status='all' is requested we fall back to 'own' to maintain
      // consistent behavior. This is documented in the tool schema description.
      const { data, error } = await callRpc<Record<string, unknown>>(
        supabase,
        'count_items_by_category',
        {
          p_user_id: userId,
          p_search_term: sanitizedCategory,
          p_status: status === 'all' ? 'own' : status,
        }
      );
      if (error) return errorResult(sanitizeDbError(error));

      const result = data as Record<string, unknown>;
      return textResult(result);
    }

    case 'heaviest_items':
    case 'lightest_items': {
      const ascending = question === 'lightest_items';
      const { data, error } = await supabase
        .from('gear_items')
        .select('id, name, brand, weight_grams, categories!gear_items_product_type_id_fkey(label)')
        .eq('user_id', userId)
        .eq('status', resolveStatus(status))
        .not('weight_grams', 'is', null)
        .gt('weight_grams', 0)
        .order('weight_grams', { ascending })
        .limit(limit);

      if (error) return errorResult(sanitizeDbError(error));

      const items = (data as WeightedItemRow[] || []).map((item, idx) => ({
        rank: idx + 1,
        name: item.name,
        brand: item.brand || null,
        weight: formatWeight(item.weight_grams),
        weightGrams: item.weight_grams,
        category: item.categories?.label || null,
      }));

      return textResult({ items, count: items.length });
    }

    case 'brand_breakdown': {
      // Selects only the two columns required for in-memory aggregation.
      // TODO: For very large inventories, consider a Supabase RPC with
      // `GROUP BY brand` to push aggregation to the database side.
      const { data, error } = await supabase
        .from('gear_items')
        .select('brand, weight_grams')
        .eq('user_id', userId)
        .eq('status', resolveStatus(status))
        .not('brand', 'is', null);

      if (error) return errorResult(sanitizeDbError(error));

      const brandMap = new Map<string, { count: number; totalWeight: number }>();
      for (const item of (data as BrandRow[] || [])) {
        const brand = item.brand || 'Unknown';
        const existing = brandMap.get(brand) || { count: 0, totalWeight: 0 };
        existing.count++;
        existing.totalWeight += (item.weight_grams || 0);
        brandMap.set(brand, existing);
      }

      const brands = Array.from(brandMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit)
        .map(([brand, stats]) => ({
          brand,
          itemCount: stats.count,
          totalWeight: formatWeight(stats.totalWeight),
        }));

      return textResult({ brands, totalBrands: brandMap.size });
    }

    case 'weight_distribution': {
      const { data, error } = await supabase
        .from('gear_items')
        .select('weight_grams')
        .eq('user_id', userId)
        .eq('status', resolveStatus(status))
        .not('weight_grams', 'is', null)
        .gt('weight_grams', 0);

      if (error) return errorResult(sanitizeDbError(error));

      const weights = (data as WeightDistRow[] || []).map(i => i.weight_grams).sort((a, b) => a - b);
      if (weights.length === 0) {
        return textResult({ message: 'No items with weight data found' });
      }

      const total = weights.reduce((s, w) => s + w, 0);
      return textResult({
        count: weights.length,
        total: formatWeight(total),
        min: formatWeight(weights[0]),
        max: formatWeight(weights[weights.length - 1]),
        average: formatWeight(Math.round(total / weights.length)),
        median: formatWeight(weights[Math.floor(weights.length / 2)]),
        under100g: weights.filter(w => w < 100).length,
        under500g: weights.filter(w => w < 500).length,
        over1kg: weights.filter(w => w > 1000).length,
      });
    }

    case 'value_summary': {
      const { data, error } = await supabase
        .from('gear_items')
        .select('price_paid, currency')
        .eq('user_id', userId)
        .eq('status', resolveStatus(status))
        .not('price_paid', 'is', null)
        .gt('price_paid', 0);

      if (error) return errorResult(sanitizeDbError(error));

      const currencyTotals = new Map<string, { total: number; count: number }>();
      for (const item of (data as ValueRow[] || [])) {
        const currency = item.currency || 'EUR';
        const existing = currencyTotals.get(currency) || { total: 0, count: 0 };
        existing.total += item.price_paid ?? 0;
        existing.count++;
        currencyTotals.set(currency, existing);
      }

      const byCurrency = Array.from(currencyTotals.entries()).map(([currency, stats]) => ({
        currency,
        total: Number(stats.total.toFixed(2)),
        itemCount: stats.count,
      }));

      return textResult({ byCurrency, totalItemsWithPrice: (data || []).length });
    }

    case 'recent_additions': {
      const { data, error } = await supabase
        .from('gear_items')
        .select('id, name, brand, weight_grams, created_at, categories!gear_items_product_type_id_fkey(label)')
        .eq('user_id', userId)
        .eq('status', resolveStatus(status))
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return errorResult(sanitizeDbError(error));

      const items = (data as RecentItemRow[] || []).map((item) => ({
        name: item.name,
        brand: item.brand || null,
        weight: item.weight_grams ? formatWeight(item.weight_grams) : null,
        category: item.categories?.label || null,
        addedAt: item.created_at,
      }));

      return textResult({ items, count: items.length });
    }

    default:
      return errorResult(`Unknown question type: ${question}`);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function identifyBig3(items: Array<Record<string, unknown>>) {
  const findBig3Item = (patterns: string[]) => {
    const matching = items.filter(item => {
      const catSlug = ((item.parent_category_slug || item.category_slug || '') as string).toLowerCase();
      return patterns.some(p => catSlug.includes(p));
    });
    if (matching.length === 0) return null;
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

/**
 * Resolve a category search term to matching category IDs.
 * Supports English and German search terms via i18n translations.
 *
 * Uses a module-level TTL cache (5 min) to avoid fetching the full `categories`
 * table on every `searchGear` call. The cache resets on cold starts, which is
 * acceptable for a serverless environment since categories are rarely updated.
 */
async function resolveCategoryIds(
  supabase: ReturnType<typeof createServiceRoleClient>,
  searchTerm: string
): Promise<string[]> {
  const searchLower = searchTerm.toLowerCase();

  // Populate cache if missing or expired
  const now = Date.now();
  if (!_categoryCache || now > _categoryCache.expiresAt) {
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, label, parent_id, i18n');

    if (error || !data || data.length === 0) return [];

    _categoryCache = {
      data: data as CategoryRow[],
      expiresAt: now + CATEGORY_CACHE_TTL_MS,
    };
  }

  const allCategories = _categoryCache.data;
  const matchingIds = new Set<string>();

  for (const cat of allCategories) {
    const fields: string[] = [
      cat.slug,
      cat.label,
      ...(typeof cat.i18n === 'object' && cat.i18n !== null
        ? Object.values(cat.i18n)
        : []),
    ].filter((f): f is string => typeof f === 'string');

    if (fields.some(f => f.toLowerCase().includes(searchLower))) {
      matchingIds.add(cat.id);
    }
  }

  // Include descendant categories
  let prevSize = 0;
  while (matchingIds.size > prevSize) {
    prevSize = matchingIds.size;
    for (const cat of allCategories) {
      if (cat.parent_id && matchingIds.has(cat.parent_id)) {
        matchingIds.add(cat.id);
      }
    }
  }

  return Array.from(matchingIds);
}

function textResult(data: unknown): MCPToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): MCPToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}
