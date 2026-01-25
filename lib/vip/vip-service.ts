/**
 * VIP Service Layer
 *
 * Feature: 052-vip-loadouts
 * Task: T014
 *
 * Supabase queries for VIP data operations.
 * All business logic for VIP accounts, loadouts, follows, and bookmarks.
 */

import { createClient } from '@/lib/supabase/client';
import { VipAuthenticationError, VipNotFoundError, VipInvalidLoadoutError } from './errors';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Helper to get supabase client for VIP tables
 * TODO: Remove after regenerating types from migrations
 */
function getVipClient(): SupabaseClient {
  return createClient() as SupabaseClient;
}

// TODO: Update to use new VIP schema - many of these types have been removed/changed
import type {
  VipWithStats,
  VipProfile,
  VipLoadoutSummary,
  VipLoadoutWithItems,
  VipListResponse,
  VipFollowResponse,
  VipBookmarkResponse,
  CopyVipLoadoutResult,
  // CreateVipLoadoutRequest, // REMOVED - use regular loadout types
  // UpdateVipLoadoutRequest, // REMOVED - use regular loadout types
  CategoryBreakdown,
} from '@/types/vip';

// =============================================================================
// Security Utilities
// =============================================================================

/**
 * Sanitize search query to prevent PostgREST filter injection.
 * Escapes special characters used in ILIKE patterns and .or() syntax.
 */
function sanitizeILikePattern(pattern: string): string {
  if (!pattern || typeof pattern !== 'string') {
    return '';
  }
  return pattern
    .slice(0, 100) // Max 100 chars to prevent DoS
    .replace(/\\/g, '\\\\') // Escape backslash first
    .replace(/%/g, '\\%')   // Escape percent
    .replace(/_/g, '\\_')   // Escape underscore
    .replace(/,/g, '')      // Remove commas (PostgREST .or() delimiter)
    .replace(/\(/g, '')     // Remove opening parens (PostgREST grouping)
    .replace(/\)/g, '')     // Remove closing parens (PostgREST grouping)
    .replace(/\./g, ' ')    // Replace dots with space (prevents .eq., .neq. injection)
    .trim();
}

// =============================================================================
// Internal Types for Database Results
// =============================================================================

/** VIP account row from the database */
interface VipAccountRow {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  social_links: Record<string, string> | null;
  status: string;
  is_featured: boolean;
  claimed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archive_reason: string | null;
  follower_count?: Array<{ count: number }>;
}

/** Loadout row from the database */
interface LoadoutRow {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_vip_loadout: boolean;
  created_at: string;
  updated_at: string;
}

/** Loadout item with gear details */
interface LoadoutItemWithGear {
  id: string;
  loadout_id: string;
  quantity: number;
  gear_items?: {
    id?: string;
    name?: string;
    brand?: string | null;
    weight_grams?: number;
    notes?: string | null;
    product_type_id?: string | null;
    source_attribution?: SourceAttribution | null;
    categories?: {
      name: string;
    };
  };
}

/** Transformed loadout item for display */
interface TransformedLoadoutItem {
  id: string;
  vipLoadoutId: string;
  gearItemId: string | null;
  name: string;
  brand: string | null;
  weightGrams: number;
  quantity: number;
  notes: string | null;
  category: string;
  sortOrder: number;
  createdAt: string;
}

/** VIP follow row */
interface VipFollowRow {
  vip_id: string;
  follower_id?: string;
}

/** Bookmark row with loadout data */
interface BookmarkWithLoadout {
  loadout_id: string;
  loadouts?: LoadoutRow & {
    profiles?: {
      display_name: string | null;
    };
  };
}

/** Gear item row with source attribution */
interface GearItemRow {
  id: string;
  source_attribution?: SourceAttribution | null;
}

/** Source attribution for catalog items */
interface SourceAttribution {
  catalog_product_id?: string;
  [key: string]: unknown;
}

// =============================================================================
// VIP Discovery Queries
// =============================================================================

