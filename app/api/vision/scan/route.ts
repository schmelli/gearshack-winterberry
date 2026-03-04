/**
 * Vision Scan API Route — Two-Phase Web-Search Identification
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Phase 1: generateText with claude-sonnet-4-5 + web_search tool
 *   → Claude visually analyzes the image AND searches the web for exact product data
 * Phase 2: generateObject with claude-haiku (cheap) parses Phase 1 text into Zod schema
 *
 * POST /api/vision/scan
 * - Auth required
 * - FormData with 'image' field (max 10MB, JPEG/PNG/WebP)
 * - Returns detected items with catalog matches
 *
 * Prerequisites:
 *   - ANTHROPIC_API_KEY in environment
 *   - Web search enabled in Anthropic Console → Settings → Privacy
 */

import { NextResponse } from 'next/server';
import { generateText, generateObject, stepCountIs } from 'ai';
import type { ToolSet } from 'ai';
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { visionScanLimiter } from '@/lib/rate-limit';
import { logError, logWarn } from '@/lib/mastra/logging';
import { anthropic, isAIConfigured } from '@/lib/ai/anthropic';
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

/**
 * Phase 1: Sonnet for vision + web search (needs strong reasoning).
 * Strip "anthropic/" prefix if env var uses the Gateway format.
 */
