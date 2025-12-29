/**
 * API Route: Featured VIPs
 *
 * Feature: 052-vip-loadouts
 * Task: T029
 *
 * GET /api/vip/featured - Get featured VIPs for Community page
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface ErrorResponse {
  error: string;
}

interface FeaturedVipsResponse {
  vips: VipWithStats[];
}

// =============================================================================
// Query Schema
// =============================================================================

const featuredQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).optional().default(6),
});

// =============================================================================
// Transform Functions
// =============================================================================

function transformVipAccount(data: Record<string, unknown>): VipWithStats {
  // Extract counts from the aggregated query response
  const vipFollows = data.vip_follows as unknown[];
  const vipLoadouts = data.vip_loadouts as unknown[];

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
    followerCount: vipFollows?.[0]?.count ?? 0,
    loadoutCount: vipLoadouts?.[0]?.count ?? 0,
  };
}

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<FeaturedVipsResponse | ErrorResponse>> {
  try {
    const supabase = await createClient();

    // Get current user for follow status
    const { data: { user } } = await supabase.auth.getUser();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get('limit') || undefined,
    };

    // Validate
    const validation = featuredQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { limit } = validation.data;

    // Get featured VIPs with counts in a single query (fixing N+1 problem)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error: queryError } = await (supabase as any)
      .from('vip_accounts')
      .select(`
        *,
        vip_follows(count),
        vip_loadouts!inner(count)
      `)
      .eq('is_featured', true)
      .is('archived_at', null)
      .eq('vip_loadouts.status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (queryError) {
      console.error('[API] Failed to fetch featured VIPs:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch featured VIPs' },
        { status: 500 }
      );
    }

    // Transform VIPs with stats (counts now included in the query)
    let vips: VipWithStats[] = (rows || []).map((row: Record<string, unknown>) =>
      transformVipAccount(row)
    );

    // Check follow status for authenticated users (batch query)
    if (user) {
      const vipIds = vips.map(v => v.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: follows } = await (supabase as any)
        .from('vip_follows')
        .select('vip_id')
        .eq('follower_id', user.id)
        .in('vip_id', vipIds);

      const followedVipIds = new Set((follows || []).map((f: { vip_id: string }) => f.vip_id));

      vips = vips.map(vip => ({
        ...vip,
        isFollowing: followedVipIds.has(vip.id),
      }));
    }

    return NextResponse.json({ vips });
  } catch (error) {
    console.error('[API] Featured VIPs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
