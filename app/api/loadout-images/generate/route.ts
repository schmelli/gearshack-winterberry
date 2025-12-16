/**
 * API Route: Generate AI Image for Loadout
 * Feature: 048-ai-loadout-image-gen
 * POST /api/loadout-images/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateAIImage, AIGenerationError } from '@/lib/vercel-ai';
import { insertGeneratedImage } from '@/lib/supabase/loadout-images';
import type { StylePreferences } from '@/types/loadout-image';

// =============================================================================
// Request Schema
// =============================================================================

const GenerateImageRequestSchema = z.object({
  loadoutId: z.string().uuid(),
  prompt: z.string().min(10).max(1000),
  negativePrompt: z.string().optional(),
  stylePreferences: z
    .object({
      template: z.enum(['cinematic', 'documentary', 'magazine', 'instagram']).optional(),
      timeOfDay: z.enum(['golden_hour', 'blue_hour', 'midday', 'dawn', 'dusk']).optional(),
      atmosphere: z.string().max(50).optional(),
    })
    .optional(),
  isRetry: z.boolean().optional(),
});

// =============================================================================
// POST Handler
// =============================================================================

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

    // Parse request body
    const body = await request.json();
    const validatedData = GenerateImageRequestSchema.parse(body);

    const {
      loadoutId,
      prompt,
      negativePrompt,
      stylePreferences,
      isRetry = false,
    } = validatedData;

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

    console.log('[API] Generating AI image for loadout:', loadoutId, { isRetry, userId: user.id });

    // Generate AI image via Vercel AI SDK
    const aiResult = await generateAIImage({
      prompt,
      negativePrompt,
      aspectRatio: '16:9',
      qualityMode: 'hd',
    });

    // Extract public_id from Cloudinary URL for database storage
    // URL format: https://res.cloudinary.com/cloud/image/upload/v1/folder/file.jpg
    const urlParts = aiResult.url.split('/');
    const gearshackIndex = urlParts.indexOf('gearshack');

    if (gearshackIndex === -1) {
      console.error('[API] Invalid Cloudinary URL format:', aiResult.url);
      throw new Error('Invalid Cloudinary URL format: missing gearshack folder');
    }

    const publicIdWithExt = urlParts.slice(gearshackIndex).join('/');
    const publicId = publicIdWithExt.replace(/\.[^.]+$/, ''); // Remove last extension only

    // Generate alt-text from prompt
    const altText = `AI-generated outdoor scene: ${prompt.substring(0, 150)}`;

    // Save to database
    const savedImage = await insertGeneratedImage(supabase, {
      loadoutId,
      cloudinaryPublicId: publicId,
      cloudinaryUrl: aiResult.url,
      promptUsed: prompt,
      stylePreferences: stylePreferences as StylePreferences || null,
      altText,
      userId: user.id,
    });

    console.log('[API] Image generated and saved:', savedImage.id);

    return NextResponse.json(
      {
        success: true,
        imageId: savedImage.id,
        image: savedImage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Image generation failed:', error);

    // Handle AI generation specific errors
    if (error instanceof AIGenerationError) {
      return NextResponse.json(
        {
          error: error.message,
          retryable: error.isRetryable,
        },
        { status: error.code }
      );
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate image',
      },
      { status: 500 }
    );
  }
}
