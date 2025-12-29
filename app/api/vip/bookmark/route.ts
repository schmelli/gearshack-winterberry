/**
 * VIP Bookmark API Route
 *
 * Feature: 052-vip-loadouts
 * Task: T072
 *
 * POST /api/vip/bookmark - Bookmark a VIP loadout
 * DELETE /api/vip/bookmark - Remove bookmark from a VIP loadout
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Validation Schemas
// =============================================================================

const bookmarkSchema = z.object({
  loadoutId: z.string().uuid('Invalid loadout ID'),
});

// =============================================================================
// POST - Bookmark a loadout
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = bookmarkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { loadoutId } = validation.data;

    // Verify loadout exists and is published
    const { data: loadout, error: loadoutError } = await supabase
      .from('vip_loadouts')
      .select('id, status')
      .eq('id', loadoutId)
      .eq('status', 'published')
      .single();

    if (loadoutError || !loadout) {
      return NextResponse.json(
        { error: 'Loadout not found' },
        { status: 404 }
      );
    }

    // Insert bookmark (upsert to handle duplicates gracefully)
    const { error: insertError } = await supabase
      .from('vip_bookmarks')
      .upsert(
        {
          user_id: user.id,
          vip_loadout_id: loadoutId,
        },
        {
          onConflict: 'user_id,vip_loadout_id',
          ignoreDuplicates: true,
        }
      );

    if (insertError) {
      console.error('Error bookmarking loadout:', insertError);
      return NextResponse.json(
        { error: 'Failed to bookmark loadout' },
        { status: 500 }
      );
    }

    return NextResponse.json({ isBookmarked: true });
  } catch (error) {
    console.error('Unexpected error in POST /api/vip/bookmark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Remove bookmark from a loadout
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const loadoutId = searchParams.get('loadoutId');

    if (!loadoutId) {
      return NextResponse.json(
        { error: 'loadoutId is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const validation = z.string().uuid().safeParse(loadoutId);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid loadout ID' },
        { status: 400 }
      );
    }

    // Delete bookmark
    const { error: deleteError } = await supabase
      .from('vip_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('vip_loadout_id', loadoutId);

    if (deleteError) {
      console.error('Error removing bookmark:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({ isBookmarked: false });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/vip/bookmark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET - Get user's bookmarked loadouts
// =============================================================================

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: bookmarks, error } = await supabase
      .from('vip_bookmarks')
      .select(`
        created_at,
        vip_loadouts (
          id,
          name,
          slug,
          status,
          published_at,
          vip_accounts (
            id,
            name,
            slug,
            avatar_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookmarks' },
        { status: 500 }
      );
    }

    // Filter out any bookmarks where the loadout was deleted/unpublished
    const validBookmarks = (bookmarks ?? [])
      .filter((b) => b.vip_loadouts && (b.vip_loadouts as { status?: string }).status === 'published')
      .map((b) => ({
        bookmarkedAt: b.created_at,
        loadout: {
          id: (b.vip_loadouts as { id: string }).id,
          name: (b.vip_loadouts as { name: string }).name,
          slug: (b.vip_loadouts as { slug: string }).slug,
          publishedAt: (b.vip_loadouts as { published_at: string }).published_at,
          vip: (b.vip_loadouts as { vip_accounts: Record<string, unknown> }).vip_accounts,
        },
      }));

    return NextResponse.json({ bookmarks: validBookmarks });
  } catch (error) {
    console.error('Unexpected error in GET /api/vip/bookmark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
