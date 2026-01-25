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
  // SECURITY: Validate URL to prevent XSS via javascript:/data: schemes
  // Allow relative paths starting with / or HTTPS Cloudinary URLs only
  fallbackImageUrl: z.string().min(1).refine(
    (url) => url.startsWith('/') || (url.startsWith('https://') && url.includes('res.cloudinary.com')),
    { message: 'URL must be a relative path or HTTPS Cloudinary URL' }
  ),
  fallbackImageId: z.string(),
  // SECURITY: Add length limit to prevent UI/DB issues
  altText: z.string().min(1).max(200),
  // userId is sent by client but not used (we get it from auth)
  userId: z.string().optional(),
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
    const validatedData = SaveFallbackRequestSchema.parse(body);

    const { loadoutId, fallbackImageUrl, fallbackImageId, altText } = validatedData;

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

    console.log('[API] Saving fallback image for loadout:', loadoutId);

    // Save fallback image to database
    // Include loadoutId and timestamp in cloudinary_public_id to ensure uniqueness
    // (cloudinary_public_id has UNIQUE constraint in database)
    const timestamp = Date.now();
    const savedImage = await insertGeneratedImage({
      loadoutId,
      cloudinaryPublicId: `fallback/${loadoutId}/${fallbackImageId}-${timestamp}`,
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
      { error: 'Failed to save fallback' },
      { status: 500 }
    );
  }
}
