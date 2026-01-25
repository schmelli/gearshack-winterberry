/* eslint-disable @typescript-eslint/no-explicit-any -- user_blocks/profiles tables not in generated types */
/**
 * GET /api/messaging/users/search
 *
 * Feature: 046-user-messaging-system
 * Task: T029, T032
 *
 * Searches for GearShack users by display_name or trail_name.
 * Filters by discoverable=true and excludes blocked users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }

    // Get blocked user IDs (users we blocked or who blocked us)
    // Use separate queries to avoid string interpolation in .or() clause
    const [{ data: blocksAsUser }, { data: blocksAsBlocked }] = await Promise.all([
      (supabase as any)
        .from('user_blocks')
        .select('user_id, blocked_id')
        .eq('user_id', user.id),
      (supabase as any)
        .from('user_blocks')
        .select('user_id, blocked_id')
        .eq('blocked_id', user.id),
    ]);
    const blocks = [...(blocksAsUser || []), ...(blocksAsBlocked || [])];

    const blockedIds = new Set<string>();
    if (blocks) {
      for (const block of blocks) {
        blockedIds.add(block.user_id);
        blockedIds.add(block.blocked_id);
      }
    }
    // Don't filter out ourselves from blocks
    blockedIds.delete(user.id);

    // Search users - Using ilike for case-insensitive search
    // Filter by discoverable=true (T043)
    // SECURITY: Escape ILIKE special characters and PostgREST operators to prevent injection
    // Order matters: escape backslash first, then wildcards, then PostgREST operators
    const sanitizedQuery = query
      .slice(0, 100) // Limit length to prevent DoS
      .replace(/\\/g, '\\\\')  // Escape backslash first
      .replace(/%/g, '\\%')    // Escape ILIKE %
      .replace(/_/g, '\\_')    // Escape ILIKE _
      .replace(/,/g, '')       // Remove commas (PostgREST .or() delimiter)
      .replace(/\(/g, '')      // Remove parentheses
      .replace(/\)/g, '')
      .replace(/\./g, ' ')     // Replace dots (prevents .eq. .neq. injection)
      .replace(/:/g, '')       // Remove colons (prevents ::text casting)
      .trim();
    const { data: users, error: searchError } = await (supabase as any)
      .from('profiles')
      .select('id, display_name, avatar_url, trail_name, bio, discoverable')
      .neq('id', user.id) // Exclude self
      .or(`display_name.ilike.%${sanitizedQuery}%,trail_name.ilike.%${sanitizedQuery}%`)
      .limit(20);

    if (searchError) {
      console.error('[User Search] Search failed:', searchError);
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      );
    }

    // Filter out blocked users and non-discoverable users (T043)
    interface UserRow {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
      trail_name: string | null;
      bio: string | null;
      discoverable: boolean | null;
    }

    const filteredUsers = (users || []).filter((u: UserRow) => {
      // Exclude blocked users
      if (blockedIds.has(u.id)) return false;
      // Exclude non-discoverable users (default to true if not set)
      if (u.discoverable === false) return false;
      return true;
    }).map((u: UserRow) => ({
      // Remove discoverable from response
      id: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      trail_name: u.trail_name,
      bio: u.bio,
    }));

    return NextResponse.json({
      success: true,
      users: filteredUsers,
    });
  } catch (error) {
    console.error('[User Search] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
