/**
 * API Route: Generate AI Image for Loadout
 * Feature: 048-ai-loadout-image-gen
 * POST /api/loadout-images/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAIImage, CloudinaryAIError } from '@/lib/cloudinary-ai';
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
  userId: z.string().uuid(),
  isRetry: z.boolean().optional(),
});

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validatedData = GenerateImageRequestSchema.parse(body);

    const {
      loadoutId,
      prompt,
      negativePrompt,
      stylePreferences,
      userId,
      isRetry = false,
    } = validatedData;

    console.log('[API] Generating AI image for loadout:', loadoutId, { isRetry });

    // Generate AI image via Cloudinary
    const cloudinaryResult = await generateAIImage({
      prompt,
      negativePrompt,
      aspectRatio: '16:9',
      qualityMode: 'hd',
    });

    // Generate alt-text from prompt
    const altText = `AI-generated outdoor scene: ${prompt.substring(0, 150)}`;

    // Save to database
    const savedImage = await insertGeneratedImage({
      loadoutId,
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url,
      promptUsed: prompt,
      stylePreferences: stylePreferences as StylePreferences || null,
      altText,
      userId,
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

    // Handle Cloudinary AI specific errors
    if (error instanceof CloudinaryAIError) {
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