/**
 * Get featured VIPs for the Community page
 *
 * @param limit - Maximum number of VIPs to return (default: 6)
 * @returns Array of featured VIP accounts with follower/loadout counts and follow status
 * @throws {Error} If database query fails
 *
 * @example
 * ```ts
 * const featuredVips = await getFeaturedVips(6);
 * console.log(featuredVips[0].followerCount); // 42
 * ```
 */
export async function getFeaturedVips(limit = 6): Promise<VipWithStats[]> {
  const supabase = getVipClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Note: VIP loadouts now use the unified schema (loadouts table with is_vip_loadout=true)
  // Loadout counts are fetched separately since there's no direct FK relationship
  const { data, error } = await supabase
    .from('vip_accounts')
    .select(`
      *,
      follower_count:vip_follows(count)
    `)
    .eq('is_featured', true)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const vipRows = (data ?? []) as unknown as VipAccountRow[];

  // Get loadout counts for claimed VIPs (those with claimed_by_user_id)
  // VIP loadouts are in the regular loadouts table with is_vip_loadout = true
  const claimedUserIds = vipRows
    .filter((vip) => vip.claimed_by_user_id)
    .map((vip) => vip.claimed_by_user_id as string);

  const loadoutCountMap = new Map<string, number>();

  if (claimedUserIds.length > 0) {
    const { data: loadoutCounts } = await supabase
      .from('loadouts')
      .select('user_id')
      .in('user_id', claimedUserIds)
      .eq('is_vip_loadout', true);

    // Count loadouts per user_id
    if (loadoutCounts) {
      (loadoutCounts as Array<{ user_id: string }>).forEach((row) => {
        const count = loadoutCountMap.get(row.user_id) || 0;
        loadoutCountMap.set(row.user_id, count + 1);
      });
    }
  }

  // Batch check if user is following VIPs (eliminates N+1 query)
  const followedVipIds = new Set<string>();
  if (user && vipRows.length > 0) {
    const vipIds = vipRows.map((vip) => vip.id);
    const { data: followData } = await supabase
      .from('vip_follows')
      .select('vip_id')
      .eq('follower_id', user.id)
      .in('vip_id', vipIds);

    ((followData ?? []) as VipFollowRow[]).forEach((follow) => {
      followedVipIds.add(follow.vip_id);
    });
  }

  const vips = vipRows.map((vip) => {
    const claimedByUserId = vip.claimed_by_user_id;
    return {
      ...transformVipAccount(vip),
      followerCount: vip.follower_count?.[0]?.count ?? 0,
      loadoutCount: claimedByUserId ? (loadoutCountMap.get(claimedByUserId) || 0) : 0,
      isFollowing: followedVipIds.has(vip.id),
    };
  });

  return vips;
}

/**
 * Search VIPs by name, bio, or loadout keywords
 *
 * @param query - Search query string (searches name and bio fields)
 * @param options - Search options
 * @param options.limit - Maximum results to return (default: 20, max: 50)
 * @param options.offset - Number of results to skip for pagination (default: 0)
 * @param options.featured - Filter by featured status (optional)
 * @returns Paginated list of VIPs matching search criteria with total count
 * @throws {Error} If database query fails
 *
 * @example
 * ```ts
 * const { vips, total, hasMore } = await searchVips('hiking', { limit: 10, offset: 0 });
 * console.log(`Found ${total} VIPs, showing ${vips.length}`);
 * ```
 */
