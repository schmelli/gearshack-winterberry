/**
 * API Route: Save Fallback Image for Loadout
 * Feature: 048-ai-loadout-image-gen
 * POST /api/loadout-images/save-fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { insertGeneratedImage } from '@/lib/supabase/loadout-images';

const SaveFallbackRequestSchema = z.object({
  loadoutId: z.string().uuid(),
  fallbackImageUrl: z.string().url(),
  fallbackImageId: z.string(),
  altText: z.string(),
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

    const body = await request.json();
    const validatedData = SaveFallbackRequestSchema.parse(body);

    const { loadoutId, fallbackImageUrl, fallbackImageId, altText } = validatedData;

    // Verify loadout ownership
    const { data: loadout, error: loadoutError } = await supabase
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

    console.log('[API] Saving fallback image for loadout:', loadoutId);

    // Save fallback image to database
    // Use fallbackImageId as cloudinary_public_id for tracking
    const savedImage = await insertGeneratedImage(supabase, {
      loadoutId,
      cloudinaryPublicId: `fallback/${fallbackImageId}`,
      cloudinaryUrl: fallbackImageUrl,
      promptUsed: `[FALLBACK] ${altText}`,
      stylePreferences: null,
      altText,
      userId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        imageId: savedImage.id,
        image: savedImage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Save fallback failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save fallback' },
      { status: 500 }
    );
  }
}
