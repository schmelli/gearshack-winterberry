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
    followerCount: 0,
    loadoutCount: 0,
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

    // Get featured VIPs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error: queryError } = await (supabase as any)
      .from('vip_accounts')
      .select('*')
      .eq('is_featured', true)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (queryError) {
      console.error('[API] Failed to fetch featured VIPs:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch featured VIPs' },
        { status: 500 }
      );
    }

    // Get stats and follow status for each VIP
    const vips: VipWithStats[] = await Promise.all(
      (rows || []).map(async (row: Record<string, unknown>) => {
        const vip = transformVipAccount(row);

        // Get follower count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: followerCount } = await (supabase as any)
          .from('vip_follows')
          .select('*', { count: 'exact', head: true })
          .eq('vip_id', vip.id);

        // Get loadout count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: loadoutCount } = await (supabase as any)
          .from('vip_loadouts')
          .select('*', { count: 'exact', head: true })
          .eq('vip_id', vip.id)
          .eq('status', 'published');

        // Check if user is following
        let isFollowing = false;
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: follow } = await (supabase as any)
            .from('vip_follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('vip_id', vip.id)
            .single();
          isFollowing = !!follow;
        }

        return {
          ...vip,
          followerCount: followerCount ?? 0,
          loadoutCount: loadoutCount ?? 0,
          isFollowing,
        };
      })
    );

    return NextResponse.json({ vips });
  } catch (error) {
    console.error('[API] Featured VIPs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
