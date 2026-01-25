/**
 * API Route: Set Active Image for Loadout
 * Feature: 048-ai-loadout-image-gen
 * POST /api/loadout-images/set-active
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { setActiveImage } from '@/lib/supabase/loadout-images';

const SetActiveRequestSchema = z.object({
  imageId: z.string().uuid(),
  loadoutId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body with proper error handling for malformed JSON
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const validatedData = SetActiveRequestSchema.parse(body);

    const { imageId, loadoutId } = validatedData;

    // Verify loadout ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loadouts table not in generated types
    const { data: loadout, error: loadoutError } = await (supabase as any)
      .from('loadouts')
      .select('user_id')
      .eq('id', loadoutId)
      .single();

    if (loadoutError || !loadout) {
      return NextResponse.json(
        { error: 'Loadout not found' },
        { status: 404 }
      );
    }

    if (loadout.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('[API] Setting active image:', imageId, 'for loadout:', loadoutId);

    await setActiveImage(imageId, loadoutId, user.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Active image updated',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Set active failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to set active image' },
      { status: 500 }
    );
  }
}
