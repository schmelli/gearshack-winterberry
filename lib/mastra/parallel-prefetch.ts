/**
 * Parallel Pre-Fetch Pipeline
 * Feature: 060-ai-agent-evolution
 *
 * Executes all data requirements from the Intent Router in parallel,
 * returning a complete context object that can be injected into the
 * LLM prompt for zero-tool-call responses.
 *
 * @see specs/060-ai-agent-evolution/analysis.md
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logDebug, logInfo, logWarn, createTimer } from './logging';
import type { DataRequirement } from './intent-router';
import pLimit from 'p-limit';
import { formatWeight } from './tools/utils';
import { PREFETCH_CONFIG } from './config';

// =============================================================================
// Types
// =============================================================================

/** Result from a single pre-fetch operation */
interface PrefetchResult {
  type: string;
  success: boolean;
  data: unknown;
  latencyMs: number;
  error?: string;
}

/** Complete pre-fetched context for LLM injection */
export interface PrefetchedContext {
  /** All fetched data keyed by requirement type */
  results: Record<string, unknown>;
  /** Whether all requirements were fulfilled */
  complete: boolean;
  /** Total pre-fetch latency (parallel, so max of individual) */
  totalLatencyMs: number;
  /** Individual result details */
  details: PrefetchResult[];
  /** Pre-formatted context string for prompt injection */
  formattedContext: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Timeout for individual pre-fetch operations */
const PREFETCH_TIMEOUT_MS = PREFETCH_CONFIG.TIMEOUT_MS;

/** Maximum concurrent pre-fetch operations to prevent connection pool exhaustion */
const MAX_CONCURRENT_PREFETCH = PREFETCH_CONFIG.MAX_CONCURRENT;

// =============================================================================
// Main Pre-Fetch Function
// =============================================================================

/**
 * Execute all data requirements in parallel
 *
 * @param requirements - Data requirements from intent router
 * @param userId - Current user ID
 * @param locale - User locale for formatting
 * @returns Pre-fetched context with all results
 */
export async function prefetchData(
  requirements: DataRequirement[],
  userId: string,
  locale: string = 'en'
): Promise<PrefetchedContext> {
  const getElapsed = createTimer();

  if (requirements.length === 0) {
    return {
      results: {},
      complete: true,
      totalLatencyMs: 0,
      details: [],
      formattedContext: '',
    };
  }

  logDebug('Starting parallel pre-fetch', {
    userId,
    metadata: { requirementCount: requirements.length },
  });

  // Execute all requirements in parallel with concurrency limit to prevent overwhelming the connection pool
  const limit = pLimit(MAX_CONCURRENT_PREFETCH);
  const results = await Promise.allSettled(
    requirements.map(req => limit(() => executeRequirement(req, userId)))
  );

  // Collect results
  const details: PrefetchResult[] = [];
  const data: Record<string, unknown> = {};

  results.forEach((result, index) => {
    const req = requirements[index];
    if (result.status === 'fulfilled') {
      details.push(result.value);
      if (result.value.success) {
        // Use type + index as key to handle duplicates
        const key = requirements.filter((r, i) => i < index && r.type === req.type).length > 0
          ? `${req.type}_${index}`
          : req.type;
        data[key] = result.value.data;
      }
    } else {
      details.push({
        type: req.type,
        success: false,
        data: null,
        latencyMs: 0,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      });
    }
  });

  const complete = details.every(d => d.success);
  const totalLatencyMs = getElapsed();

  // Format for prompt injection
  const formattedContext = formatPrefetchedContext(data, locale);

  logInfo('Parallel pre-fetch completed', {
    userId,
    metadata: {
      requirementCount: requirements.length,
      successCount: details.filter(d => d.success).length,
      totalLatencyMs,
      complete,
    },
  });

  return {
    results: data,
    complete,
    totalLatencyMs,
    details,
    formattedContext,
  };
}

// =============================================================================
// Individual Requirement Executors
// =============================================================================

/**
 * Execute a single data requirement with timeout
 */
async function executeRequirement(
  requirement: DataRequirement,
  userId: string
): Promise<PrefetchResult> {
  const getElapsed = createTimer();
  const { type, params } = requirement;

  try {
    const result = await Promise.race([
      executeRequirementInternal(type, params || {}, userId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Pre-fetch timeout for ${type}`)), PREFETCH_TIMEOUT_MS)
      ),
    ]);

    return {
      type,
      success: true,
      data: result,
      latencyMs: getElapsed(),
    };
  } catch (error) {
    logWarn(`Pre-fetch failed for ${type}`, {
      userId,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown',
        latencyMs: getElapsed(),
      },
    });

    return {
      type,
      success: false,
      data: null,
      latencyMs: getElapsed(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Internal execution logic for each requirement type
 */
async function executeRequirementInternal(
  type: string,
  params: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  const supabase = createServiceRoleClient();

  switch (type) {
    case 'inventory_stats': {
      // Type assertion needed: RPC function types not yet regenerated for new migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_inventory_intelligence', {
        p_user_id: userId,
      });
      if (error) throw new Error(`inventory_stats: ${error.message}`);
      return data;
    }

    case 'inventory_category': {
      const searchTerm = params.searchTerm as string;
      // Type assertion needed: RPC function types not yet regenerated for new migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('count_items_by_category', {
        p_user_id: userId,
        p_search_term: searchTerm,
        p_status: 'own',
      });
      if (error) throw new Error(`inventory_category: ${error.message}`);
      return data;
    }

    case 'loadout_analysis': {
      const loadoutId = params.loadoutId as string;
      if (!loadoutId) throw new Error('loadout_analysis: loadoutId required');
      // Type assertion needed: RPC function types not yet regenerated for new migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('analyze_loadout', {
        p_loadout_id: loadoutId,
        p_user_id: userId,
      });
      if (error) throw new Error(`loadout_analysis: ${error.message}`);
      return data;
    }

    case 'gear_items_filtered': {
      const query = supabase
        .from('gear_items')
        .select('id, name, brand, weight_grams, price_paid, category_id, status, notes')
        .eq('user_id', userId);

      if (params.status) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query.eq('status', params.status as any);
      }
      if (params.category_id) {
        query.eq('category_id', params.category_id as string);
      }

      const { data, error } = await query.order('weight_grams', { ascending: true }).limit(50);
      if (error) throw new Error(`gear_items_filtered: ${error.message}`);
      return data;
    }

    case 'category_tree': {
      const { data, error } = await supabase
        .from('categories')
        .select('id, label, slug, level, parent_id, i18n')
        .order('level', { ascending: true })
        .order('label', { ascending: true });
      if (error) throw new Error(`category_tree: ${error.message}`);
      return data;
    }

    case 'geargraph_products': {
      // Query catalog products (GearGraph data synced to Supabase)
      const name = params.name as string;
      const brand = params.brand as string | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from('catalog_products')
        .select('id, name, product_type, description, price_usd, weight_grams, brand_id')
        .ilike('name', `%${name}%`)
        .limit(5);

      if (brand) {
        // Join with brand table if brand specified
        query = supabase
          .from('catalog_products')
          .select('id, name, product_type, description, price_usd, weight_grams, brand_id, catalog_brands!inner(name)')
          .ilike('name', `%${name}%`)
          .ilike('catalog_brands.name', `%${brand}%`)
          .limit(5);
      }

      const { data, error } = await query;
      if (error) throw new Error(`geargraph_products: ${error.message}`);
      return data;
    }

    case 'web_search': {
      // Use the search-web tool's standalone function
      const { executeSearchWeb } = await import('./tools/search-web');
      const searchQuery = params.query as string;
      const result = await executeSearchWeb({
        query: searchQuery,
        searchType: 'conditions',
        maxResults: 3,
        freshness: 'month',
      });
      return result;
    }

    default:
      throw new Error(`Unknown requirement type: ${type}`);
  }
}

// =============================================================================
// Context Formatting
// =============================================================================

/**
 * Format pre-fetched data into a human-readable context string
 * for injection into the LLM system prompt
 */
function formatPrefetchedContext(
  data: Record<string, unknown>,
  locale: string
): string {
  const isGerman = locale === 'de';
  const sections: string[] = [];

  // Inventory stats
  if (data.inventory_stats) {
    const stats = data.inventory_stats as Record<string, unknown>;
    const header = isGerman ? '**Inventar-Übersicht:**' : '**Inventory Overview:**';
    sections.push(header);
    sections.push(`- ${isGerman ? 'Besitz' : 'Owned'}: ${stats.totalOwned} items`);
    sections.push(`- ${isGerman ? 'Wunschliste' : 'Wishlist'}: ${stats.totalWishlist} items`);
    sections.push(`- ${isGerman ? 'Gesamtgewicht' : 'Total weight'}: ${formatWeight(stats.totalWeight as number)}`);
    sections.push(`- ${isGerman ? 'Gesamtwert' : 'Total value'}: ${stats.totalValue}`);
    sections.push(`- ${isGerman ? 'Marken' : 'Brands'}: ${stats.brandCount}`);

    if (stats.categoryBreakdown && Array.isArray(stats.categoryBreakdown)) {
      sections.push(`\n${isGerman ? '**Kategorien:**' : '**Categories:**'}`);
      for (const cat of stats.categoryBreakdown as Array<Record<string, unknown>>) {
        sections.push(`  - ${cat.category_name}: ${cat.item_count} items, ${formatWeight(cat.total_weight as number)}`);
      }
    }

    if (stats.heaviestItems && Array.isArray(stats.heaviestItems)) {
      sections.push(`\n${isGerman ? '**Schwerste Items:**' : '**Heaviest Items:**'}`);
      for (const item of (stats.heaviestItems as Array<Record<string, unknown>>).slice(0, 5)) {
        sections.push(`  - ${item.name} (${item.brand}): ${formatWeight(item.weight_grams as number)}`);
      }
    }
  }

  // Category count
  if (data.inventory_category) {
    const catData = data.inventory_category as Record<string, unknown>;
    sections.push(`\n${isGerman ? '**Kategorie-Ergebnis' : '**Category Result'} "${catData.searchTerm}":**`);
    sections.push(`${isGerman ? 'Anzahl' : 'Count'}: ${catData.count}`);
    if (catData.items && Array.isArray(catData.items)) {
      for (const item of catData.items as Array<Record<string, unknown>>) {
        sections.push(`  - ${item.name} (${item.brand || '?'}): ${item.weight_grams ? formatWeight(item.weight_grams as number) : 'no weight'}`);
      }
    }
  }

  // Loadout analysis
  if (data.loadout_analysis) {
    const loadout = data.loadout_analysis as Record<string, unknown>;
    if (loadout.error) {
      sections.push(`\n${isGerman ? '**Loadout-Fehler:**' : '**Loadout Error:**'} ${loadout.error}`);
    } else {
      const meta = loadout.loadout as Record<string, unknown>;
      sections.push(`\n${isGerman ? '**Loadout-Analyse:**' : '**Loadout Analysis:**'}`);
      sections.push(`- Name: ${meta?.name || 'Unknown'}`);
      sections.push(`- ${isGerman ? 'Aktivitäten' : 'Activities'}: ${JSON.stringify(meta?.activityTypes || [])}`);
      sections.push(`- ${isGerman ? 'Jahreszeiten' : 'Seasons'}: ${JSON.stringify(meta?.seasons || [])}`);
      sections.push(`- ${isGerman ? 'Gesamtgewicht' : 'Total weight'}: ${formatWeight(loadout.totalWeight as number)}`);
      sections.push(`- ${isGerman ? 'Getragenes Gewicht' : 'Worn weight'}: ${formatWeight(loadout.wornWeight as number)}`);
      sections.push(`- ${isGerman ? 'Basisgewicht' : 'Base weight'}: ${formatWeight((loadout.totalWeight as number) - (loadout.wornWeight as number) - (loadout.consumableWeight as number))}`);
      sections.push(`- ${isGerman ? 'Verbrauchsgüter' : 'Consumable weight'}: ${formatWeight(loadout.consumableWeight as number)}`);
      sections.push(`- ${isGerman ? 'Anzahl Items' : 'Item count'}: ${loadout.itemCount}`);

      if (loadout.items && Array.isArray(loadout.items)) {
        sections.push(`\n${isGerman ? '**Items (nach Gewicht sortiert):**' : '**Items (sorted by weight):**'}`);
        for (const item of loadout.items as Array<Record<string, unknown>>) {
          const worn = item.is_worn ? (isGerman ? ' [getragen]' : ' [worn]') : '';
          const consumable = item.is_consumable ? (isGerman ? ' [Verbrauch]' : ' [consumable]') : '';
          const qty = (item.quantity as number) > 1 ? ` x${item.quantity}` : '';
          sections.push(`  - ${item.name} (${item.brand || '?'}): ${item.weight_grams ? formatWeight(item.weight_grams as number) : '?'}${qty}${worn}${consumable} [${item.parent_category_name || item.category_name || '?'}]`);
        }
      }

      if (loadout.categoryBreakdown && Array.isArray(loadout.categoryBreakdown)) {
        sections.push(`\n${isGerman ? '**Gewicht nach Kategorie:**' : '**Weight by Category:**'}`);
        for (const cat of loadout.categoryBreakdown as Array<Record<string, unknown>>) {
          const pct = loadout.totalWeight
            ? Math.round(((cat.total_weight as number) / (loadout.totalWeight as number)) * 100)
            : 0;
          sections.push(`  - ${cat.category}: ${formatWeight(cat.total_weight as number)} (${pct}%, ${cat.item_count} items)`);
        }
      }
    }
  }

  // Web search results
  if (data.web_search) {
    const webResult = data.web_search as Record<string, unknown>;
    if (webResult.success && webResult.sources) {
      sections.push(`\n${isGerman ? '**Web-Recherche:**' : '**Web Research:**'}`);
      sections.push(`${isGerman ? 'Zusammenfassung' : 'Summary'}: ${webResult.summary}`);
      for (const source of (webResult.sources as Array<Record<string, unknown>>).slice(0, 3)) {
        sections.push(`  - [${source.title}](${source.link})`);
      }
    }
  }

  // Catalog products (GearGraph)
  const gearGraphKeys = Object.keys(data).filter(k => k.startsWith('geargraph_products'));
  if (gearGraphKeys.length > 0) {
    sections.push(`\n${isGerman ? '**Katalog-Produkte:**' : '**Catalog Products:**'}`);
    for (const key of gearGraphKeys) {
      const products = data[key] as Array<Record<string, unknown>>;
      if (products && products.length > 0) {
        for (const product of products) {
          sections.push(`  - ${product.name}: ${product.weight_grams ? formatWeight(product.weight_grams as number) : '?'}, ${product.price_usd ? `$${product.price_usd}` : '?'} - ${product.description || ''}`);
        }
      }
    }
  }

  return sections.join('\n');
}

// formatWeight is now imported from tools/utils.ts
