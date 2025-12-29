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
import type {
  VipWithStats,
  VipProfile,
  VipLoadoutSummary,
  VipLoadoutWithItems,
  VipListResponse,
  VipFollowResponse,
  VipBookmarkResponse,
  CopyLoadoutResponse,
  CreateVipRequest,
  UpdateVipRequest,
  CreateVipLoadoutRequest,
  UpdateVipLoadoutRequest,
  CategoryBreakdown,
} from '@/types/vip';

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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from('vip_accounts')
    .select(`
      *,
      follower_count:vip_follows(count),
      loadout_count:vip_loadouts(count)
    `)
    .eq('is_featured', true)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Check if user is following each VIP
  const vips = await Promise.all(
    (data ?? []).map(async (vip) => {
      let isFollowing = false;
      if (user) {
        const { data: followData } = await (supabase as any)
          .from('vip_follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('vip_id', vip.id)
          .single();
        isFollowing = !!followData;
      }

      return {
        ...transformVipAccount(vip),
        followerCount: vip.follower_count?.[0]?.count ?? 0,
        loadoutCount: vip.loadout_count?.[0]?.count ?? 0,
        isFollowing,
      };
    })
  );

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
  const supabase = createClient();

  let queryBuilder = (supabase as any)
    .from('vip_accounts')
    .select(`
      *,
      follower_count:vip_follows(count),
      loadout_count:vip_loadouts(count)
    `, { count: 'exact' })
    .is('archived_at', null);

  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,bio.ilike.%${query}%`);
  }

  if (featured !== undefined) {
    queryBuilder = queryBuilder.eq('is_featured', featured);
  }

  const { data, error, count } = await queryBuilder
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const vips: VipWithStats[] = (data ?? []).map((vip) => ({
    ...transformVipAccount(vip),
    followerCount: vip.follower_count?.[0]?.count ?? 0,
    loadoutCount: vip.loadout_count?.[0]?.count ?? 0,
  }));

  return {
    vips,
    total: count ?? 0,
    hasMore: offset + limit < (count ?? 0),
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: vip, error } = await (supabase as any)
    .from('vip_accounts')
    .select(`
      *,
      follower_count:vip_follows(count),
      loadout_count:vip_loadouts(count)
    `)
    .eq('slug', slug)
    .is('archived_at', null)
    .single();

  if (error || !vip) return null;

  // Get published loadouts
  const { data: loadouts } = await (supabase as any)
    .from('vip_loadouts')
    .select('*')
    .eq('vip_id', vip.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  // Check if user is following
  let isFollowing = false;
  if (user) {
    const { data: followData } = await (supabase as any)
      .from('vip_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('vip_id', vip.id)
      .single();
    isFollowing = !!followData;
  }

  // Get loadout summaries with weights
  const loadoutSummaries: VipLoadoutSummary[] = await Promise.all(
    (loadouts ?? []).map(async (loadout) => {
      const { data: items } = await (supabase as any)
        .from('vip_loadout_items')
        .select('weight_grams, quantity')
        .eq('vip_loadout_id', loadout.id);

      const totalWeight = (items ?? []).reduce(
        (sum, item) => sum + item.weight_grams * item.quantity,
        0
      );

      return {
        ...transformVipLoadout(loadout),
        totalWeightGrams: totalWeight,
        itemCount: items?.length ?? 0,
      };
    })
  );

  return {
    ...transformVipAccount(vip),
    followerCount: vip.follower_count?.[0]?.count ?? 0,
    loadoutCount: vip.loadout_count?.[0]?.count ?? 0,
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get VIP first
  const { data: vip } = await (supabase as any)
    .from('vip_accounts')
    .select(`
      *,
      follower_count:vip_follows(count),
      loadout_count:vip_loadouts(count)
    `)
    .eq('slug', vipSlug)
    .is('archived_at', null)
    .single();

  if (!vip) return null;

  // Get loadout
  const { data: loadout } = await (supabase as any)
    .from('vip_loadouts')
    .select('*')
    .eq('vip_id', vip.id)
    .eq('slug', loadoutSlug)
    .eq('status', 'published')
    .single();

  if (!loadout) return null;

  // Get loadout items
  const { data: items } = await (supabase as any)
    .from('vip_loadout_items')
    .select('*')
    .eq('vip_loadout_id', loadout.id)
    .order('category')
    .order('sort_order');

  // Check if bookmarked
  let isBookmarked = false;
  if (user) {
    const { data: bookmarkData } = await (supabase as any)
      .from('vip_bookmarks')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('vip_loadout_id', loadout.id)
      .single();
    isBookmarked = !!bookmarkData;
  }

  // Calculate category breakdown
  const categoryMap = new Map<string, { weight: number; count: number }>();
  (items ?? []).forEach((item) => {
    const existing = categoryMap.get(item.category) ?? { weight: 0, count: 0 };
    categoryMap.set(item.category, {
      weight: existing.weight + item.weight_grams * item.quantity,
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

  const totalWeight = (items ?? []).reduce(
    (sum, item) => sum + item.weight_grams * item.quantity,
    0
  );

  return {
    ...transformVipLoadout(loadout),
    totalWeightGrams: totalWeight,
    itemCount: items?.length ?? 0,
    isBookmarked,
    vip: {
      ...transformVipAccount(vip),
      followerCount: vip.follower_count?.[0]?.count ?? 0,
      loadoutCount: vip.loadout_count?.[0]?.count ?? 0,
    },
    items: (items ?? []).map(transformVipLoadoutItem),
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const { error } = await supabase.from('vip_follows').insert({
    follower_id: user.id,
    vip_id: vipId,
  });

  if (error && error.code !== '23505') throw error; // Ignore duplicate key error

  // Get updated follower count
  const { data: countData } = await (supabase as any)
    .from('vip_follows')
    .select('*', { count: 'exact', head: true })
    .eq('vip_id', vipId);

  return {
    isFollowing: true,
    followerCount: countData?.length ?? 0,
  };
}

/**
 * Unfollow a VIP
 */
export async function unfollowVip(vipId: string): Promise<VipFollowResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const { error } = await (supabase as any)
    .from('vip_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('vip_id', vipId);

  if (error) throw error;

  // Get updated follower count
  const { count } = await (supabase as any)
    .from('vip_follows')
    .select('*', { count: 'exact', head: true })
    .eq('vip_id', vipId);

  return {
    isFollowing: false,
    followerCount: count ?? 0,
  };
}

// =============================================================================
// Bookmark Operations
// =============================================================================

/**
 * Bookmark a VIP loadout
 */
export async function bookmarkLoadout(loadoutId: string): Promise<VipBookmarkResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const { error } = await supabase.from('vip_bookmarks').insert({
    user_id: user.id,
    vip_loadout_id: loadoutId,
  });

  if (error && error.code !== '23505') throw error;

  return { isBookmarked: true };
}

/**
 * Remove bookmark from a VIP loadout
 */
export async function unbookmarkLoadout(loadoutId: string): Promise<VipBookmarkResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  const { error } = await (supabase as any)
    .from('vip_bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('vip_loadout_id', loadoutId);

  if (error) throw error;

  return { isBookmarked: false };
}

/**
 * Get user's bookmarked loadouts
 */
export async function getUserBookmarkedLoadouts(): Promise<VipLoadoutSummary[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: bookmarks } = await (supabase as any)
    .from('vip_bookmarks')
    .select(`
      vip_loadout_id,
      vip_loadouts (
        *,
        vip_accounts (name, slug)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (bookmarks ?? [])
    .filter((b) => b.vip_loadouts)
    .map((b) => ({
      ...transformVipLoadout(b.vip_loadouts as Record<string, unknown>),
      totalWeightGrams: 0, // Would need separate query for weights
      itemCount: 0,
      isBookmarked: true,
    }));
}

// =============================================================================
// Copy Loadout Operation
// =============================================================================

/**
 * Copy a VIP loadout to user's account as wishlist items
 *
 * @param vipLoadoutId - UUID of the VIP loadout to copy
 * @returns Object containing the new loadout ID and name
 * @throws {Error} If user is not authenticated
 * @throws {Error} If VIP loadout is not found
 * @throws {Error} If database operation fails
 *
 * @remarks
 * Creates a new user loadout with:
 * - Name format: "{VIP Name}'s {Loadout Name} - Copy"
 * - All items copied with 'wishlist' status
 * - Reference to source VIP loadout (source_vip_loadout_id)
 * - Original item metadata preserved (name, brand, weight, category, notes)
 *
 * @example
 * ```ts
 * const { loadoutId, loadoutName } = await copyVipLoadout('uuid-here');
 * console.log(`Created loadout: ${loadoutName} with ID: ${loadoutId}`);
 * ```
 */
export async function copyVipLoadout(vipLoadoutId: string): Promise<CopyLoadoutResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required');

  // Get VIP loadout with items
  const { data: vipLoadout } = await (supabase as any)
    .from('vip_loadouts')
    .select(`
      *,
      vip_accounts (name),
      vip_loadout_items (*)
    `)
    .eq('id', vipLoadoutId)
    .single();

  if (!vipLoadout) throw new Error('VIP loadout not found');

  // Create new user loadout
  const loadoutName = `${vipLoadout.vip_accounts?.name}'s ${vipLoadout.name} - Copy`;

  const { data: newLoadout, error: loadoutError } = await (supabase as any)
    .from('loadouts')
    .insert({
      user_id: user.id,
      name: loadoutName,
      description: `Copied from VIP loadout: ${vipLoadout.name}`,
      source_vip_loadout_id: vipLoadoutId,
    })
    .select()
    .single();

  if (loadoutError) throw loadoutError;

  // Copy items as wishlist status
  const itemsToInsert = (vipLoadout.vip_loadout_items ?? []).map((item: Record<string, unknown>) => ({
    loadout_id: newLoadout.id,
    gear_item_id: item.gear_item_id,
    name: item.name,
    brand: item.brand,
    weight_grams: item.weight_grams,
    quantity: item.quantity,
    category: item.category,
    status: 'wishlist',
    notes: item.notes,
  }));

  if (itemsToInsert.length > 0) {
    const { error: itemsError } = await (supabase as any)
      .from('loadout_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
  }

  return {
    loadoutId: newLoadout.id,
    loadoutName,
  };
}

// =============================================================================
// Transform Functions (DB -> TypeScript types)
// =============================================================================

function transformVipAccount(data: Record<string, unknown>) {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    bio: data.bio as string,
    avatarUrl: data.avatar_url as string,
    socialLinks: data.social_links as Record<string, string>,
    status: data.status as 'curated' | 'claimed',
    isFeatured: data.is_featured as boolean,
    claimedByUserId: data.claimed_by_user_id as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    archivedAt: data.archived_at as string | null,
    archiveReason: data.archive_reason as string | null,
  };
}

function transformVipLoadout(data: Record<string, unknown>) {
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

function transformVipLoadoutItem(data: Record<string, unknown>) {
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
