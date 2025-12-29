/**
 * Share View Tracking API
 *
 * Feature: Share Management - Analytics
 *
 * POST: Track a view for a shared loadout
 * Uses database function for atomic increment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// POST: Track a view
// =============================================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Get current user ID if authenticated (optional)
    const { data: { user } } = await supabase.auth.getUser();
    const viewerId = user?.id ?? null;

    // Call the database function to atomically increment view count
    // Using 'as any' because database types are out of date (RPC function exists but not in generated types)
    const { error } = await (supabase.rpc as any)('increment_share_view_count', {
      p_share_token: token,
      p_viewer_id: viewerId,
    });

    if (error) {
      // Don't fail the page load if tracking fails
      console.error('[shares/track-view] Error:', error);
      return NextResponse.json({ success: false, error: 'Tracking failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[shares/track-view] Error:', error);
    // Don't fail the page load if tracking fails
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
