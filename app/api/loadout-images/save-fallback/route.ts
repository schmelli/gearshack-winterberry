/**
 * API Route: Save Fallback Image for Loadout
 * Feature: 048-ai-loadout-image-gen
 * POST /api/loadout-images/save-fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { insertGeneratedImage } from '@/lib/supabase/loadout-images';

const SaveFallbackRequestSchema = z.object({
  loadoutId: z.string().uuid(),
  fallbackImageUrl: z.string().url(),
  fallbackImageId: z.string(),
  altText: z.string(),
  userId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SaveFallbackRequestSchema.parse(body);

    const { loadoutId, fallbackImageUrl, fallbackImageId, altText, userId } =
      validatedData;

    console.log('[API] Saving fallback image for loadout:', loadoutId);

    // Save fallback image to database
    // Use fallbackImageId as cloudinary_public_id for tracking
    const savedImage = await insertGeneratedImage({
      loadoutId,
      cloudinaryPublicId: `fallback/${fallbackImageId}`,
      cloudinaryUrl: fallbackImageUrl,
      promptUsed: `[FALLBACK] ${altText}`,
      stylePreferences: null,
      altText,
      userId,
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