export async function searchVips(
  query: string,
  options: { limit?: number; offset?: number; featured?: boolean } = {}
): Promise<VipListResponse> {
  const { limit = 20, offset = 0, featured } = options;
  const supabase = getVipClient();

  // Note: VIP loadouts now use the unified schema (loadouts table with is_vip_loadout=true)
  let queryBuilder = supabase
    .from('vip_accounts')
    .select(`
      *,
      follower_count:vip_follows(count)
    `, { count: 'exact' })
    .is('archived_at', null);

  if (query) {
    // Sanitize query to prevent PostgREST filter injection
    const sanitized = sanitizeILikePattern(query);
    if (sanitized) {
      queryBuilder = queryBuilder.or(`name.ilike.%${sanitized}%,bio.ilike.%${sanitized}%`);
    }
  }

  if (featured !== undefined) {
    queryBuilder = queryBuilder.eq('is_featured', featured);
  }

  const { data, error, count: totalCount } = await queryBuilder
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const vipRows = (data ?? []) as unknown as VipAccountRow[];

  // Get loadout counts for claimed VIPs
  const claimedUserIds = vipRows
    .filter((vip) => vip.claimed_by_user_id)
    .map((vip) => vip.claimed_by_user_id as string);

  const loadoutCountMap = new Map<string, number>();

  if (claimedUserIds.length > 0) {
    const { data: loadoutCounts } = await supabase
      .from('loadouts')
      .select('user_id')
      .in('user_id', claimedUserIds)
      .eq('is_vip_loadout', true);

    if (loadoutCounts) {
      (loadoutCounts as Array<{ user_id: string }>).forEach((row) => {
        const cnt = loadoutCountMap.get(row.user_id) || 0;
        loadoutCountMap.set(row.user_id, cnt + 1);
      });
    }
  }

  const vips: VipWithStats[] = vipRows.map((vip) => {
    const claimedByUserId = vip.claimed_by_user_id;
    return {
      ...transformVipAccount(vip),
      followerCount: vip.follower_count?.[0]?.count ?? 0,
      loadoutCount: claimedByUserId ? (loadoutCountMap.get(claimedByUserId) || 0) : 0,
    };
  });

  return {
    vips,
    total: totalCount ?? 0,
    hasMore: offset + limit < (totalCount ?? 0),
  };
}

/**
 * Get VIP profile by slug with all published loadouts
 *
 * @param slug - Unique slug identifier for the VIP (e.g., "andrew-skurka")
 * @returns Complete VIP profile with loadouts, or null if not found
 * @throws {Error} If database query fails
 *
 * @remarks
 * This function fetches:
 * - VIP account details with follower/loadout counts
 * - All published loadouts with weight and item count calculations
 * - Follow status for authenticated users
 *
 * @example
 * ```ts
 * const vip = await getVipBySlug('andrew-skurka');
 * if (vip) {
 *   console.log(`${vip.name} has ${vip.loadouts.length} loadouts`);
 * }
 * ```
 */
