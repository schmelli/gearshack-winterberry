/**
 * Context Pre-loading Service
 * Feature: AI Agent Performance Enhancements (Issue #110)
 *
 * Pre-fetches and caches loadout context to enable instant AI responses
 * for common loadout questions without hitting the database every time.
 *
 * Benefits:
 * - Instant responses (< 500ms) for loadout-specific questions
 * - Reduced database load
 * - Better user experience with context-aware AI
 */

import { createClient } from '@/lib/supabase/server';
import { logDebug, logError, logInfo } from '@/lib/mastra/logging';

// =============================================================================
// Types
// =============================================================================

/**
 * Pre-loaded loadout context for AI agent
 */
export interface LoadoutContext {
  /** Loadout metadata */
  loadout: {
    id: string;
    name: string;
    description: string | null;
    totalWeight: number;
    baseWeight: number;
    activityTypes: string[];
    seasons: string[];
  };
  /** Gear items in this loadout */
  gearItems: Array<{
    id: string;
    name: string;
    brand: string | null;
    weight: number;
    category: string | null;
    productType: string | null;
  }>;
  /** Category breakdown */
  categoryWeights: Record<string, number>;
  /** Heaviest items (top 5) */
  heaviestItems: Array<{
    name: string;
    weight: number;
    category: string | null;
  }>;
  /** Cache timestamp */
  cachedAt: Date;
}

/**
 * In-memory cache for loadout contexts
 * TTL: 5 minutes (short because loadouts change frequently during editing)
 */
interface CacheEntry {
  context: LoadoutContext;
  expiresAt: Date;
}

const loadoutContextCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Context Pre-loading Functions
// =============================================================================

/**
 * Pre-load loadout context for instant AI responses
 *
 * Call this when:
 * - User lands on loadout detail page
 * - User edits loadout metadata
 * - User adds/removes items from loadout
 *
 * @param loadoutId - Loadout UUID
 * @param userId - User ID for authorization
 * @returns Pre-loaded loadout context
 */
export async function preloadLoadoutContext(
  loadoutId: string,
  userId: string
): Promise<LoadoutContext | null> {
  try {
    logDebug('Pre-loading loadout context', { userId, metadata: { loadoutId } });

    const supabase = await createClient();

    // Fetch loadout with gear items via loadout_items junction table (optimized)
    const { data: loadout, error: loadoutError } = await supabase
      .from('loadouts')
      .select(`
        id,
        name,
        description,
        activity_types,
        seasons,
        loadout_items (
          gear_item:gear_items (
            id,
            name,
            brand,
            weight,
            category:categories(name),
            product_type:product_types(name)
          )
        )
      `)
      .eq('id', loadoutId)
      .eq('user_id', userId)
      .single();

    if (loadoutError || !loadout) {
      logError('Failed to fetch loadout for pre-loading', loadoutError);
      return null;
    }

    // Calculate weights
    // Type for raw loadout item from Supabase join query via junction table
    interface RawLoadoutItem {
      gear_item: {
        id: string;
        name: string;
        brand: string | null;
        weight: number | null;
        category: { name: string } | null;
        product_type: { name: string } | null;
      } | null;
    }
    const rawLoadoutItems = (loadout.loadout_items || []) as unknown as RawLoadoutItem[];
    const gearItems = rawLoadoutItems
      .filter((item) => item.gear_item !== null)
      .map((item) => ({
        id: item.gear_item!.id,
        name: item.gear_item!.name,
        brand: item.gear_item!.brand,
        weight: item.gear_item!.weight || 0,
        category: item.gear_item!.category?.name || null,
        productType: item.gear_item!.product_type?.name || null,
      }));

    const totalWeight = gearItems.reduce((sum, item) => sum + item.weight, 0);
    const baseWeight = totalWeight; // Simplified - could exclude consumables

    // Category breakdown
    const categoryWeights: Record<string, number> = {};
    for (const item of gearItems) {
      const category = item.category || 'Uncategorized';
      categoryWeights[category] = (categoryWeights[category] || 0) + item.weight;
    }

    // Heaviest items (top 5)
    const heaviestItems = [...gearItems]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        weight: item.weight,
        category: item.category,
      }));

    const context: LoadoutContext = {
      loadout: {
        id: loadout.id,
        name: loadout.name,
        description: loadout.description,
        totalWeight,
        baseWeight,
        activityTypes: loadout.activity_types || [],
        seasons: loadout.seasons || [],
      },
      gearItems,
      categoryWeights,
      heaviestItems,
      cachedAt: new Date(),
    };

    // Cache the context
    const cacheKey = `${userId}:${loadoutId}`;
    loadoutContextCache.set(cacheKey, {
      context,
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    });

    logInfo('Loadout context pre-loaded and cached', {
      userId,
      metadata: {
        loadoutId,
        itemCount: gearItems.length,
        totalWeight,
      },
    });

    return context;
  } catch (error) {
    logError('Error pre-loading loadout context', error);
    return null;
  }
}

