/**
 * API Route: VIP Profile by Slug
 *
 * Feature: 052-vip-loadouts
 * Task: T027
 *
 * GET /api/vip/[slug] - Get VIP profile with loadouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { VipProfile, VipLoadoutSummary } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface ErrorResponse {
  error: string;
}

interface RouteParams {
  params: Promise<{ slug: string }>;
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

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<VipProfile | ErrorResponse>> {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Get current user for follow status
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

    // Check if user is following
    let isFollowing = false;
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: follow } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('vip_follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('vip_id', vip.id)
        .single();
      isFollowing = !!follow;
    }

    // Get published loadouts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loadouts } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_loadouts')
      .select('*')
      .eq('vip_id', vip.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    // Get weight/item counts for each loadout
    const loadoutSummaries: VipLoadoutSummary[] = await Promise.all(
      (loadouts || []).map(async (loadout: Record<string, unknown>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: items } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('vip_loadout_items')
          .select('weight_grams, quantity')
          .eq('vip_loadout_id', loadout.id);

        const totalWeight = (items || []).reduce(
          (sum: number, item: { weight_grams: number; quantity: number }) =>
            sum + item.weight_grams * item.quantity,
          0
        );

        return {
          ...transformVipLoadout(loadout),
          totalWeightGrams: totalWeight,
          itemCount: items?.length ?? 0,
        };
      })
    );

    const profile: VipProfile = {
      ...transformVipAccount(vip),
      followerCount: followerCount ?? 0,
      loadoutCount: loadoutCount ?? 0,
      isFollowing,
      loadouts: loadoutSummaries,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('[API] VIP profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
