/**
 * Tool Executor with Retry Logic
 * Feature 050: AI Assistant - Phase 2A
 *
 * Executes individual tools with exponential backoff retry,
 * timeout handling, and error classification.
 */

import { searchCommunityOffers, quickCommunitySearch, CommunityMatch } from './community-search';
import { calculateBaseWeight, getCategoryBreakdowns, getUserGearList, searchCatalogForQuery } from './inventory-analyzer';
import { createClient } from '@/lib/supabase/server';

// =====================================================
// Types
// =====================================================

/**
 * Tool execution configuration
 */
export interface ToolExecutionConfig {
  maxAttempts: number;
  timeoutMs: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  data: unknown;
  error: string | null;
  attempts: number;
  retryable: boolean;
}

/**
 * Context for tool execution
 */
export interface ToolContext {
  userId: string;
  locale: string;
  conversationId?: string;
}

/**
 * Error classification for retry logic
 */
export type ErrorClass = 'retryable' | 'non-retryable' | 'timeout';

// =====================================================
// Error Classification
// =====================================================

/**
 * Classify an error to determine if it should be retried
 */
function classifyError(error: Error): ErrorClass {
  const message = error.message.toLowerCase();

  // Timeout errors - retryable
  if (message.includes('timeout') || message.includes('aborted')) {
    return 'timeout';
  }

  // Network errors - retryable
  if (
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('socket hang up') ||
    message.includes('fetch failed')
  ) {
    return 'retryable';
  }

  // Server errors (5xx) - retryable
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('internal server error')
  ) {
    return 'retryable';
  }

  // Rate limit errors - retryable with longer delay
  if (message.includes('429') || message.includes('rate limit')) {
    return 'retryable';
  }

  // Client errors (4xx) - not retryable
  if (
    message.includes('400') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404') ||
    message.includes('invalid') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return 'non-retryable';
  }

  // Unknown errors - default to retryable for resilience
  return 'retryable';
}

// =====================================================
// Tool Registry
// =====================================================

/**
 * Registry of available tools and their implementations
 */
