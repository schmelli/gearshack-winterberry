/**
 * API Route: VIP Loadout Options
 *
 * Feature: 052-vip-loadouts
 * Task: Performance fix for VipLoadoutSelector N+1 query problem
 *
 * GET /api/vip-loadout-options - Efficiently fetch all VIPs with their published loadouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { VipWithStats, VipLoadoutSummary } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

export interface VipLoadoutOption {
  vip: VipWithStats;
  loadout: VipLoadoutSummary;
}

interface VipLoadoutOptionsResponse {
  options: VipLoadoutOption[];
}

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Transform Functions
// =============================================================================

function transformVipAccount(data: Record<string, unknown>): VipWithStats {
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
    followerCount: 0, // Not needed for selector
    loadoutCount: 0, // Not needed for selector
  };
}

function transformLoadout(data: Record<string, unknown>): VipLoadoutSummary {
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
    totalWeightGrams: data.total_weight_grams as number,
    itemCount: data.item_count as number,
  };
}

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<VipLoadoutOptionsResponse | ErrorResponse>> {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const excludeLoadoutId = searchParams.get('excludeLoadoutId');

    // Efficiently fetch all VIPs with their published loadouts in a single query
    // Using Supabase's foreign table join syntax
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loadouts, error: queryError } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_loadouts')
      .select(`
        id,
        vip_id,
        name,
        slug,
        source_url,
        description,
        trip_type,
        date_range,
        status,
        is_source_available,
        source_checked_at,
        created_by,
        created_at,
        updated_at,
        published_at,
        vip_accounts!inner (
          id,
          name,
          slug,
          bio,
          avatar_url,
          social_links,
          status,
          is_featured,
          claimed_by_user_id,
          created_at,
          updated_at,
          archived_at,
          archive_reason
        )
      `)
      .eq('status', 'published')
      .is('vip_accounts.archived_at', null)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('[API] Failed to fetch VIP loadout options:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch VIP loadout options' },
        { status: 500 }
      );
    }

    // Get item counts and total weights for each loadout in a single batch query
    const loadoutIds = (loadouts || []).map((l: Record<string, unknown>) => l.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: itemStats, error: statsError } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_loadout_items')
      .select('vip_loadout_id, weight_grams, quantity')
      .in('vip_loadout_id', loadoutIds);

    if (statsError) {
      console.error('[API] Failed to fetch loadout stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch loadout stats' },
        { status: 500 }
      );
    }

    // Create a map of stats by loadout ID for O(1) lookup
    const statsByLoadout = (itemStats || []).reduce(
      (acc: Record<string, { totalWeight: number; itemCount: number }>, item: Record<string, unknown>) => {
        const loadoutId = item.vip_loadout_id as string;
        if (!acc[loadoutId]) {
          acc[loadoutId] = { totalWeight: 0, itemCount: 0 };
        }
        const weight = (item.weight_grams as number) * (item.quantity as number);
        acc[loadoutId].totalWeight += weight;
        acc[loadoutId].itemCount += (item.quantity as number);
        return acc;
      },
      {}
    );

    // Transform the data into VipLoadoutOption format
    const options: VipLoadoutOption[] = (loadouts || [])
      .map((row: Record<string, unknown>) => {
        const vipData = row.vip_accounts as Record<string, unknown>;
        const stats = statsByLoadout[row.id as string] || { totalWeight: 0, itemCount: 0 };

        const loadout = transformLoadout({
          ...row,
          total_weight_grams: stats.totalWeight,
          item_count: stats.itemCount,
        });

        // Filter out excluded loadout
        if (excludeLoadoutId && loadout.id === excludeLoadoutId) {
          return null;
        }

        return {
          vip: transformVipAccount(vipData),
          loadout,
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((option: any): option is VipLoadoutOption => option !== null);

    return NextResponse.json({ options });
  } catch (error) {
    console.error('[API] VIP loadout options error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
