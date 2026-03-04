/**
 * Text Extraction API Route
 *
 * Feature: 054-zero-friction-input
 *
 * POST /api/gear/extract-text
 * Extracts gear data from free-form text using AI (Haiku),
 * then matches against catalog and resolves category.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { fuzzyProductSearch } from '@/lib/supabase/catalog';
import { resolveProductTypeId } from '@/lib/category-resolver';
import { quickAddTextLimiter, QUICK_ADD_TEXT_LIMIT } from '@/lib/rate-limit';
import { logError, logWarn } from '@/lib/mastra/logging';
import { clampConfidence } from '@/types/quick-add';
import type { TextExtractResponse, QuickAddExtraction } from '@/types/quick-add';

// =============================================================================
// Configuration
// =============================================================================

const PARSE_MODEL = 'claude-haiku-4-5';
const MIN_CATALOG_MATCH_SCORE = 0.5;

// =============================================================================
// Zod schema for AI extraction
// =============================================================================

const TextExtractionSchema = z.object({
  name: z.string().max(200).nullable().describe('Product name and model'),
  brand: z.string().max(100).nullable().describe('Brand name'),
  category: z.string().max(100).nullable().describe('Gear category (e.g. Backpack, Tent, Trekking Poles, Sleeping Bag)'),
  weightGrams: z.number().positive().nullable().describe('Weight in grams (convert from kg/oz/lb if needed)'),
  condition: z.enum(['new', 'used', 'worn']).nullable().describe('Item condition'),
  pricePaid: z.number().positive().nullable().describe('Price paid'),
  currency: z.string().max(3).nullable().describe('Currency code (EUR, USD, GBP, CHF)'),
  description: z.string().max(500).nullable().describe('Brief description'),
});

// =============================================================================
// Confidence Calculation
// =============================================================================

function computeConfidence(
  extracted: z.infer<typeof TextExtractionSchema>,
  catalogMatchScore: number | null,
  categoryResolved: boolean,
): number {
  let score = 0;
  if (extracted.name) score += 0.30;
  if (extracted.brand) score += 0.15;
  if (extracted.weightGrams) score += 0.15;
  if (catalogMatchScore !== null && catalogMatchScore >= MIN_CATALOG_MATCH_SCORE) score += 0.15;
  if (categoryResolved) score += 0.10;
  if (extracted.pricePaid) score += 0.15;
  return clampConfidence(score);
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<TextExtractResponse>(
        { success: false, error: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Check AI configuration (accept either direct key or gateway key)
    if (!process.env.ANTHROPIC_API_KEY && !process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json<TextExtractResponse>(
        { success: false, error: 'AI_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    // Parse and validate request body with Zod (before rate limit to avoid burning tokens on invalid input)
    const BodySchema = z.object({
      text: z.string().min(2, 'Text input is required (minimum 2 characters)').max(500),
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<TextExtractResponse>(
        { success: false, error: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<TextExtractResponse>(
        { success: false, error: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const trimmedText = parsed.data.text.trim();

    // Rate limit check (after validation so invalid requests don't burn tokens)
    const rateLimit = quickAddTextLimiter.check(user.id);
    const rateLimitHeaders = {
      'X-RateLimit-Limit': String(QUICK_ADD_TEXT_LIMIT),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
    };

    if (!rateLimit.allowed) {
      return NextResponse.json<TextExtractResponse>(
        { success: false, error: 'RATE_LIMITED' },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: AI Extraction (Haiku – fast & cheap)
    // ─────────────────────────────────────────────────────────────────────────
    const aiAbort = new AbortController();
    const aiTimeout = setTimeout(() => aiAbort.abort(), 30_000);

    let extracted: z.infer<typeof TextExtractionSchema>;
    try {
      const { object } = await generateObject({
        model: anthropic(PARSE_MODEL),
        schema: TextExtractionSchema,
        system: `Extract outdoor gear item details from user input. The user may write in English or German.
Return null for any field you cannot determine with confidence.
Convert weight to grams if given in other units (1 kg = 1000g, 1 oz = 28.35g, 1 lb = 453.6g).`,
        messages: [
          { role: 'user', content: trimmedText },
        ],
        abortSignal: aiAbort.signal,
      });
      extracted = object;
    } catch (aiError) {
      if (aiError instanceof Error && aiError.name === 'AbortError') {
        throw aiError;
      }
      logError('[ExtractText] AI extraction failed', aiError instanceof Error ? aiError : undefined, {
        metadata: { model: PARSE_MODEL },
      });
      return NextResponse.json<TextExtractResponse>(
        { success: false, error: 'EXTRACTION_FAILED' },
        { status: 500 }
      );
    } finally {
      clearTimeout(aiTimeout);
    }

    // Bail early if no name extracted
    if (!extracted.name) {
      return NextResponse.json<TextExtractResponse>(
        {
          success: true,
          data: {
            inputType: 'text',
            confidence: 0,
            name: null,
            brand: extracted.brand,
            description: extracted.description,
            productTypeId: null,
            categoryLabel: extracted.category,
            weightGrams: extracted.weightGrams,
            condition: extracted.condition,
            primaryImageUrl: null,
            productUrl: null,
            pricePaid: extracted.pricePaid,
            currency: extracted.currency,
          },
        },
        { headers: rateLimitHeaders }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2: Catalog Matching (fuzzy search)
    // ─────────────────────────────────────────────────────────────────────────
    const searchQuery = [extracted.brand, extracted.name]
      .filter(Boolean)
      .join(' ');

    let catalogMatchScore: number | null = null;
    let productTypeId: string | null = null;

    if (searchQuery) {
      try {
        const catalogResults = await fuzzyProductSearch(supabase, searchQuery, {
          limit: 3,
        });

        if (catalogResults.length > 0) {
          const bestMatch = catalogResults[0];
          catalogMatchScore = bestMatch.score;

          if (bestMatch.score >= MIN_CATALOG_MATCH_SCORE) {
            productTypeId = bestMatch.productTypeId ?? null;
          }
        }
      } catch (catalogError) {
        logWarn('[ExtractText] Catalog search failed', { metadata: { error: String(catalogError) } });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3: Category Resolution (fallback if no catalog match)
    // ─────────────────────────────────────────────────────────────────────────
    if (!productTypeId && extracted.category && extracted.name) {
      try {
        productTypeId = await resolveProductTypeId(
          supabase,
          extracted.category,
          extracted.name
        );
      } catch (resolveError) {
        logWarn('[ExtractText] Category resolution failed', { metadata: { error: String(resolveError) } });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 4: Build response
    // ─────────────────────────────────────────────────────────────────────────
    const confidence = computeConfidence(
      extracted,
      catalogMatchScore,
      productTypeId !== null,
    );

    const result: QuickAddExtraction = {
      inputType: 'text',
      confidence,
      name: extracted.name,
      brand: extracted.brand,
      description: extracted.description,
      productTypeId,
      categoryLabel: extracted.category,
      weightGrams: extracted.weightGrams,
      condition: extracted.condition,
      primaryImageUrl: null,
      productUrl: null,
      pricePaid: extracted.pricePaid,
      currency: extracted.currency,
    };

    return NextResponse.json<TextExtractResponse>(
      { success: true, data: result },
      { headers: rateLimitHeaders }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json<TextExtractResponse>(
        { success: false, error: 'EXTRACTION_TIMEOUT' },
        { status: 504 }
      );
    }

    logError('[ExtractText] Unexpected error', error instanceof Error ? error : undefined, {
      metadata: { model: PARSE_MODEL },
    });
    return NextResponse.json<TextExtractResponse>(
      { success: false, error: 'EXTRACTION_FAILED' },
      { status: 500 }
    );
  }
}