export async function getVipBySlug(slug: string): Promise<VipProfile | null> {
  const supabase = getVipClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Note: VIP loadouts now use the unified schema (loadouts table with is_vip_loadout=true)
  const { data: vipData, error } = await supabase
    .from('vip_accounts')
    .select(`
      *,
      follower_count:vip_follows(count)
    `)
    .eq('slug', slug)
    .is('archived_at', null)
    .single();

  if (error || !vipData) return null;

  const vip = vipData as unknown as VipAccountRow;

  // Get VIP loadouts from unified loadouts table
  // VIP loadouts are linked via user_id = vip.claimed_by_user_id
  let loadouts: LoadoutRow[] = [];
  if (vip.claimed_by_user_id) {
    const { data: loadoutData } = await supabase
      .from('loadouts')
      .select('*')
      .eq('user_id', vip.claimed_by_user_id)
      .eq('is_vip_loadout', true)
      .order('created_at', { ascending: false });
    loadouts = (loadoutData ?? []) as unknown as LoadoutRow[];
  }

  // Check if user is following
  let isFollowing = false;
  if (user) {
    const { data: followData } = await supabase
      .from('vip_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('vip_id', vip.id)
      .single();
    isFollowing = !!followData;
  }

  // Batch fetch items for all loadouts to eliminate N+1 query
  // Using unified loadout_items table
  interface LoadoutItemForWeight {
    loadout_id: string;
    weight_grams: number;
    quantity: number;
  }
  const loadoutIds = loadouts.map((l) => l.id);
  const itemsByLoadout = new Map<string, LoadoutItemForWeight[]>();

  if (loadoutIds.length > 0) {
    const { data: allItems } = await supabase
      .from('loadout_items')
      .select(`
        loadout_id,
        quantity,
        gear_items!inner (
          weight_grams
        )
      `)
      .in('loadout_id', loadoutIds);

    interface LoadoutItemWithWeight {
      loadout_id: string;
      quantity: number;
      gear_items?: { weight_grams?: number };
    }
    ((allItems ?? []) as LoadoutItemWithWeight[]).forEach((item) => {
      const items = itemsByLoadout.get(item.loadout_id) || [];
      items.push({
        loadout_id: item.loadout_id,
        weight_grams: item.gear_items?.weight_grams || 0,
        quantity: item.quantity,
      });
      itemsByLoadout.set(item.loadout_id, items);
    });
  }

  // Build loadout summaries with weights
  const loadoutSummaries: VipLoadoutSummary[] = loadouts.map((loadout) => {
    const items = itemsByLoadout.get(loadout.id) || [];
    const totalWeight = items.reduce(
      (sum: number, item: LoadoutItemForWeight) => sum + (item.weight_grams || 0) * item.quantity,
      0
    );

    return {
      ...transformUnifiedLoadout(loadout, vip.id),
      totalWeightGrams: totalWeight,
      itemCount: items.length,
    };
  });

  return {
    ...transformVipAccount(vip),
    followerCount: vip.follower_count?.[0]?.count ?? 0,
    loadoutCount: loadouts.length,
    isFollowing,
    loadouts: loadoutSummaries,
  };
}

// =============================================================================
// VIP Loadout Queries
// =============================================================================

/**
 * Get VIP loadout by VIP slug and loadout slug with all items
 *
 * @param vipSlug - Unique slug identifier for the VIP
 * @param loadoutSlug - Unique slug identifier for the loadout
 * @returns Complete loadout with items, category breakdown, and VIP info, or null if not found
 * @throws {Error} If database query fails
 *
 * @remarks
 * This function fetches and calculates:
 * - Loadout details with all items sorted by category
 * - Total weight and item count
 * - Category breakdown (weight and count per category)
 * - Bookmark status for authenticated users
 * - VIP account information
 *
 * @example
 * ```ts
 * const loadout = await getVipLoadout('andrew-skurka', 'sierra-high-route-summer');
 * if (loadout) {
 *   console.log(`Total weight: ${loadout.totalWeightGrams}g`);
 *   console.log(`Categories: ${loadout.categoryBreakdown.length}`);
 * }
 * ```
 */
export async function getVipLoadout(
  vipSlug: string,
  loadoutSlug: string
): Promise<VipLoadoutWithItems | null> {
  const supabase = getVipClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Note: VIP loadouts now use the unified schema (loadouts table with is_vip_loadout=true)
  // Get VIP first
  const { data: vipData } = await supabase
    .from('vip_accounts')
    .select(`
      *,
      follower_count:vip_follows(count)
    `)
    .eq('slug', vipSlug)
    .is('archived_at', null)
    .single();

  if (!vipData) return null;

  const vip = vipData as unknown as VipAccountRow;

  // Get loadout from unified loadouts table
  // VIP loadouts are linked via user_id = vip.claimed_by_user_id
  if (!vip.claimed_by_user_id) return null;

  const { data: loadoutData } = await supabase
    .from('loadouts')
    .select('*')
    .eq('user_id', vip.claimed_by_user_id)
    .eq('slug', loadoutSlug)
    .eq('is_vip_loadout', true)
    .single();

  if (!loadoutData) return null;

  const loadout = loadoutData as unknown as LoadoutRow;

  // Get loadout count for this VIP
  const { data: loadoutCountData } = await supabase
    .from('loadouts')
    .select('id')
    .eq('user_id', vip.claimed_by_user_id)
    .eq('is_vip_loadout', true);
  const loadoutCount = loadoutCountData?.length || 0;

  // Get loadout items from unified loadout_items table with gear_items
  const { data: items } = await supabase
    .from('loadout_items')
    .select(`
      id,
      loadout_id,
      quantity,
      gear_items!inner (
        id,
        name,
        brand,
        weight_grams,
        notes,
        product_type_id,
        categories (
          name
        )
      )
    `)
    .eq('loadout_id', loadout.id);

  // Check if bookmarked (using loadout_id instead of vip_loadout_id)
  let isBookmarked = false;
  if (user) {
    const { data: bookmarkData } = await supabase
      .from('vip_bookmarks')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('loadout_id', loadout.id)
      .single();
    isBookmarked = !!bookmarkData;
  }

  // Transform items to match VIP loadout item structure
  const transformedItems: TransformedLoadoutItem[] = ((items ?? []) as LoadoutItemWithGear[]).map((item, index) => ({
    id: item.id,
    vipLoadoutId: item.loadout_id,
    gearItemId: item.gear_items?.id || null,
    name: item.gear_items?.name || 'Unknown Item',
    brand: item.gear_items?.brand || null,
    weightGrams: item.gear_items?.weight_grams || 0,
    quantity: item.quantity,
    notes: item.gear_items?.notes || null,
    category: item.gear_items?.categories?.name || 'Uncategorized',
    sortOrder: index,
    createdAt: loadout.created_at,
  }));

  // Calculate category breakdown
  const categoryMap = new Map<string, { weight: number; count: number }>();
  transformedItems.forEach((item) => {
    const existing = categoryMap.get(item.category) ?? { weight: 0, count: 0 };
    categoryMap.set(item.category, {
      weight: existing.weight + item.weightGrams * item.quantity,
      count: existing.count + 1,
    });
  });

  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      weightGrams: data.weight,
      itemCount: data.count,
    })
  );

  const totalWeight = transformedItems.reduce(
    (sum: number, item) => sum + item.weightGrams * item.quantity,
    0
  );

  return {
    ...transformUnifiedLoadout(loadout, vip.id),
    totalWeightGrams: totalWeight,
    itemCount: transformedItems.length,
    isBookmarked,
    vip: {
      ...transformVipAccount(vip),
      followerCount: vip.follower_count?.[0]?.count ?? 0,
      loadoutCount,
    },
    items: transformedItems,
    categoryBreakdown,
  };
}

