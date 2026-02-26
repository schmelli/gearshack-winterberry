/**
 * URL Import API Route
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * POST /api/gear/import-url
 * Extracts product data from URL using Firecrawl (primary) or pattern extraction (fallback),
 * checks GearGraph catalog for matches, and suggests categories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fuzzyProductSearch } from '@/lib/supabase/catalog';
import { extractProductDataFromUrl } from '@/app/actions/smart-product-search';
import { createFirecrawlClient, SSRFError, TimeoutError, FirecrawlError } from '@/lib/firecrawl/client';
import { extractGearSpecs, type GearSpecs } from '@/lib/firecrawl/gear-specs';
import { suggestCategory, buildCategoryPath } from '@/lib/category-suggestion';
import type {
  ImportUrlResponse,
  CatalogMatchResult,
  CategorySuggestionResult,
  AdditionalGearSpecs,
} from '@/types/contributions';

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

    // -------------------------------------------------------------------------
    // Step 1: Firecrawl Scraping (Primary) or Pattern Extraction (Fallback)
    // -------------------------------------------------------------------------
    let specs: GearSpecs | null = null;
    let extractionMethod: 'firecrawl' | 'schema' | 'patterns' | 'ai' = 'firecrawl';
    let scrapeMetadata: { ogImage?: string } = {};

    // Check if Firecrawl API key is available
    const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;

    if (hasFirecrawlKey) {
      try {
        const firecrawl = createFirecrawlClient();
        const scrapeResult = await firecrawl.scrape(url, {
          formats: ['markdown'],
          onlyMainContent: true,
        });

        // Store metadata for fallback image
        scrapeMetadata = {
          ogImage: scrapeResult.data.metadata?.ogImage as string | undefined,
        };

        // Extract specs from markdown content
        if (scrapeResult.data.markdown) {
          specs = extractGearSpecs(scrapeResult.data.markdown, url);
        }

        if (!specs) {
          console.warn('[ImportUrl] Firecrawl returned no extractable specs, falling back');
        }
      } catch (firecrawlError) {
        // Log specific error types
        if (firecrawlError instanceof SSRFError) {
          return NextResponse.json<ImportUrlResponse>(
            { success: false, error: 'URL targets a private or restricted address' },
            { status: 400 }
          );
        }

        if (firecrawlError instanceof TimeoutError) {
          console.warn('[ImportUrl] Firecrawl timed out, falling back:', firecrawlError.message);
        } else if (firecrawlError instanceof FirecrawlError) {
          console.warn('[ImportUrl] Firecrawl API error, falling back:', firecrawlError.message);
        } else {
          console.warn('[ImportUrl] Firecrawl failed, falling back:', firecrawlError);
        }

        // Will fall through to pattern extraction below
        specs = null;
      }
    } else {
      console.info('[ImportUrl] FIRECRAWL_API_KEY not set, using pattern extraction');
    }

    // -------------------------------------------------------------------------
    // Fallback: Pattern-based extraction if Firecrawl failed or unavailable
    // -------------------------------------------------------------------------
    if (!specs) {
      const fallbackResult = await extractProductDataFromUrl(url);

      if (!fallbackResult.data) {
        return NextResponse.json<ImportUrlResponse>(
          { success: false, error: fallbackResult.error || 'Could not extract data from URL' },
          { status: 422 }
        );
      }

      // Map fallback data to specs format for unified processing
      extractionMethod = fallbackResult.data.extractionMethod;

      // Continue with fallback data (no additional specs available)
      const extracted = fallbackResult.data;

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
          console.error('[ImportUrl] Catalog search failed:', catalogError);
        }
      }

      // Category suggestion from catalog match only (no keyword matching for fallback)
      let categorySuggestion: CategorySuggestionResult | null = null;
      if (catalogMatch?.productTypeId) {
        categorySuggestion = {
          categoryId: catalogMatch.productTypeId,
          source: 'catalog_match',
        };
      }

      // Return fallback result (no additional specs)
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
          extractionMethod,
          catalogMatch,
          categorySuggestion,
          additionalSpecs: null,
        },
      });
    }

    // -------------------------------------------------------------------------
    // Step 2: Continue with Firecrawl-extracted specs
    // -------------------------------------------------------------------------

    // Build search query for catalog matching
    const searchQuery = buildSearchQuery(specs.name ?? null, specs.brand ?? null);

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
        console.error('[ImportUrl] Catalog search failed:', catalogError);
      }
    }

    // -------------------------------------------------------------------------
    // Step 3: Category Suggestion
    // -------------------------------------------------------------------------
    let categorySuggestion: CategorySuggestionResult | null = null;

    if (catalogMatch?.productTypeId) {
      // Use category from catalog match (highest confidence)
      const categoryPath = await buildCategoryPath(catalogMatch.productTypeId);
      categorySuggestion = {
        categoryId: catalogMatch.productTypeId,
        categoryPath: categoryPath || undefined,
        source: 'catalog_match',
      };
    } else if (specs.name) {
      // Fallback to keyword-based category suggestion
      const keywordSuggestion = await suggestCategory(
        specs.name,
        specs.description ?? undefined
      );

      if (keywordSuggestion) {
        categorySuggestion = {
          categoryId: keywordSuggestion.categoryId,
          categoryPath: keywordSuggestion.categoryPath,
          source: 'keyword_matching',
          confidence: keywordSuggestion.confidence,
        };
      }
    }

    // -------------------------------------------------------------------------
    // Step 4: Build Additional Specs
    // -------------------------------------------------------------------------
    const additionalSpecs: AdditionalGearSpecs = {
      materials: specs.materials ?? null,
      seasonRating: specs.seasonRating ?? null,
      dimensions: specs.dimensions ?? null,
      capacity: specs.capacity ?? null,
      temperatureRating: specs.temperatureRating ?? null,
      capacityPersons: specs.capacityPersons ?? null,
      constructionType: specs.constructionType ?? null,
      frameType: specs.frameType ?? null,
      fuelType: specs.fuelType ?? null,
    };

    // Check if additionalSpecs has any non-null values
    const hasAdditionalSpecs = Object.values(additionalSpecs).some((v) => v !== null);

    // -------------------------------------------------------------------------
    // Step 5: Calculate confidence based on specs extraction
    // -------------------------------------------------------------------------
    const extractionConfidence: 'high' | 'medium' | 'low' =
      specs.confidence && specs.confidence > 0.5
        ? 'high'
        : specs.confidence && specs.confidence > 0.2
          ? 'medium'
          : 'low';

    // -------------------------------------------------------------------------
    // Step 6: Return combined result
    // -------------------------------------------------------------------------
    return NextResponse.json<ImportUrlResponse>({
      success: true,
      data: {
        // Core extracted data
        name: specs.name ?? null,
        brand: specs.brand ?? null,
        description: specs.description ?? null,
        imageUrl: specs.imageUrl ?? scrapeMetadata.ogImage ?? null,
        weightGrams: specs.weight?.value ?? null,
        weightUnit: specs.weight?.unit ?? null,
        priceValue: specs.price?.value ?? null,
        currency: specs.price?.currency ?? null,
        productUrl: url,
        extractionConfidence,
        extractionMethod: 'firecrawl',

        // Catalog match
        catalogMatch,

        // Category suggestion
        categorySuggestion,

        // Additional specs (only include if any are present)
        additionalSpecs: hasAdditionalSpecs ? additionalSpecs : null,
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