const VISION_SEARCH_MODEL = (process.env.AI_VISION_MODEL ?? 'claude-sonnet-4-5')
  .replace(/^anthropic\//, '');

/** Phase 2: Haiku for cheap structured-output parsing of Phase 1 research text */
const PARSE_MODEL = 'claude-haiku-4-5';

/**
 * Combined timeout for both phases.
 * Web search: ~30-45s, Parse: ~5-10s → 90s total.
 */
const VISION_TIMEOUT_MS = 90_000;

// =============================================================================
// Zod Schema for Phase 2 (structured parsing)
// =============================================================================

/**
 * No visualAnalysis field needed here — chain-of-thought reasoning happens
 * naturally in Phase 1 through the web search tool steps.
 */
const DetectedItemsSchema = z.object({
  detectedItems: z
    .array(
      z.object({
        name: z.string().max(200).describe('Exact product name and model/variant from web search research'),
        brand: z
          .string()
          .max(100)
          .nullable()
          .describe('Exact brand name, null if not found in research'),
        category: z
          .string()
          .max(100)
          .describe('Product category from the available list'),
        estimatedWeightGrams: z
          .number()
          .nullable()
          .describe('Weight in grams from manufacturer specs — null if not found in research'),
        condition: z
          .enum(['new', 'good', 'fair', 'poor'])
          .nullable()
          .describe('Condition inferred from visible wear in the image'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe('0.9+ if exact model verified by web search, 0.5 if only brand/type known, 0.3 if guessing'),
      })
    )
    .max(30),
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Module-level cache with TTL — survives across requests in the same serverless instance.
 * Category labels are mostly static (admin-managed), so a 15-minute TTL balances freshness
 * with DB load. A cold start always re-fetches from the DB.
 */
const CATEGORY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let categoryLabelsCache: { labels: string[]; cachedAt: number } | null = null;

/**
 * Returns level-2 category labels from the DB (e.g. "Backpacks", "Tents", …).
 * Result is cached in module scope with a 15-minute TTL.
 */
async function getCategoryLabels(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string[]> {
  const now = Date.now();
  if (categoryLabelsCache && (now - categoryLabelsCache.cachedAt) < CATEGORY_CACHE_TTL_MS) {
    return categoryLabelsCache.labels;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('label')
    .eq('level', 2)
    .order('label', { ascending: true });
  if (error) {
    logWarn('[Vision] Failed to fetch category labels, skipping cache', {
      metadata: { error: error.message },
    });
    // On error, return stale cache if available, otherwise empty
    return categoryLabelsCache?.labels ?? [];
  }
  const labels = (data ?? []).map((r) => r.label);
  categoryLabelsCache = { labels, cachedAt: now };
  return labels;
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

    // 3. Check AI configuration (accept either direct key or gateway key)
    if (!isAIConfigured()) {
      return NextResponse.json(
        { success: false, items: [], error: 'AI_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    // 4. Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formDataError) {
      logWarn('[Vision] Failed to parse FormData', {
        metadata: { error: String(formDataError) },
      });
      return NextResponse.json(
        { success: false, items: [], error: 'INVALID_UPLOAD' },
        { status: 400 }
      );
    }
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
        { success: false, items: [], error: 'IMAGE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // 6. Read buffer once, validate magic bytes, convert to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const detectedType = await fileTypeFromBuffer(arrayBuffer);

    if (!detectedType || !ALLOWED_MAGIC_MIMES.has(detectedType.mime)) {
      return NextResponse.json(
        { success: false, items: [], error: 'INVALID_IMAGE_TYPE' },
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

    // 8. Two-phase AI identification with shared timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      VISION_TIMEOUT_MS
    );

    let detectedItems: z.infer<typeof DetectedItemsSchema>['detectedItems'];
    try {
      // -----------------------------------------------------------------------
      // Phase 1 — Vision + Web Search
      // Claude analyzes the image visually, then searches the web for the exact
      // product name, model, weight, and price. Up to 5 search steps allowed.
      // -----------------------------------------------------------------------
      let researchText: string;
      try {
        const phase1Result = await generateText({
          model: anthropic(VISION_SEARCH_MODEL),
          // TODO: Remove cast when @ai-sdk/anthropic >=1.2.0 exports compatible types for provider tools
          tools: {
            web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
          } as unknown as ToolSet,
          stopWhen: stepCountIs(5),
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
                  text: `You are an expert outdoor gear specialist. Identify every item in this image:

Step 1 — Visual analysis: Describe ALL visible branding, logos, text, model numbers, colors, materials, and distinctive design details on each item.

Step 2 — Web search identification: For each item, search the web to find the EXACT product:
- Search for "[brand] [visible product name] [distinctive detail] outdoor gear specifications"
- Find the manufacturer's official product page for the exact model name, variant, and weight
- Note the manufacturer's suggested retail price (EUR preferred, USD also OK)

Provide complete identification for each item you find. Available categories: ${categoryList}.`,
                },
              ],
            },
          ],
          abortSignal: abortController.signal,
        });
        researchText = phase1Result.text;
      } catch (phase1Error) {
        // Re-throw AbortError so the outer handler can respond with 504
        if (phase1Error instanceof Error && phase1Error.name === 'AbortError') {
          throw phase1Error;
        }
        logError('[Vision] Phase 1 (vision+search) failed', phase1Error instanceof Error ? phase1Error : undefined, {
          metadata: { model: VISION_SEARCH_MODEL },
        });
        return NextResponse.json(
          { success: false, items: [], error: 'SCAN_FAILED' },
          { status: 500 }
        );
      }

      // Guard: if Phase 1 returned empty/very short text, skip Phase 2
      if (!researchText || researchText.trim().length < 20) {
        logWarn('[Vision] Phase 1 returned empty or very short research text', {
          metadata: { researchTextLength: researchText?.length ?? 0 },
        });
        return NextResponse.json({ success: true, items: [] });
      }

      // -----------------------------------------------------------------------
      // Phase 2 — Structured Parsing
      // Haiku extracts the structured data from Phase 1's research text.
      // Much cheaper than running Sonnet twice.
      // -----------------------------------------------------------------------
      try {
        const aiResult = await generateObject({
          model: anthropic(PARSE_MODEL),
          schema: DetectedItemsSchema,
          prompt: `Extract structured outdoor gear item data from this identification research.

Rules:
- confidence: 0.9+ if exact model verified by web search, 0.5 if brand/type only, 0.3 if guessing
- estimatedWeightGrams: only if explicitly stated in the research (in grams)
- category: must be one of: ${categoryList}
- Return [] if no outdoor gear was identified

Research:
${researchText}`,
          abortSignal: abortController.signal,
        });
        detectedItems = aiResult.object.detectedItems;
      } catch (phase2Error) {
        if (phase2Error instanceof Error && phase2Error.name === 'AbortError') {
          throw phase2Error;
        }
        logError('[Vision] Phase 2 (structured parsing) failed', phase2Error instanceof Error ? phase2Error : undefined, {
          metadata: { model: PARSE_MODEL, researchTextLength: researchText.length },
        });
        return NextResponse.json(
          { success: false, items: [], error: 'PARSE_FAILED' },
          { status: 500 }
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (detectedItems.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
      });
    }

    // 9. Match with catalog (graceful degradation if catalog search fails)
    let matchedItems: Awaited<ReturnType<typeof matchDetectedItemsWithCatalog>>;
    try {
      matchedItems = await matchDetectedItemsWithCatalog(
        supabase,
        detectedItems
      );
    } catch (catalogError) {
      logWarn('[Vision] Catalog matching failed, returning detected items without matches', {
        metadata: { error: String(catalogError), itemCount: detectedItems.length },
      });
      matchedItems = detectedItems.map((d) => ({
        detected: d,
        catalogMatch: null,
        alternatives: [],
      }));
    }

    // 10. Resolve missing productTypeIds via category resolver.
    //     - catalogMatch with productTypeId → already good, skip
    //     - catalogMatch without productTypeId → enrich the match
    //     - no catalogMatch at all → attach resolvedProductTypeId to detected item
    const enrichedItems = await Promise.all(
      matchedItems.map(async (item) => {
        const existingTypeId = item.catalogMatch?.productTypeId ?? null;
        if (existingTypeId) return item;

        try {
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
        } catch (resolveError) {
          logWarn('[Vision] Category resolution failed for item', {
            metadata: { itemName: item.detected.name, error: String(resolveError) },
          });
          return item;
        }
      })
    );

    return NextResponse.json({
      success: true,
      items: enrichedItems,
    });
  } catch (error: unknown) {
    // Check AbortError first to avoid noisy Sentry reports for expected timeouts
    if (error instanceof Error && error.name === 'AbortError') {
      logWarn('[Vision] Scan timed out', {
        metadata: { model: VISION_SEARCH_MODEL, timeoutMs: VISION_TIMEOUT_MS },
      });
      return NextResponse.json(
        { success: false, items: [], error: 'VISION_TIMEOUT' },
        { status: 504 }
      );
    }

    logError('[Vision] Scan failed', error instanceof Error ? error : undefined, {
      metadata: { model: VISION_SEARCH_MODEL },
    });

    return NextResponse.json(
      { success: false, items: [], error: 'SCAN_FAILED' },
      { status: 500 }
    );
  }
}
