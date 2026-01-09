/**
 * VIP Admin Service Layer
 *
 * Feature: 052-vip-loadouts
 * Task: T038
 *
 * Admin operations for VIP accounts and loadouts.
 * Requires admin role authentication.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  VipWithStats,
  CreateVipRequest,
  UpdateVipRequest,
  // CreateVipLoadoutRequest, // REMOVED - use regular loadout types
  // UpdateVipLoadoutRequest, // REMOVED - use regular loadout types
} from '@/types/vip';

// =============================================================================
// VIP Account Operations
// =============================================================================

/**
 * Get all VIPs for admin (includes archived)
 *
 * Note: VIP loadouts now use the unified schema (loadouts table with is_vip_loadout=true).
 * Loadout counts are fetched separately since there's no direct FK relationship.
 */
export async function getAllVips(): Promise<VipWithStats[]> {
  const supabase = createClient();

  // Fetch all VIPs with follower counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('vip_accounts')
    .select(`
      *,
      vip_follows(count)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get loadout counts for claimed VIPs (those with claimed_by_user_id)
  // VIP loadouts are in the regular loadouts table with is_vip_loadout = true
  const claimedUserIds = (data || [])
    .filter((vip: Record<string, unknown>) => vip.claimed_by_user_id)
    .map((vip: Record<string, unknown>) => vip.claimed_by_user_id as string);

  const loadoutCountMap: Map<string, number> = new Map();

  if (claimedUserIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loadoutCounts } = await (supabase as any)
      .from('loadouts')
      .select('user_id')
      .in('user_id', claimedUserIds)
      .eq('is_vip_loadout', true);

    // Count loadouts per user_id
    if (loadoutCounts) {
      loadoutCounts.forEach((row: { user_id: string }) => {
        const count = loadoutCountMap.get(row.user_id) || 0;
        loadoutCountMap.set(row.user_id, count + 1);
      });
    }
  }

  // Transform VIPs with stats
  const vips: VipWithStats[] = (data || []).map((vip: Record<string, unknown>) => {
    const vipFollows = vip.vip_follows as { count: number }[] | null;
    const claimedByUserId = vip.claimed_by_user_id as string | null;

    return {
      id: vip.id as string,
      name: vip.name as string,
      slug: vip.slug as string,
      bio: vip.bio as string,
      avatarUrl: vip.avatar_url as string,
      socialLinks: vip.social_links as Record<string, string>,
      status: vip.status as 'curated' | 'claimed',
      isFeatured: vip.is_featured as boolean,
      claimedByUserId,
      createdAt: vip.created_at as string,
      updatedAt: vip.updated_at as string,
      archivedAt: vip.archived_at as string | null,
      archiveReason: vip.archive_reason as string | null,
      followerCount: vipFollows?.[0]?.count ?? 0,
      loadoutCount: claimedByUserId ? (loadoutCountMap.get(claimedByUserId) || 0) : 0,
    };
  });

  return vips;
}

/**
 * Create a new VIP account
 */
export async function createVip(data: CreateVipRequest & { slug: string }): Promise<VipWithStats> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vip, error } = await (supabase as any)
    .from('vip_accounts')
    .insert({
      name: data.name,
      slug: data.slug,
      bio: data.bio,
      avatar_url: data.avatarUrl,
      social_links: data.socialLinks,
      is_featured: data.isFeatured,
      status: 'curated',
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: vip.id,
    name: vip.name,
    slug: vip.slug,
    bio: vip.bio,
    avatarUrl: vip.avatar_url,
    socialLinks: vip.social_links,
    status: vip.status,
    isFeatured: vip.is_featured,
    claimedByUserId: vip.claimed_by_user_id,
    createdAt: vip.created_at,
    updatedAt: vip.updated_at,
    archivedAt: vip.archived_at,
    archiveReason: vip.archive_reason,
    followerCount: 0,
    loadoutCount: 0,
  };
}

/**
 * Update a VIP account
 */
export async function updateVip(vipId: string, data: UpdateVipRequest): Promise<void> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
  if (data.socialLinks !== undefined) updateData.social_links = data.socialLinks;
  if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('vip_accounts')
    .update(updateData)
    .eq('id', vipId);

  if (error) throw error;
}

/**
 * Toggle VIP featured status
 */
export async function toggleVipFeatured(vipId: string, isFeatured: boolean): Promise<void> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('vip_accounts')
    .update({ is_featured: isFeatured })
    .eq('id', vipId);

  if (error) throw error;
}

/**
 * Archive a VIP account
 */
export async function archiveVip(vipId: string, reason?: string): Promise<void> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('vip_accounts')
    .update({
      archived_at: new Date().toISOString(),
      archive_reason: reason || null,
    })
    .eq('id', vipId);

  if (error) throw error;
}

/**
 * Restore an archived VIP account
 */
export async function restoreVip(vipId: string): Promise<void> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('vip_accounts')
    .update({
      archived_at: null,
      archive_reason: null,
    })
    .eq('id', vipId);

  if (error) throw error;
}

// =============================================================================
// VIP Loadout Operations
// =============================================================================
//
// DEPRECATED: VIP loadouts now use the unified loadout schema.
// VIP loadouts are regular loadouts with:
// - is_vip_loadout = true
// - user_id = VIP's user ID (from profiles where account_type = 'vip')
// - Items are regular gear_items with source_attribution pointing to catalog
//
// Use the regular loadout management functions from @/hooks/loadouts
// and the admin catalog search flow in LoadoutItemsDialog component.

// =============================================================================
// Source URL Validation
// =============================================================================

/**
 * Validate source URL availability
 */
export async function validateSourceUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch('/api/vip/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    return data.isAvailable;
  } catch {
    return false;
  }
}
