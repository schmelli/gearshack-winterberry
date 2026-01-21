/**
 * URL Import API Route
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * POST /api/gear/import-url
 * Extracts product data from URL and checks GearGraph catalog for matches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fuzzyProductSearch } from '@/lib/supabase/catalog';
import { extractProductDataFromUrl } from '@/app/actions/smart-product-search';
import type { ImportUrlResponse, CatalogMatchResult } from '@/types/contributions';

// =============================================================================
// Configuration
// =============================================================================

/** Minimum score to consider a catalog match valid */
const MIN_MATCH_SCORE = 0.3;

/** Maximum matches to return */
const MAX_MATCHES = 3;

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ImportUrlResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json<ImportUrlResponse>(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json<ImportUrlResponse>(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Extract product data from URL
    const extractionResult = await extractProductDataFromUrl(url);

    if (extractionResult.error || !extractionResult.data) {
      return NextResponse.json<ImportUrlResponse>(
        {
          success: false,
          error: extractionResult.error || 'Could not extract data from URL',
        },
        { status: 422 }
      );
    }

    const extracted = extractionResult.data;

    // Build search query for catalog matching
    const searchQuery = buildSearchQuery(extracted.name, extracted.brand);

    // Search GearGraph catalog for matches
    let catalogMatch: CatalogMatchResult | null = null;

    if (searchQuery) {
      try {
        const catalogResults = await fuzzyProductSearch(supabase, searchQuery, {
          limit: MAX_MATCHES,
        });

        // Find best match above threshold
        const bestMatch = catalogResults.find((r) => r.score >= MIN_MATCH_SCORE);

        if (bestMatch) {
          catalogMatch = {
            id: bestMatch.id,
            name: bestMatch.name,
            brand: bestMatch.brand?.name ?? null,
            categoryMain: bestMatch.categoryMain,
            subcategory: bestMatch.subcategory,
            productType: bestMatch.productType,
            productTypeId: bestMatch.productTypeId,
            description: bestMatch.description,
            weightGrams: bestMatch.weightGrams,
            priceUsd: bestMatch.priceUsd,
            matchScore: bestMatch.score,
          };
        }
      } catch (catalogError) {
        // Log but don't fail - catalog matching is optional
        console.error('[ImportUrl] Catalog search failed:', catalogError);
      }
    }

    // Return combined result
    return NextResponse.json<ImportUrlResponse>({
      success: true,
      data: {
        name: extracted.name,
        brand: extracted.brand,
        description: extracted.description,
        imageUrl: extracted.imageUrl,
        weightGrams: extracted.weightGrams,
        weightUnit: extracted.weightUnit,
        priceValue: extracted.priceValue,
        currency: extracted.currency,
        productUrl: extracted.productUrl,
        extractionConfidence: extracted.confidence,
        extractionMethod: extracted.extractionMethod,
        catalogMatch,
      },
    });
  } catch (error) {
    console.error('[ImportUrl] Error:', error);
    return NextResponse.json<ImportUrlResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build search query from extracted name and brand
 */
function buildSearchQuery(
  name: string | null,
  brand: string | null
): string | null {
  const parts: string[] = [];

  if (brand) {
    parts.push(brand);
  }

  if (name) {
    // Remove brand from name if it's already there to avoid duplication
    let cleanName = name;
    if (brand) {
      const brandLower = brand.toLowerCase();
      const nameLower = name.toLowerCase();
      if (nameLower.startsWith(brandLower)) {
        cleanName = name.slice(brand.length).trim();
      }
    }
    if (cleanName) {
      parts.push(cleanName);
    }
  }

  return parts.length > 0 ? parts.join(' ') : null;
}
