/**
 * API Route: VIP Directory
 *
 * Feature: 052-vip-loadouts
 * Task: T026
 *
 * GET /api/vip - List VIPs with search and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { VipListResponse, VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface ErrorResponse {
  error: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

// =============================================================================
// Query Schema
// =============================================================================

const vipsQuerySchema = z.object({
  query: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  featured: z.enum(['true', 'false']).optional().transform((val) =>
    val === 'true' ? true : val === 'false' ? false : undefined
  ),
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
): Promise<NextResponse<VipListResponse | ErrorResponse>> {
  try {
    const supabase = await createClient();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      query: searchParams.get('query') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      featured: searchParams.get('featured') || undefined,
    };

    // Validate
    const validation = vipsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { query, limit, offset, featured } = validation.data;

    // Build query with count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dbQuery = (supabase as any)
      .from('vip_accounts')
      .select('*', { count: 'exact' })
      .is('archived_at', null);

    // Apply search filter
    if (query && query.trim()) {
      dbQuery = dbQuery.or(`name.ilike.%${query.trim()}%,bio.ilike.%${query.trim()}%`);
    }

    // Apply featured filter
    if (featured !== undefined) {
      dbQuery = dbQuery.eq('is_featured', featured);
    }

    // Apply ordering and pagination
    dbQuery = dbQuery
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: rows, error: queryError, count } = await dbQuery;

    if (queryError) {
      console.error('[API] Failed to fetch VIPs:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch VIPs' },
        { status: 500 }
      );
    }

    // Get follower and loadout counts for each VIP
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

        return {
          ...vip,
          followerCount: followerCount ?? 0,
          loadoutCount: loadoutCount ?? 0,
        };
      })
    );

    return NextResponse.json({
      vips,
      total: count ?? 0,
      hasMore: offset + limit < (count ?? 0),
    });
  } catch (error) {
    console.error('[API] VIP list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
