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
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { matchDetectedItemsWithCatalog } from '@/lib/vision-catalog-matcher';
import type { VisionScanResponse } from '@/types/vision-scan';

// =============================================================================
// Configuration
// =============================================================================

/** MIME types accepted after magic-bytes validation */
const ALLOWED_MAGIC_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
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
        { success: false, items: [], error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Check AI configuration
    if (!process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        { success: false, items: [], error: 'AI_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    // 3. Parse FormData
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { success: false, items: [], error: 'NO_IMAGE_PROVIDED' },
        { status: 400 }
      );
    }

    // 4. Validate size
    if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          items: [],
          error: 'IMAGE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // 5. Read buffer once, validate magic bytes, then convert to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const detectedType = await fileTypeFromBuffer(arrayBuffer);

    if (!detectedType || !ALLOWED_MAGIC_MIMES.has(detectedType.mime)) {
      return NextResponse.json(
        {
          success: false,
          items: [],
          error: 'INVALID_IMAGE_TYPE',
        },
        { status: 400 }
      );
    }

    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    const imageMime = detectedType.mime;

    // 6. AI Vision analysis with timeout
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
                image: `data:${imageMime};base64,${imageBase64}`,
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

    if (detectedItems.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
      });
    }

    // 7. Match with catalog
    const matchedItems = await matchDetectedItemsWithCatalog(
      supabase,
      detectedItems
    );

    return NextResponse.json({
      success: true,
      items: matchedItems,
    });
  } catch (error: unknown) {
    console.error('[Vision] Scan failed:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, items: [], error: 'VISION_TIMEOUT' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { success: false, items: [], error: 'SCAN_FAILED' },
      { status: 500 }
    );
  }
}
