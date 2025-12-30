/**
 * API Route: VIP Loadout Detail
 *
 * Feature: 052-vip-loadouts
 * Task: T028
 *
 * GET /api/vip/[slug]/[loadoutSlug] - Get VIP loadout with items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { VipLoadoutWithItems, CategoryBreakdown } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface ErrorResponse {
  error: string;
}

interface RouteParams {
  params: Promise<{ slug: string; loadoutSlug: string }>;
}

// =============================================================================
// Transform Functions
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

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<VipLoadoutWithItems | ErrorResponse>> {
  try {
    const { slug, loadoutSlug } = await params;
    const supabase = await createClient();

    // Get current user for bookmark status
    const { data: { user } } = await supabase.auth.getUser();

    // Get VIP account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vip, error: vipError } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_accounts')
      .select('*')
      .eq('slug', slug)
      .is('archived_at', null)
      .single();

    if (vipError || !vip) {
      return NextResponse.json(
        { error: 'VIP not found' },
        { status: 404 }
      );
    }

    // Get follower count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: followerCount } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_follows')
      .select('*', { count: 'exact', head: true })
      .eq('vip_id', vip.id);

    // Get loadout count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: loadoutCount } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_loadouts')
      .select('*', { count: 'exact', head: true })
      .eq('vip_id', vip.id)
      .eq('status', 'published');

    // Get loadout
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loadout, error: loadoutError } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_loadouts')
      .select('*')
      .eq('vip_id', vip.id)
      .eq('slug', loadoutSlug)
      .eq('status', 'published')
      .single();

    if (loadoutError || !loadout) {
      return NextResponse.json(
        { error: 'Loadout not found' },
        { status: 404 }
      );
    }

    // Get loadout items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_loadout_items')
      .select('*')
      .eq('vip_loadout_id', loadout.id)
      .order('category')
      .order('sort_order');

    // Check if bookmarked
    let isBookmarked = false;
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bookmark } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('vip_bookmarks')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('vip_loadout_id', loadout.id)
        .single();
      isBookmarked = !!bookmark;
    }

    // Calculate category breakdown
    const categoryMap = new Map<string, { weight: number; count: number }>();
    (items || []).forEach((item: Record<string, unknown>) => {
      const category = item.category as string;
      const weight = (item.weight_grams as number) * (item.quantity as number);
      const existing = categoryMap.get(category) ?? { weight: 0, count: 0 };
      categoryMap.set(category, {
        weight: existing.weight + weight,
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

    const totalWeight = (items || []).reduce(
      (sum: number, item: Record<string, unknown>) =>
        sum + (item.weight_grams as number) * (item.quantity as number),
      0
    );

    const response: VipLoadoutWithItems = {
      ...transformVipLoadout(loadout),
      totalWeightGrams: totalWeight,
      itemCount: items?.length ?? 0,
      isBookmarked,
      vip: {
        ...transformVipAccount(vip),
        followerCount: followerCount ?? 0,
        loadoutCount: loadoutCount ?? 0,
      },
      items: (items || []).map(transformVipLoadoutItem),
      categoryBreakdown,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] VIP loadout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
