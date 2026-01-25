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
import { extractPublicId } from '@/lib/cloudinary-utils';
import { checkRateLimit } from '@/lib/rate-limit';
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

    // Check rate limit (5 generations per hour per user)
    const rateLimitResult = checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: 429,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Parse request body with safeParse for proper error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const parseResult = GenerateImageRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      loadoutId,
      prompt,
      negativePrompt,
      stylePreferences,
      isRetry = false,
    } = parseResult.data;

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

    console.log('[API] Generating AI image for loadout:', loadoutId, { isRetry, userId: user.id });

    // Generate AI image via Vercel AI SDK
    const aiResult = await generateAIImage({
      prompt,
      negativePrompt,
      aspectRatio: '16:9',
      qualityMode: 'hd',
    });

    // Extract public_id from Cloudinary URL for database storage
    const publicId = extractPublicId(aiResult.url, 'gearshack');

    // Generate alt-text from prompt
    const altText = `AI-generated outdoor scene: ${prompt.substring(0, 150)}`;

    // Save to database
    const savedImage = await insertGeneratedImage({
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
      {
        status: 200,
        headers: rateLimitResult.headers,
      }
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

    // Generic error - don't expose internal error details to clients
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