// =============================================================================
// Follow/Unfollow Operations
// =============================================================================

/**
 * Follow a VIP
 */
export async function followVip(vipId: string): Promise<VipFollowResponse> {
  const supabase = getVipClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const { error } = await supabase.from('vip_follows').insert({
    follower_id: user.id,
    vip_id: vipId,
  });

  if (error && error.code !== '23505') throw error; // Ignore duplicate key error

  // Get updated follower count
  const { count: followerCount } = await supabase
    .from('vip_follows')
    .select('*', { count: 'exact', head: true })
    .eq('vip_id', vipId);

  return {
    isFollowing: true,
    followerCount: followerCount ?? 0,
  };
}

/**
 * Unfollow a VIP
 */
export async function unfollowVip(vipId: string): Promise<VipFollowResponse> {
  const supabase = getVipClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const { error } = await supabase
    .from('vip_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('vip_id', vipId);

  if (error) throw error;

  // Get updated follower count
  const { count: followerCount } = await supabase
    .from('vip_follows')
    .select('*', { count: 'exact', head: true })
    .eq('vip_id', vipId);

  return {
    isFollowing: false,
    followerCount: followerCount ?? 0,
  };
}

// =============================================================================
// Bookmark Operations
// =============================================================================

/**
 * Bookmark a VIP loadout
 * Note: Uses loadout_id column (unified schema)
 */
export async function bookmarkLoadout(loadoutId: string): Promise<VipBookmarkResponse> {
  const supabase = getVipClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const { error } = await supabase.from('vip_bookmarks').insert({
    user_id: user.id,
    loadout_id: loadoutId,
  });

  if (error && error.code !== '23505') throw error;

  return { isBookmarked: true };
}

/**
 * Remove bookmark from a VIP loadout
 * Note: Uses loadout_id column (unified schema)
 */
export async function unbookmarkLoadout(loadoutId: string): Promise<VipBookmarkResponse> {
  const supabase = getVipClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const { error } = await supabase
    .from('vip_bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('loadout_id', loadoutId);

  if (error) throw error;

  return { isBookmarked: false };
}

/**
 * Get user's bookmarked loadouts
 * Note: Now queries unified loadouts table with is_vip_loadout=true
 */
export async function getUserBookmarkedLoadouts(): Promise<VipLoadoutSummary[]> {
  const supabase = getVipClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Query bookmarks with unified loadouts table
  const { data: bookmarks } = await supabase
    .from('vip_bookmarks')
    .select(`
      loadout_id,
      loadouts!inner (
        *,
        profiles!loadouts_user_id_fkey (
          display_name
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const bookmarkRows = (bookmarks ?? []) as unknown as BookmarkWithLoadout[];

  // Get VIP account info for the loadouts
  const loadoutUserIds = bookmarkRows
    .map((b) => b.loadouts?.user_id)
    .filter((id): id is string => Boolean(id));

  interface VipAccountInfo { claimed_by_user_id: string | null; name: string; slug: string }
  const vipAccountMap = new Map<string, { name: string; slug: string }>();
  if (loadoutUserIds.length > 0) {
    const { data: vips } = await supabase
      .from('vip_accounts')
      .select('claimed_by_user_id, name, slug')
      .in('claimed_by_user_id', loadoutUserIds);

    ((vips ?? []) as VipAccountInfo[]).forEach((vip) => {
      if (vip.claimed_by_user_id) {
        vipAccountMap.set(vip.claimed_by_user_id, { name: vip.name, slug: vip.slug });
      }
    });
  }

  return bookmarkRows
    .filter((b) => b.loadouts && b.loadouts.is_vip_loadout)
    .map((b) => {
      const loadout = b.loadouts!;
      const vipInfo = vipAccountMap.get(loadout.user_id);
      return {
        id: loadout.id,
        vipId: vipInfo ? loadout.user_id : '',
        name: loadout.name,
        slug: loadout.slug || '',
        sourceUrl: '',
        description: loadout.description || null,
        tripType: null,
        dateRange: null,
        status: 'published' as const,
        isSourceAvailable: true,
        sourceCheckedAt: null,
        createdBy: loadout.user_id,
        createdAt: loadout.created_at,
        updatedAt: loadout.updated_at,
        publishedAt: loadout.created_at,
        totalWeightGrams: 0, // Would need separate query for weights
        itemCount: 0,
        isBookmarked: true,
      };
    });
}

// =============================================================================
// Copy Loadout Operation
// =============================================================================

/**
 * Copy a VIP loadout to user's account with intelligent item matching
 *
 * @param vipLoadoutId - UUID of the VIP loadout to copy
 * @returns Object with new loadout details and statistics
 * @throws {Error} If user is not authenticated
 * @throws {Error} If VIP loadout is not found or not a VIP loadout
 * @throws {Error} If database operation fails
 *
 * @remarks
 * For each item in the VIP loadout:
 * - Checks user's inventory for matching catalog_product_id
 * - If found: links existing gear_item to new loadout
 * - If not found: creates new gear_item with status='wishlist'
 *
 * All items maintain their original metadata (name, brand, weight, etc.)
 */
export async function copyVipLoadout(vipLoadoutId: string): Promise<CopyVipLoadoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new VipAuthenticationError();

  // Fetch VIP loadout with items and VIP profile info
  const { data: loadout, error: loadoutError } = await supabase
    .from('loadouts')
    .select(`
      id,
      name,
      description,
      is_vip_loadout,
      user_id,
      profiles!loadouts_user_id_fkey (
        display_name
      )
    `)
    .eq('id', vipLoadoutId)
    .eq('is_vip_loadout', true)
    .single();

  if (loadoutError) throw loadoutError;
  if (!loadout) throw new VipNotFoundError();
  if (!loadout.is_vip_loadout) throw new VipInvalidLoadoutError();

  // Fetch loadout items with gear details
  const { data: items, error: itemsError } = await supabase
    .from('loadout_items')
    .select(`
      id,
      gear_item_id,
      quantity,
      gear_items!inner (
        id,
        name,
        brand,
        weight_grams,
        product_type_id,
        notes,
        source_attribution
      )
    `)
    .eq('loadout_id', vipLoadoutId);

  if (itemsError) throw itemsError;

  // Get VIP display name for loadout naming
  const profileData = loadout.profiles as { display_name?: string | null } | null;
  const vipName = profileData?.display_name || 'VIP';
  const newLoadoutName = `${vipName}'s ${loadout.name} - Copy`;

  // Create new user loadout
  const { data: newLoadout, error: createError } = await supabase
    .from('loadouts')
    .insert({
      user_id: user.id,
      name: newLoadoutName,
      description: loadout.description || `Copied from ${vipName}'s loadout`,
      source_vip_loadout_id: vipLoadoutId,
    })
    .select('id')
    .single();

  if (createError) throw createError;
  if (!newLoadout) throw new Error('Failed to create loadout');

  // Batch fetch user's existing inventory to avoid N+1 queries
  const loadoutItemsWithGear = (items ?? []) as unknown as LoadoutItemWithGear[];
  const catalogProductIds = loadoutItemsWithGear
    .map((item) => item.gear_items?.source_attribution?.catalog_product_id)
    .filter((id): id is string => Boolean(id));

  const userInventoryMap = new Map<string, string>();
  if (catalogProductIds.length > 0) {
    const { data: userItems } = await supabase
      .from('gear_items')
      .select('id, source_attribution')
      .eq('user_id', user.id)
      .not('source_attribution', 'is', null);

    ((userItems ?? []) as GearItemRow[]).forEach((item) => {
      const catalogId = item.source_attribution?.catalog_product_id;
      if (catalogId) {
        userInventoryMap.set(catalogId, item.id);
      }
    });
  }

  // Prepare items to create in batch
  interface WishlistItemToCreate {
    user_id: string;
    name: string;
    brand: string | null;
    weight_grams: number | null;
    product_type_id: string | null;
    status: 'wishlist';
    notes: string | null;
    source_attribution?: SourceAttribution;
  }
  const wishlistItemsToCreate: WishlistItemToCreate[] = [];

  // Map to track which VIP item needs which gear_item_id
  const itemMapping: Array<{
    vipItemIndex: number;
    quantity: number;
    existingGearItemId?: string;
    needsCreation: boolean;
  }> = [];

  // Process each VIP loadout item
  loadoutItemsWithGear.forEach((item, index) => {
    const gearItem = item.gear_items;
    if (!gearItem) return;

    const catalogProductId = gearItem.source_attribution?.catalog_product_id;

    // Check if user already has this item in their inventory (from batch fetch)
    if (catalogProductId && userInventoryMap.has(catalogProductId)) {
      itemMapping.push({
        vipItemIndex: index,
        quantity: item.quantity,
        existingGearItemId: userInventoryMap.get(catalogProductId),
        needsCreation: false,
      });
    } else {
      // Queue for batch creation
      itemMapping.push({
        vipItemIndex: index,
        quantity: item.quantity,
        needsCreation: true,
      });

      wishlistItemsToCreate.push({
        user_id: user.id,
        name: gearItem.name || 'Unknown Item',
        brand: gearItem.brand ?? null,
        weight_grams: gearItem.weight_grams ?? null,
        product_type_id: gearItem.product_type_id ?? null,
        status: 'wishlist',
        notes: gearItem.notes ?? null,
        ...(gearItem.source_attribution && { source_attribution: gearItem.source_attribution }),
      });
    }
  });

  // Batch create all wishlist items
  let wishlistItemsCreated = 0;
  const createdItemIds: string[] = [];
  if (wishlistItemsToCreate.length > 0) {
    const { data: createdItems, error: createItemsError } = await supabase
      .from('gear_items')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(wishlistItemsToCreate as any)
      .select('id');

    if (createItemsError) throw createItemsError;
    wishlistItemsCreated = createdItems?.length || 0;
    createdItemIds.push(...(createdItems || []).map((item: { id: string }) => item.id));
  }

  // Build loadout_items array with correct gear_item_ids
  const loadoutItemsToInsert: Array<{
    loadout_id: string;
    gear_item_id: string;
    quantity: number;
  }> = [];

  let createdItemCounter = 0;
  itemMapping.forEach((mapping) => {
    const gearItemId = mapping.needsCreation
      ? createdItemIds[createdItemCounter++]
      : mapping.existingGearItemId!;

    loadoutItemsToInsert.push({
      loadout_id: newLoadout.id,
      gear_item_id: gearItemId,
      quantity: mapping.quantity,
    });
  });

  // Batch insert all loadout items
  if (loadoutItemsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('loadout_items')
      .insert(loadoutItemsToInsert);

    if (insertError) throw insertError;
  }

  return {
    loadoutId: newLoadout.id,
    loadoutName: newLoadoutName,
    itemsAdded: loadoutItemsToInsert.length,
    wishlistItemsCreated,
  };
}

// =============================================================================
// Transform Functions (DB -> TypeScript types)
// =============================================================================

function transformVipAccount(data: VipAccountRow | Record<string, unknown>) {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    bio: (data.bio ?? '') as string,
    avatarUrl: (data.avatar_url ?? '') as string,
    socialLinks: (data.social_links ?? {}) as Record<string, string>,
    status: data.status as 'curated' | 'claimed',
    isFeatured: data.is_featured as boolean,
    claimedByUserId: (data.claimed_by_user_id ?? null) as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    archivedAt: (data.archived_at ?? null) as string | null,
    archiveReason: (data.archive_reason ?? null) as string | null,
  };
}

function _transformVipLoadout(data: Record<string, unknown>) {
  return {
    id: data.id as string,
    vipId: data.vip_id as string,
    name: data.name as string,
    slug: data.slug as string,
    sourceUrl: data.source_url as string,
    description: data.description as string | null,
    tripType: data.trip_type as string | null,
    dateRange: data.date_range as string | null,
    status: data.status as 'draft' | 'published',
    isSourceAvailable: data.is_source_available as boolean,
    sourceCheckedAt: data.source_checked_at as string | null,
    createdBy: data.created_by as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    publishedAt: data.published_at as string | null,
  };
}

/**
 * Transform unified loadout (from loadouts table) to VIP loadout structure
 * Used when querying VIP loadouts from the unified schema
 */
function transformUnifiedLoadout(data: LoadoutRow | Record<string, unknown>, vipId: string) {
  return {
    id: data.id as string,
    vipId, // Passed from VIP account
    name: data.name as string,
    slug: ((data as Record<string, unknown>).slug as string) || '',
    sourceUrl: '', // Not available in unified schema
    description: (data.description as string | null) ?? null,
    tripType: null, // Not available in unified schema
    dateRange: null, // Not available in unified schema
    status: 'published' as const, // VIP loadouts from unified schema are always published
    isSourceAvailable: true,
    sourceCheckedAt: null,
    createdBy: (data.user_id as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    publishedAt: (data.created_at as string | null) ?? null, // Use created_at as published_at
  };
}

function _transformVipLoadoutItem(data: Record<string, unknown>) {
  return {
    id: data.id as string,
    vipLoadoutId: data.vip_loadout_id as string,
    gearItemId: data.gear_item_id as string | null,
    name: data.name as string,
    brand: data.brand as string | null,
    weightGrams: data.weight_grams as number,
    quantity: data.quantity as number,
    notes: data.notes as string | null,
    category: data.category as string,
    sortOrder: data.sort_order as number,
    createdAt: data.created_at as string,
  };
}