const toolRegistry: Record<string, (args: Record<string, unknown>, context: ToolContext) => Promise<unknown>> = {
  /**
   * Search catalog for gear products
   */
  async searchCatalog(args, context) {
    const query = args.query as string;
    if (!query) {
      throw new Error('searchCatalog requires a query parameter');
    }

    const supabase = await createClient();

    // Build filters from args
    const filters: Record<string, unknown> = {};
    if (args.category) filters.category_main = args.category;
    if (args.maxWeight) filters.weight_max = args.maxWeight;
    if (args.maxPrice) filters.price_max = args.maxPrice;
    if (args.brand) filters.brand = args.brand;

    // Search catalog products
    let queryBuilder = supabase
      .from('catalog_products')
      .select(`
        id,
        name,
        category_main,
        subcategory,
        product_type,
        description,
        price_usd,
        weight_grams,
        catalog_brands!catalog_products_brand_id_fkey (
          id,
          name
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    // Apply filters
    if (filters.category_main && typeof filters.category_main === 'string') {
      queryBuilder = queryBuilder.eq('category_main', filters.category_main);
    }
    if (filters.weight_max && typeof filters.weight_max === 'number') {
      queryBuilder = queryBuilder.lte('weight_grams', filters.weight_max);
    }
    if (filters.price_max && typeof filters.price_max === 'number') {
      queryBuilder = queryBuilder.lte('price_usd', filters.price_max);
    }

    const limit = typeof args.limit === 'number' ? Math.min(args.limit, 20) : 10;
    queryBuilder = queryBuilder.limit(limit);

    const { data, error } = await queryBuilder;

    if (error) {
      throw new Error(`Catalog search failed: ${error.message}`);
    }

    return {
      results: data || [],
      count: data?.length || 0,
      query,
    };
  },

  /**
   * Compare multiple gear items
   */
  async compareItems(args, context) {
    const itemIds = args.itemIds as string[];
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length < 2) {
      throw new Error('compareItems requires at least 2 itemIds');
    }

    if (itemIds.length > 4) {
      throw new Error('compareItems supports maximum 4 items');
    }

    const supabase = await createClient();

    const { data: items, error } = await supabase
      .from('gear_items')
      .select(`
        id,
        name,
        brand,
        weight_grams,
        price_paid,
        currency,
        category_id,
        primary_image_url,
        categories(label, i18n)
      `)
      .in('id', itemIds);

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    if (!items || items.length === 0) {
      return {
        items: [],
        comparison: null,
      };
    }

    // Build comparison data
    const comparison = {
      lightest: items.reduce((min, item) =>
        (item.weight_grams || Infinity) < (min.weight_grams || Infinity) ? item : min
      ),
      heaviest: items.reduce((max, item) =>
        (item.weight_grams || 0) > (max.weight_grams || 0) ? item : max
      ),
      cheapest: items.reduce((min, item) =>
        (item.price_paid || Infinity) < (min.price_paid || Infinity) ? item : min
      ),
      mostExpensive: items.reduce((max, item) =>
        (item.price_paid || 0) > (max.price_paid || 0) ? item : max
      ),
      weightDifference: Math.abs(
        (items[0]?.weight_grams || 0) - (items[1]?.weight_grams || 0)
      ),
    };

    return {
      items,
      comparison,
    };
  },

  /**
   * Search community for available gear
   */
  async searchCommunity(args, context) {
    const query = args.query as string;
    if (!query) {
      throw new Error('searchCommunity requires a query parameter');
    }

    const matches = await quickCommunitySearch(context.userId, {
      name: query,
      maxWeight: args.maxWeight as number | undefined,
      maxPrice: args.maxPrice as number | undefined,
    });

    return {
      matches,
      count: matches.length,
      query,
    };
  },

  /**
   * Add item to wishlist
   */
  async addToWishlist(args, context) {
    const gearItemId = args.gearItemId as string;
    if (!gearItemId) {
      throw new Error('addToWishlist requires a gearItemId');
    }

    const supabase = await createClient();

    // First check if item exists in catalog
    const { data: catalogItem, error: catalogError } = await supabase
      .from('catalog_products')
      .select('id, name, brand_id')
      .eq('id', gearItemId)
      .single();

    if (catalogError && catalogError.code !== 'PGRST116') {
      throw new Error(`Failed to check catalog: ${catalogError.message}`);
    }

    // Create wishlist item - use raw insert with type assertion
    const { data, error } = await supabase
      .from('gear_items')
      .insert({
        user_id: context.userId,
        status: 'wishlist' as const,
        name: catalogItem?.name || 'Wishlist Item',
        source_catalog_id: gearItemId,
      })
      .select('id, name')
      .single();

    if (error) {
      throw new Error(`Failed to add to wishlist: ${error.message}`);
    }

    return {
      added: true,
      wishlistItemId: (data as { id: string; name: string }).id,
      name: (data as { id: string; name: string }).name,
    };
  },

  /**
   * Get user's inventory analysis
   */
  async analyzeInventory(args, context) {
    const analysis = await calculateBaseWeight(context.userId);
    return analysis;
  },

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(args, context) {
    const breakdowns = await getCategoryBreakdowns(context.userId);
    return {
      categories: breakdowns,
      count: breakdowns.length,
    };
  },

  /**
   * Navigate to a page (returns navigation intent)
   */
  async navigate(args) {
    const destination = args.destination as string;
    if (!destination) {
      throw new Error('navigate requires a destination');
    }

    // Map friendly names to routes
    const routeMap: Record<string, string> = {
      inventory: '/inventory',
      loadouts: '/loadouts',
      wishlist: '/wishlist',
      community: '/community',
      profile: '/profile',
      settings: '/settings',
    };

    const route = routeMap[destination.toLowerCase()] || destination;

    return {
      action: 'navigate',
      route,
      destination,
    };
  },

  /**
   * Send message to user (returns message intent)
   */
  async sendMessage(args, context) {
    const recipientUserId = args.recipientUserId as string;
    const messagePreview = args.messagePreview as string;

    if (!recipientUserId) {
      throw new Error('sendMessage requires a recipientUserId');
    }

    // Return intent for UI to handle (actual message creation is user-confirmed)
    return {
      action: 'open_message_composer',
      recipientUserId,
      messagePreview: messagePreview?.substring(0, 100) || '',
    };
  },
};

// =====================================================
// Main Executor
// =====================================================

/**
 * Execute a tool with retry logic and timeout handling
 *
 * @param tool - Tool name to execute
 * @param args - Arguments for the tool
 * @param context - Execution context (userId, locale)
 * @param config - Retry and timeout configuration
 * @returns Tool execution result
 */
export async function executeToolWithRetry(
  tool: string,
  args: Record<string, unknown>,
  context: ToolContext,
  config: ToolExecutionConfig
): Promise<ToolExecutionResult> {
  const {
    maxAttempts = 3,
    timeoutMs = 30000,
    initialDelayMs = 500,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
  } = config;

  const toolFn = toolRegistry[tool];

  if (!toolFn) {
    return {
      success: false,
      data: null,
      error: `Unknown tool: ${tool}`,
      attempts: 0,
      retryable: false,
    };
  }

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Execute tool with timeout
        const resultPromise = toolFn(args, context);

        // Race against timeout
        const result = await Promise.race([
          resultPromise,
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
            });
          }),
        ]);

        clearTimeout(timeoutId);

        return {
          success: true,
          data: result,
          error: null,
          attempts: attempt,
          retryable: false,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorClass = classifyError(lastError);

      // Log attempt
      console.warn(
        `Tool ${tool} attempt ${attempt}/${maxAttempts} failed:`,
        lastError.message
      );

      // Don't retry if error is non-retryable
      if (errorClass === 'non-retryable') {
        return {
          success: false,
          data: null,
          error: lastError.message,
          attempts: attempt,
          retryable: false,
        };
      }

      // If we have more attempts, wait before retrying
      if (attempt < maxAttempts) {
        const delay = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts exhausted
  return {
    success: false,
    data: null,
    error: lastError?.message || 'Unknown error',
    attempts: attempt,
    retryable: true, // Could be retried with different parameters
  };
}

/**
 * Get list of available tools
 */
export function getAvailableTools(): string[] {
  return Object.keys(toolRegistry);
}

/**
 * Check if a tool exists
 */
export function isValidTool(tool: string): boolean {
  return tool in toolRegistry;
}
