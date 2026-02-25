/**
 * Vision Scan API Route
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Accepts an image (via FormData) and uses AI vision to detect outdoor gear items.
 * Detected items are then matched against the product catalog via fuzzy search.
 *
 * POST /api/vision/scan
 * - Auth required
 * - FormData with 'image' field (max 10MB, JPEG/PNG/WebP)
 * - Returns detected items with catalog matches
 */

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { matchDetectedItemsWithCatalog } from '@/lib/vision-catalog-matcher';
import type { VisionScanResponse } from '@/types/vision-scan';

// =============================================================================
// Configuration
// =============================================================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const VISION_MODEL = process.env.AI_VISION_MODEL || 'anthropic/claude-sonnet-4-5';
const VISION_TIMEOUT_MS = 60000; // 60 seconds

// =============================================================================
// Zod Schema for AI Output
// =============================================================================

const DetectedItemsSchema = z.object({
  detectedItems: z.array(
    z.object({
      name: z.string().describe('Product name of the gear item'),
      brand: z
        .string()
        .nullable()
        .describe('Brand name if recognizable from logo or design'),
      category: z
        .string()
        .describe(
          'Category like Backpack, Tent, Sleeping Bag, Jacket, Stove, etc.'
        ),
      estimatedWeightGrams: z
        .number()
        .nullable()
        .describe('Estimated weight in grams if recognizable'),
      condition: z
        .enum(['new', 'good', 'fair', 'poor'])
        .nullable()
        .describe('Estimated condition based on visible wear'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence score from 0 to 1'),
    })
  ),
});

// =============================================================================
// Helpers
// =============================================================================

function getGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY is required for vision analysis');
  }
  return createGateway({ apiKey });
}

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: Request): Promise<NextResponse<VisionScanResponse>> {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, items: [], error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check AI configuration
    if (!process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        { success: false, items: [], error: 'AI vision is not configured' },
        { status: 503 }
      );
    }

    // 3. Parse FormData
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { success: false, items: [], error: 'No image provided' },
        { status: 400 }
      );
    }

    // 4. Validate image
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        {
          success: false,
          items: [],
          error: `Invalid image type: ${imageFile.type}. Allowed: JPEG, PNG, WebP`,
        },
        { status: 400 }
      );
    }

    if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          items: [],
          error: 'Image too large. Maximum size is 10MB.',
        },
        { status: 400 }
      );
    }

    // 5. Convert to base64
    const imageBase64 = await fileToBase64(imageFile);

    // 6. AI Vision analysis with timeout
    console.log('[Vision] Analyzing image for gear items...');
    const gateway = getGateway();

    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      VISION_TIMEOUT_MS
    );

    let aiResult;
    try {
      aiResult = await generateObject({
        model: gateway(VISION_MODEL),
        schema: DetectedItemsSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image: `data:${imageFile.type};base64,${imageBase64}`,
              },
              {
                type: 'text',
                text: 'Identify all outdoor gear items visible in this image. For each item, provide the brand (if recognizable from logos, labels, or distinctive design), product name, category (e.g., Backpack, Tent, Sleeping Bag, Jacket, Stove, Trekking Poles, etc.), estimated weight in grams (if you can reasonably estimate), and condition based on visible wear. Be thorough — detect every distinct gear item you can see. If you cannot identify a specific brand, set brand to null. Return an empty array if no outdoor gear is visible.',
              },
            ],
          },
        ],
        abortSignal: abortController.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const detectedItems = aiResult.object.detectedItems;
    console.log(`[Vision] Detected ${detectedItems.length} gear items`);

    if (detectedItems.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
      });
    }

    // 7. Match with catalog
    console.log('[Vision] Matching detected items with catalog...');
    const matchedItems = await matchDetectedItemsWithCatalog(
      supabase,
      detectedItems
    );

    console.log(
      `[Vision] Matched ${matchedItems.filter((m) => m.catalogMatch).length}/${matchedItems.length} items with catalog`
    );

    return NextResponse.json({
      success: true,
      items: matchedItems,
    });
  } catch (error: unknown) {
    console.error('[Vision] Scan failed:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, items: [], error: 'Vision analysis timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        items: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to analyze image',
      },
      { status: 500 }
    );
  }
}
