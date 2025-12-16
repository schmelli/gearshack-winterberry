/**
 * API Route: Get Image Generation History for Loadout
 * Feature: 048-ai-loadout-image-gen
 * GET /api/loadout-images/history?loadoutId=xxx&userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getImageHistory } from '@/lib/supabase/loadout-images';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loadoutId = searchParams.get('loadoutId');
    const userId = searchParams.get('userId');

    if (!loadoutId) {
      return NextResponse.json(
        { error: 'Missing loadoutId parameter' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    console.log('[API] Fetching image history for loadout:', loadoutId);

    const images = await getImageHistory(loadoutId);

    return NextResponse.json(
      {
        success: true,
        images,
        count: images.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Get history failed:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
