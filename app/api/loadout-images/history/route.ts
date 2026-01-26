/**
 * API Route: Get Image Generation History for Loadout
 * Feature: 048-ai-loadout-image-gen
 * GET /api/loadout-images/history?loadoutId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getImageHistory } from '@/lib/supabase/loadout-images';

// Schema to validate loadoutId as UUID
const queryParamsSchema = z.object({
  loadoutId: z.string().uuid('Invalid UUID format for loadoutId'),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawLoadoutId = searchParams.get('loadoutId');

    // Validate loadoutId as UUID
    const parseResult = queryParamsSchema.safeParse({ loadoutId: rawLoadoutId });
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { loadoutId } = parseResult.data;

    // Verify loadout ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loadouts table not in generated types
    const { data: loadout, error: loadoutError } = await (supabase as any)
      .from('loadouts')
      .select('user_id')
      .eq('id', loadoutId)
      .single();

    if (loadoutError || !loadout) {
      return NextResponse.json({ error: 'Loadout not found' }, { status: 404 });
    }

    if (loadout.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
