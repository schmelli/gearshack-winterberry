/**
 * User Context Management for Mastra Memory
 * Feature: Enhanced Memory Integration (Issue #110)
 *
 * This module provides intelligent caching of user data in conversation memory
 * to reduce database queries and make the AI agent more contextually aware.
 *
 * Key Features:
 * - Inventory summaries cached in memory metadata
 * - User preference learning from conversation patterns
 * - Smart cache invalidation based on timestamps
 * - Loadout context awareness
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logInfo, logDebug, logError } from './logging';
import type { Database, Tables } from '@/types/supabase';

// ============================================================================
// Constants
// ============================================================================

/** Default value for unknown brand */
const UNKNOWN_BRAND = 'Unknown';

/** Default value for uncategorized items */
const UNCATEGORIZED = 'uncategorized';

// ============================================================================
// Types
// ============================================================================

/**
 * User inventory summary stored in memory metadata
 */
export interface InventorySummary {
  /** Total item count by status */
  counts: {
    own: number;
    wishlist: number;
    sold: number;
  };
  /** Brands user owns */
  brands: string[];
  /** Category breakdown */
  categories: Record<string, number>;
  /** Weight statistics (in grams) */
  weightStats: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
  /** Most recent items (last 10) */
  recentItems: Array<{
    id: string;
    name: string;
    brand: string;
    category: string;
    weight_grams: number | null;
  }>;
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * User preferences learned from conversations
 */
export interface UserPreferences {
  /** Favorite brands (mentioned frequently) */
  favoriteBrands: string[];
  /** Weight priorities */
  weightPriority: 'ultralight' | 'lightweight' | 'standard' | null;
  /** Preferred activities */
  activities: string[];
  /** Budget preferences */
  budgetRange: {
    min: number | null;
    max: number | null;
  } | null;
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Wishlist context
 */
export interface WishlistContext {
  /** Total wishlist items */
  count: number;
  /** Categories of interest */
  categories: string[];
  /** Specific items user is looking for */
  items: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Current loadout context (session-specific)
 */
export interface LoadoutContext {
  /** Loadout ID */
  id: string;
  /** Loadout name */
  name: string;
  /** Activity types */
  activityTypes: string[];
  /** Seasons */
  seasons: string[];
  /** Gear items in loadout */
  items: Array<{
    gearItemId: string;
    name: string;
    brand: string;
    weight: number | null;
    quantity: number;
  }>;
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Complete user context stored in memory metadata
 */
export interface UserContext {
  inventory?: InventorySummary;
  preferences?: UserPreferences;
  wishlist?: WishlistContext;
  currentLoadout?: LoadoutContext;
}

// ============================================================================
// Context Building Functions
// ============================================================================

/**
 * Build inventory summary from user's gear items
 *
 * This caches key inventory data so the AI doesn't need to query
 * the database for every "What do I own?" question.
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Inventory summary
 */
export async function buildInventorySummary(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<InventorySummary> {
  logDebug('Building inventory summary', { userId });

  try {
    // Fetch all user's gear items
    const { data: items, error } = await supabase
      .from('gear_items')
      .select('id, name, brand, category_id, weight_grams, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('Failed to fetch gear items for inventory summary', new Error(error.message), {
        userId,
        metadata: { errorCode: error.code, errorDetails: error.details },
      });
      throw new Error(`Failed to fetch gear items: ${error.message}`);
    }

    if (!items || items.length === 0) {
      return {
        counts: { own: 0, wishlist: 0, sold: 0 },
        brands: [],
        categories: {},
        weightStats: { min: 0, max: 0, avg: 0, median: 0 },
        recentItems: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Count by status
    const counts = {
      own: items.filter(i => i.status === 'own').length,
      wishlist: items.filter(i => i.status === 'wishlist').length,
      sold: items.filter(i => i.status === 'sold').length,
    };

    // Extract unique brands
    const brands = [...new Set(items.map(i => i.brand).filter(Boolean) as string[])];

    // Category breakdown (count per category)
    const categories: Record<string, number> = {};
    items.forEach(item => {
      if (item.category_id) {
        categories[item.category_id] = (categories[item.category_id] || 0) + 1;
      }
    });

    // Weight statistics
    const weights = items
      .filter(i => i.weight_grams !== null && i.status === 'own')
      .map(i => i.weight_grams as number)
      .sort((a, b) => a - b);

    const weightStats = weights.length > 0 ? {
      min: weights[0],
      max: weights[weights.length - 1],
      avg: Math.round(weights.reduce((sum, w) => sum + w, 0) / weights.length),
      median: weights.length % 2 === 0
        ? Math.round((weights[weights.length / 2 - 1] + weights[weights.length / 2]) / 2)
        : weights[Math.floor(weights.length / 2)],
    } : { min: 0, max: 0, avg: 0, median: 0 };

    // Most recent items (last 10)
    const recentItems = items.slice(0, 10).map(item => ({
      id: item.id,
      name: item.name,
      brand: item.brand || UNKNOWN_BRAND,
      category: item.category_id || UNCATEGORIZED,
      weight_grams: item.weight_grams,
    }));

    const summary: InventorySummary = {
      counts,
      brands,
      categories,
      weightStats,
      recentItems,
      lastUpdated: new Date().toISOString(),
    };

    logInfo('Inventory summary built', {
      userId,
      metadata: { totalItems: items.length, brands: brands.length },
    });

    return summary;
  } catch (error) {
    logError('Failed to build inventory summary', error instanceof Error ? error : undefined, {
      userId,
    });
    throw error;
  }
}

/**
 * Build wishlist context from user's wishlist items
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Wishlist context
 */
export async function buildWishlistContext(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<WishlistContext> {
  logDebug('Building wishlist context', { userId });

  try {
    const { data: items, error } = await supabase
      .from('gear_items')
      .select('id, name, category_id')
      .eq('user_id', userId)
      .eq('status', 'wishlist')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch wishlist items: ${error.message}`);
    }

    const categories = [...new Set(items?.map(i => i.category_id).filter(Boolean) as string[])];

    return {
      count: items?.length || 0,
      categories,
      items: items?.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category_id || UNCATEGORIZED,
      })) || [],
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logError('Failed to build wishlist context', error instanceof Error ? error : undefined, {
      userId,
    });
    throw error;
  }
}

/**
 * Build loadout context from a specific loadout
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param loadoutId - Loadout ID
 * @returns Loadout context
 */
export async function buildLoadoutContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  loadoutId: string
): Promise<LoadoutContext | null> {
  logDebug('Building loadout context', { userId, metadata: { loadoutId } });

  try {
    // Fetch loadout
    const { data: loadout, error: loadoutError } = await supabase
      .from('loadouts')
      .select('id, name, description, activity_types, seasons')
      .eq('id', loadoutId)
      .eq('user_id', userId)
      .single();

    if (loadoutError || !loadout) {
      logDebug('Loadout not found', { userId, metadata: { loadoutId } });
      return null;
    }

    // Fetch loadout items with gear details
    const { data: loadoutItems, error: itemsError } = await supabase
      .from('loadout_items')
      .select(`
        gear_item_id,
        quantity,
        gear_items (
          id,
          name,
          brand,
          weight_grams
        )
      `)
      .eq('loadout_id', loadoutId);

    if (itemsError) {
      throw new Error(`Failed to fetch loadout items: ${itemsError.message}`);
    }

    // Type the gear_items relation properly
    type LoadoutItemWithGear = typeof loadoutItems extends (infer T)[] ? T : never;
    type GearItemData = LoadoutItemWithGear extends { gear_items: infer G } ? G : never;

    const items = loadoutItems?.map(li => {
      const gearItem = li.gear_items as GearItemData;
      const gearData = gearItem as Partial<Tables<'gear_items'>> | null;

      return {
        gearItemId: li.gear_item_id,
        name: gearData?.name || UNKNOWN_BRAND,
        brand: gearData?.brand || UNKNOWN_BRAND,
        weight: gearData?.weight_grams || null,
        quantity: li.quantity,
      };
    }) || [];

    return {
      id: loadout.id,
      name: loadout.name,
      activityTypes: loadout.activity_types || [],
      seasons: loadout.seasons || [],
      items,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logError('Failed to build loadout context', error instanceof Error ? error : undefined, {
      userId,
      metadata: { loadoutId },
    });
    return null;
  }
}

/**
 * Initialize user preferences with defaults
 *
 * Preferences are learned over time from conversation analysis
 *
 * @returns Initial preferences
 */
export function initializePreferences(): UserPreferences {
  return {
    favoriteBrands: [],
    weightPriority: null,
    activities: [],
    budgetRange: null,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Extract preferences from conversation history
 *
 * Analyzes conversation messages to learn user preferences
 * (e.g., "I prefer ultralight gear" → weightPriority: 'ultralight')
 *
 * @param messages - Conversation messages
 * @param currentPreferences - Current preferences to update
 * @returns Updated preferences
 */
export function extractPreferencesFromConversation(
  messages: Array<{ role: string; content: string }>,
  currentPreferences: UserPreferences
): UserPreferences {
  const updated = { ...currentPreferences };
  const userMessages = messages.filter(m => m.role === 'user');

  // Extract weight preferences
  const weightPatterns = {
    ultralight: /\b(ultralight|ultra-light|ul|minimize weight|lightest)\b/i,
    lightweight: /\b(lightweight|light weight|fairly light)\b/i,
    standard: /\b(standard|normal weight|don't mind weight)\b/i,
  };

  for (const msg of userMessages) {
    for (const [priority, pattern] of Object.entries(weightPatterns)) {
      if (pattern.test(msg.content)) {
        updated.weightPriority = priority as 'ultralight' | 'lightweight' | 'standard';
        break;
      }
    }
  }

  // Extract activity preferences
  // Pre-compile regex patterns for efficiency
  const activityPatterns = [
    { activity: 'hiking', pattern: /\bhiking\b/i },
    { activity: 'backpacking', pattern: /\bbackpacking\b/i },
    { activity: 'camping', pattern: /\bcamping\b/i },
    { activity: 'mountaineering', pattern: /\bmountaineering\b/i },
    { activity: 'trail running', pattern: /\btrail running\b/i },
    { activity: 'climbing', pattern: /\bclimbing\b/i },
    { activity: 'trekking', pattern: /\btrekking\b/i },
    { activity: 'fastpacking', pattern: /\bfastpacking\b/i },
  ];

  for (const msg of userMessages) {
    for (const { activity, pattern } of activityPatterns) {
      if (pattern.test(msg.content)) {
        if (!updated.activities.includes(activity)) {
          updated.activities.push(activity);
        }
      }
    }
  }

  updated.lastUpdated = new Date().toISOString();
  return updated;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Check if cached context is stale (older than threshold)
 *
 * @param lastUpdated - ISO timestamp of last update
 * @param maxAgeMinutes - Maximum age in minutes (default: 30)
 * @returns True if stale
 */
export function isCacheStale(lastUpdated: string, maxAgeMinutes: number = 30): boolean {
  const lastUpdatedTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  const ageMinutes = (now - lastUpdatedTime) / 1000 / 60;
  return ageMinutes > maxAgeMinutes;
}

/**
 * Build complete user context
 *
 * Combines inventory, wishlist, preferences, and optional loadout context
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param loadoutId - Optional loadout ID for context
 * @returns Complete user context
 */
export async function buildUserContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  loadoutId?: string
): Promise<UserContext> {
  logInfo('Building complete user context', {
    userId,
    metadata: { loadoutId },
  });

  const context: UserContext = {
    preferences: initializePreferences(),
  };

  try {
    // Build inventory summary
    context.inventory = await buildInventorySummary(supabase, userId);

    // Build wishlist context
    context.wishlist = await buildWishlistContext(supabase, userId);

    // Build loadout context if requested
    if (loadoutId) {
      const loadoutContext = await buildLoadoutContext(supabase, userId, loadoutId);
      if (loadoutContext) {
        context.currentLoadout = loadoutContext;
      }
    }

    logInfo('User context built successfully', {
      userId,
      metadata: {
        hasInventory: !!context.inventory,
        hasWishlist: !!context.wishlist,
        hasLoadout: !!context.currentLoadout,
      },
    });

    return context;
  } catch (error) {
    logError('Failed to build user context', error instanceof Error ? error : undefined, {
      userId,
    });
    // Return partial context on error
    return context;
  }
}

/**
 * Format user context as natural language for system prompt
 *
 * @param context - User context
 * @returns Natural language description
 */
export function formatContextForPrompt(context: UserContext): string {
  const parts: string[] = [];

  // Inventory summary
  if (context.inventory) {
    const inv = context.inventory;
    parts.push(`**User Inventory Summary:**`);
    parts.push(`You can answer basic inventory questions from this summary without using tools.`);
    parts.push(``);
    parts.push(`- **Total items owned: ${inv.counts.own}**`);
    parts.push(`- **Wishlist items: ${inv.counts.wishlist}**`);
    parts.push(`- **Sold items: ${inv.counts.sold}**`);

    if (inv.brands.length > 0) {
      parts.push(`- Brands owned (${inv.brands.length} total): ${inv.brands.slice(0, 10).join(', ')}${inv.brands.length > 10 ? '...' : ''}`);
    }

    if (inv.weightStats.avg > 0) {
      parts.push(`- Weight stats: avg ${inv.weightStats.avg}g, range ${inv.weightStats.min}g-${inv.weightStats.max}g`);
    }

    if (inv.recentItems.length > 0) {
      parts.push(`- Recent additions: ${inv.recentItems.slice(0, 3).map(i => `${i.name} (${i.brand})`).join(', ')}`);
    }

    parts.push(``);
    parts.push(`**IMPORTANT:** When asked "how many items do you have?", answer directly: "You have ${inv.counts.own} items in your inventory${inv.counts.wishlist > 0 ? ` and ${inv.counts.wishlist} items in your wishlist` : ''}." Only use queryUserData tool for detailed questions about specific items.`);
    parts.push('');
  }

  // Preferences
  if (context.preferences && context.preferences.favoriteBrands.length > 0) {
    parts.push(`**User Preferences:**`);
    parts.push(`- Favorite brands: ${context.preferences.favoriteBrands.join(', ')}`);
    if (context.preferences.weightPriority) {
      parts.push(`- Weight priority: ${context.preferences.weightPriority}`);
    }
    if (context.preferences.activities.length > 0) {
      parts.push(`- Activities: ${context.preferences.activities.join(', ')}`);
    }
    parts.push('');
  }

  // Current loadout
  if (context.currentLoadout) {
    const loadout = context.currentLoadout;
    parts.push(`**Current Loadout Context:**`);
    parts.push(`- Viewing loadout: "${loadout.name}"`);
    parts.push(`- Activities: ${loadout.activityTypes.join(', ')}`);
    parts.push(`- Seasons: ${loadout.seasons.join(', ')}`);
    parts.push(`- Items in loadout: ${loadout.items.length}`);
    parts.push('');
  }

  return parts.join('\n');
}
