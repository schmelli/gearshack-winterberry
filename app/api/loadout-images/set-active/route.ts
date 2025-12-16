/**
 * API Route: Set Active Image for Loadout
 * Feature: 048-ai-loadout-image-gen
 * POST /api/loadout-images/set-active
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setActiveImage } from '@/lib/supabase/loadout-images';

const SetActiveRequestSchema = z.object({
  imageId: z.string().uuid(),
  loadoutId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SetActiveRequestSchema.parse(body);

    const { imageId, loadoutId } = validatedData;

    console.log('[API] Setting active image:', imageId, 'for loadout:', loadoutId);

    await setActiveImage(imageId, loadoutId);

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
      { error: error instanceof Error ? error.message : 'Failed to set active image' },
      { status: 500 }
    );
  }
}
