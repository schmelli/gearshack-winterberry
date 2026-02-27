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
import { visionScanLimiter } from '@/lib/rate-limit';
import { logError } from '@/lib/mastra/logging';
import { matchDetectedItemsWithCatalog } from '@/lib/vision-catalog-matcher';
import { resolveProductTypeId } from '@/lib/category-resolver';
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
// Sonnet default: better visual reasoning than Haiku for product identification.
// Override via AI_VISION_MODEL env var if needed (e.g. anthropic/claude-opus-4).
const VISION_MODEL = process.env.AI_VISION_MODEL || 'anthropic/claude-sonnet-4-5';
const VISION_TIMEOUT_MS = 60000; // 60 seconds

// =============================================================================
// Zod Schema for AI Output
// =============================================================================

const DetectedItemsSchema = z.object({
  /**
   * Chain-of-thought field: filled BEFORE detectedItems.
   * Forces the model to reason visually (colors, logos, labels, shape,
   * design details) before committing to a product name.
   * Not exposed to the client — stripped before the API response.
   */
  visualAnalysis: z.string().describe(
    'FIRST: describe every item in the image in detail — exact colors, visible logos/brand marks/text, material textures, shape, distinctive design features, any printed model numbers or labels. Be specific and thorough. This reasoning informs the product identification below.'
  ),
  detectedItems: z
    .array(
      z.object({
        name: z.string().max(200).describe('Exact product name and model/variant, inferred from your visual analysis above'),
        brand: z
          .string()
          .max(100)
          .nullable()
          .describe('Exact brand name from logos or labels, null if uncertain'),
        category: z
          .string()
          .max(100)
          .describe('Product category'),
        estimatedWeightGrams: z
          .number()
          .nullable()
          .describe('Weight in grams based on known product specs — null if uncertain (do NOT guess)'),
        condition: z
          .enum(['new', 'good', 'fair', 'poor'])
          .nullable()
          .describe('Condition from visible wear'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe('How confident are you in the product identification? 0=wild guess, 1=certain'),
      })
    )
    .max(30),
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

/** Module-level cache — survives across requests in the same serverless instance */
let categoryLabelsCache: string[] | null = null;

/**
 * Returns level-2 category labels from the DB (e.g. "Backpacks", "Tents", …).
 * Result is cached in module scope so the DB is only queried once per cold start.
 */
async function getCategoryLabels(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string[]> {
  if (categoryLabelsCache) return categoryLabelsCache;
  const { data } = await supabase
    .from('categories')
    .select('label')
    .eq('level', 2)
    .order('label', { ascending: true });
  categoryLabelsCache = (data ?? []).map((r) => r.label);
  return categoryLabelsCache;
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

    // 2. Rate limiting
    const rateLimitResult = visionScanLimiter.check(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, items: [], error: 'RATE_LIMITED' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 3. Check AI configuration (renumbered after rate limit insertion)
    if (!process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        { success: false, items: [], error: 'AI_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    // 4. Parse FormData
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { success: false, items: [], error: 'NO_IMAGE_PROVIDED' },
        { status: 400 }
      );
    }

    // 5. Validate size
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

    // 6. Read buffer once, validate magic bytes, then convert to base64
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

    // 7. Fetch category labels from DB (cached after first call)
    const categories = await getCategoryLabels(supabase);
    const categoryList = categories.length > 0
      ? categories.join(', ')
      : 'Backpacks, Tents, Sleeping Bags, Sleeping Pads, Jackets, Base Layers, Stoves, Cookware, Trekking Poles, Headlamps';

    // 8. AI Vision analysis with timeout
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
                text: `You are an expert outdoor gear identifier. Analyze this image carefully.

Step 1 — Visual analysis (visualAnalysis field): Describe every item you see in detail. Note exact colors, visible brand logos or text, material appearance, shape, construction details, any model numbers or labels on the product itself.

Step 2 — Identification (detectedItems): Based ONLY on what you described above, identify each item. Use the category list: ${categoryList}. Set confidence honestly — if you can only see "it's a Sea to Summit sleeping bag" but not which model, say so in the name and set confidence to 0.5. Do NOT guess weight — only fill estimatedWeightGrams if you know it from product specs. Return [] if no outdoor gear is visible.`,
              },
            ],
          },
        ],
        abortSignal: abortController.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Strip visualAnalysis (chain-of-thought helper) — not part of the public API
    const detectedItems = aiResult.object.detectedItems;

    if (detectedItems.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
      });
    }

    // 9. Match with catalog
    const matchedItems = await matchDetectedItemsWithCatalog(
      supabase,
      detectedItems
    );

    // 10. Resolve missing productTypeIds via category resolver.
    //     - catalogMatch with productTypeId → already good, skip
    //     - catalogMatch without productTypeId → enrich the match
    //     - no catalogMatch at all → attach resolvedProductTypeId to detected item
    const enrichedItems = await Promise.all(
      matchedItems.map(async (item) => {
        const existingTypeId = item.catalogMatch?.productTypeId ?? null;
        if (existingTypeId) return item;

        const resolvedTypeId = await resolveProductTypeId(
          supabase,
          item.detected.category,
          item.detected.name
        );
        if (!resolvedTypeId) return item;

        if (item.catalogMatch) {
          return {
            ...item,
            catalogMatch: { ...item.catalogMatch, productTypeId: resolvedTypeId },
          };
        }

        return {
          ...item,
          detected: { ...item.detected, resolvedProductTypeId: resolvedTypeId },
        };
      })
    );

    return NextResponse.json({
      success: true,
      items: enrichedItems,
    });
  } catch (error: unknown) {
    logError('[Vision] Scan failed', error instanceof Error ? error : undefined, {
      metadata: { model: VISION_MODEL },
    });

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
