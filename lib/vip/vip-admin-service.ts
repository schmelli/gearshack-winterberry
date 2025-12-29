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
  CreateVipLoadoutRequest,
  UpdateVipLoadoutRequest,
} from '@/types/vip';

// =============================================================================
// VIP Account Operations
// =============================================================================

/**
 * Get all VIPs for admin (includes archived)
 */
export async function getAllVips(): Promise<VipWithStats[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('vip_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get stats for each VIP
  const vips: VipWithStats[] = await Promise.all(
    (data || []).map(async (vip: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: followerCount } = await (supabase as any)
        .from('vip_follows')
        .select('*', { count: 'exact', head: true })
        .eq('vip_id', vip.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: loadoutCount } = await (supabase as any)
        .from('vip_loadouts')
        .select('*', { count: 'exact', head: true })
        .eq('vip_id', vip.id);

      return {
        id: vip.id as string,
        name: vip.name as string,
        slug: vip.slug as string,
        bio: vip.bio as string,
        avatarUrl: vip.avatar_url as string,
        socialLinks: vip.social_links as Record<string, string>,
        status: vip.status as 'curated' | 'claimed',
        isFeatured: vip.is_featured as boolean,
        claimedByUserId: vip.claimed_by_user_id as string | null,
        createdAt: vip.created_at as string,
        updatedAt: vip.updated_at as string,
        archivedAt: vip.archived_at as string | null,
        archiveReason: vip.archive_reason as string | null,
        followerCount: followerCount ?? 0,
        loadoutCount: loadoutCount ?? 0,
      };
    })
  );

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

/**
 * Create a VIP loadout
 */
export async function createVipLoadout(
  vipId: string,
  data: CreateVipLoadoutRequest
): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Generate slug from name
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: loadout, error: loadoutError } = await (supabase as any)
    .from('vip_loadouts')
    .insert({
      vip_id: vipId,
      name: data.name,
      slug,
      source_url: data.sourceUrl,
      description: data.description,
      trip_type: data.tripType,
      date_range: data.dateRange,
      status: data.status,
      created_by: user?.id,
      published_at: data.status === 'published' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (loadoutError) throw loadoutError;

  // Insert items
  if (data.items.length > 0) {
    const itemsToInsert = data.items.map((item, index) => ({
      vip_loadout_id: loadout.id,
      gear_item_id: item.gearItemId || null,
      name: item.name,
      brand: item.brand || null,
      weight_grams: item.weightGrams,
      quantity: item.quantity,
      category: item.category,
      notes: item.notes || null,
      sort_order: index,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase as any)
      .from('vip_loadout_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
  }

  return loadout.id;
}

/**
 * Update a VIP loadout
 */
export async function updateVipLoadout(
  loadoutId: string,
  data: UpdateVipLoadoutRequest
): Promise<void> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.sourceUrl !== undefined) updateData.source_url = data.sourceUrl;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.tripType !== undefined) updateData.trip_type = data.tripType;
  if (data.dateRange !== undefined) updateData.date_range = data.dateRange;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === 'published') {
      updateData.published_at = new Date().toISOString();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('vip_loadouts')
    .update(updateData)
    .eq('id', loadoutId);

  if (error) throw error;
}

/**
 * Publish a VIP loadout
 */
export async function publishVipLoadout(loadoutId: string): Promise<void> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('vip_loadouts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', loadoutId);

  if (error) throw error;
}

/**
 * Unpublish a VIP loadout
 */
export async function unpublishVipLoadout(loadoutId: string): Promise<void> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('vip_loadouts')
    .update({ status: 'draft' })
    .eq('id', loadoutId);

  if (error) throw error;
}

/**
 * Delete a VIP loadout
 */
export async function deleteVipLoadout(loadoutId: string): Promise<void> {
  const supabase = createClient();

  // Delete items first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('vip_loadout_items')
    .delete()
    .eq('vip_loadout_id', loadoutId);

  // Delete loadout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('vip_loadouts')
    .delete()
    .eq('id', loadoutId);

  if (error) throw error;
}

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