/**
 * Get cached loadout context (instant - no DB query)
 *
 * @param loadoutId - Loadout UUID
 * @param userId - User ID
 * @returns Cached context or null if not cached/expired
 */
export function getCachedLoadoutContext(
  loadoutId: string,
  userId: string
): LoadoutContext | null {
  const cacheKey = `${userId}:${loadoutId}`;
  const entry = loadoutContextCache.get(cacheKey);

  if (!entry) {
    return null;
  }

  // Check expiration
  if (entry.expiresAt < new Date()) {
    loadoutContextCache.delete(cacheKey);
    return null;
  }

  return entry.context;
}

/**
 * Invalidate loadout context cache
 *
 * Call this when:
 * - User adds/removes items from loadout
 * - User updates loadout metadata
 * - User deletes loadout
 *
 * @param loadoutId - Loadout UUID
 * @param userId - User ID
 */
export function invalidateLoadoutContext(loadoutId: string, userId: string): void {
  const cacheKey = `${userId}:${loadoutId}`;
  loadoutContextCache.delete(cacheKey);
  logDebug('Loadout context cache invalidated', { userId, metadata: { loadoutId } });
}

/**
 * Format loadout context for AI system prompt
 *
 * @param context - Pre-loaded loadout context
 * @param locale - User locale (en | de)
 * @returns Formatted context string for system prompt
 */
export function formatLoadoutContextForPrompt(
  context: LoadoutContext,
  locale: 'en' | 'de' = 'en'
): string {
  const isGerman = locale === 'de';

  const sections: string[] = [];

  // Loadout metadata
  if (isGerman) {
    sections.push(`**Aktuelles Loadout:** ${context.loadout.name}`);
    if (context.loadout.description) {
      sections.push(`**Beschreibung:** ${context.loadout.description}`);
    }
    sections.push(`**Aktivitaeten:** ${context.loadout.activityTypes.join(', ') || 'Keine'}`);
    sections.push(`**Jahreszeiten:** ${context.loadout.seasons.join(', ') || 'Keine'}`);
    sections.push(`**Gesamtgewicht:** ${formatWeight(context.loadout.totalWeight)}`);
    sections.push(`**Basisgewicht:** ${formatWeight(context.loadout.baseWeight)}`);
    sections.push(`**Anzahl Gegenstaende:** ${context.gearItems.length}`);
  } else {
    sections.push(`**Current Loadout:** ${context.loadout.name}`);
    if (context.loadout.description) {
      sections.push(`**Description:** ${context.loadout.description}`);
    }
    sections.push(`**Activities:** ${context.loadout.activityTypes.join(', ') || 'None'}`);
    sections.push(`**Seasons:** ${context.loadout.seasons.join(', ') || 'None'}`);
    sections.push(`**Total Weight:** ${formatWeight(context.loadout.totalWeight)}`);
    sections.push(`**Base Weight:** ${formatWeight(context.loadout.baseWeight)}`);
    sections.push(`**Item Count:** ${context.gearItems.length}`);
  }

  // Category breakdown
  const categoryEntries = Object.entries(context.categoryWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5 categories

  if (categoryEntries.length > 0) {
    const categoryLabel = isGerman ? '**Kategorien (Top 5):**' : '**Categories (Top 5):**';
    sections.push(categoryLabel);
    for (const [category, weight] of categoryEntries) {
      sections.push(`  - ${category}: ${formatWeight(weight)}`);
    }
  }

  // Heaviest items
  if (context.heaviestItems.length > 0) {
    const heaviestLabel = isGerman ? '**Schwerste Gegenstaende:**' : '**Heaviest Items:**';
    sections.push(heaviestLabel);
    for (const item of context.heaviestItems) {
      sections.push(`  - ${item.name}: ${formatWeight(item.weight)} (${item.category || 'N/A'})`);
    }
  }

  return sections.join('\n');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format weight in grams to human-readable string
 */
function formatWeight(grams: number): string {
  if (grams < 1000) {
    return `${Math.round(grams)}g`;
  }
  return `${(grams / 1000).toFixed(2)}kg`;
}
