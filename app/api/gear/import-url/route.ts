/**
 * URL Import API Route
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * POST /api/gear/import-url
 * Extracts product data from URL with a cost-aware strategy:
 * 1) free HTML/schema extraction first
 * 2) Firecrawl only when core fields are insufficient
 * Then checks GearGraph catalog for matches and suggests categories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fuzzyProductSearch } from '@/lib/supabase/catalog';
import { extractProductDataFromUrl } from '@/app/actions/smart-product-search';
import { createFirecrawlClient, SSRFError, TimeoutError, FirecrawlError } from '@/lib/firecrawl/client';
import { extractGearSpecs, type GearSpecs } from '@/lib/firecrawl/gear-specs';
import { suggestCategory, buildCategoryPath } from '@/lib/category-suggestion';
import type { ExtractedProductData } from '@/types/smart-search';
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
    // Step 1: Free extraction first (schema/meta/patterns)
    // -------------------------------------------------------------------------
    const fallbackResult = await extractProductDataFromUrl(url);
    const extracted = fallbackResult.data;

    // -------------------------------------------------------------------------
    // Step 2: Firecrawl fallback/enrichment (only if free result is insufficient)
    // -------------------------------------------------------------------------
    let specs: GearSpecs | null = null;
    let scrapeMetadata: Record<string, unknown> = {};
    let scrapeMarkdown: string | null = null;
    const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;
    const shouldUseFirecrawl = shouldEnrichWithFirecrawl(extracted);

    if (hasFirecrawlKey && shouldUseFirecrawl) {
      try {
        const firecrawl = createFirecrawlClient();
        const scrapeResult = await firecrawl.scrape(url, {
          formats: ['markdown'],
          onlyMainContent: true,
        });

        scrapeMetadata = scrapeResult.data.metadata ?? {};
        scrapeMarkdown = scrapeResult.data.markdown ?? null;

        // Extract specs from markdown content
        if (scrapeMarkdown) {
          specs = extractGearSpecs(scrapeMarkdown, url);
        }

        // Fill core fields from metadata/markdown if extractor couldn't infer them
        if (!specs) specs = { sourceUrl: url, scrapedAt: new Date().toISOString(), confidence: 0 };

        if (!specs.name) {
          specs.name =
            normalizeNameFromTitle(
              pickFirstString(
                scrapeMetadata.title,
                scrapeMetadata.ogTitle,
                scrapeMetadata.twitterTitle
              ),
              url
            ) ?? extractNameFromMarkdown(scrapeMarkdown) ?? extractNameFromUrl(url) ?? undefined;
        }

        if (!specs.description) {
          specs.description =
            pickFirstString(
              scrapeMetadata.description,
              scrapeMetadata.ogDescription,
              scrapeMetadata.twitterDescription
            ) ?? undefined;
        }

        if (!specs.imageUrl) {
          const metadataImage = normalizeHttpUrl(
            pickFirstString(
              scrapeMetadata.ogImage,
              scrapeMetadata.image,
              scrapeMetadata.imageUrl,
              scrapeMetadata.twitterImage
            ),
            url
          );
          if (metadataImage) specs.imageUrl = metadataImage;
        }

        if (!specs.brand) {
          specs.brand = pickFirstString(
            scrapeMetadata.brand,
            scrapeMetadata.manufacturer
          ) ?? undefined;
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

        // Continue with free extraction result only
        specs = null;
      }
    } else if (!hasFirecrawlKey && shouldUseFirecrawl) {
      console.info('[ImportUrl] FIRECRAWL_API_KEY not set, using free extraction result');
    }

    // -------------------------------------------------------------------------
    // Step 3: Merge best available fields
    // -------------------------------------------------------------------------
    const mergedName = pickFirstString(
      extracted?.name,
      specs?.name,
      extractNameFromMarkdown(scrapeMarkdown),
      extractNameFromUrl(url)
    );

    const mergedBrand = pickFirstString(extracted?.brand, specs?.brand);

    const mergedDescription = pickFirstString(
      extracted?.description,
      specs?.description
    );

    const mergedImageUrl = normalizeHttpUrl(
      pickFirstString(
        extracted?.imageUrl,
        specs?.imageUrl,
        scrapeMetadata.ogImage,
        scrapeMetadata.image,
        scrapeMetadata.imageUrl,
        scrapeMetadata.twitterImage
      ),
      url
    );

    const freeWeight = extracted?.weightGrams ?? null;
    const firecrawlWeight = specs?.weight ? toWeightInGrams(specs.weight.value, specs.weight.unit) : null;
    const mergedWeightGrams = freeWeight ?? firecrawlWeight;
    const mergedWeightUnit: 'g' | 'kg' | 'oz' | 'lb' | null =
      freeWeight !== null ? 'g' : (specs?.weight?.unit ?? null);

    const mergedPriceValue = extracted?.priceValue ?? specs?.price?.value ?? null;
    const mergedCurrency = extracted?.currency ?? specs?.price?.currency ?? null;

    if (!mergedName && !mergedDescription && !mergedImageUrl && mergedWeightGrams === null) {
      return NextResponse.json<ImportUrlResponse>(
        { success: false, error: fallbackResult.error || 'Could not extract data from URL' },
        { status: 422 }
      );
    }

    // -------------------------------------------------------------------------
    // Step 4: Catalog matching
    // -------------------------------------------------------------------------

    // Build search query for catalog matching
    const searchQuery = buildSearchQuery(mergedName, mergedBrand);

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
    // Step 5: Category suggestion
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
    } else if (mergedName || mergedDescription) {
      // Fallback to keyword-based category suggestion
      const keywordSuggestion = await suggestCategory(
        mergedName ?? mergedDescription ?? '',
        mergedDescription ?? undefined
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
    // Step 6: Build additional specs (only from Firecrawl)
    // -------------------------------------------------------------------------
    const additionalSpecs = specs ? mapAdditionalSpecs(specs) : null;

    // Check if additionalSpecs has any non-null values
    const hasAdditionalSpecs = additionalSpecs
      ? Object.values(additionalSpecs).some((v) => v !== null)
      : false;

    // -------------------------------------------------------------------------
    // Step 7: Compute confidence + return payload
    // -------------------------------------------------------------------------
    const extractionConfidence = computeExtractionConfidence(
      {
        name: mergedName,
        brand: mergedBrand,
        description: mergedDescription,
        imageUrl: mergedImageUrl,
        weightGrams: mergedWeightGrams,
      },
      extracted?.confidence,
      specs?.confidence
    );

    const extractionMethod: 'firecrawl' | 'schema' | 'patterns' | 'ai' =
      !extracted && specs
        ? 'firecrawl'
        : extracted?.extractionMethod ?? 'firecrawl';

    return NextResponse.json<ImportUrlResponse>({
      success: true,
      data: {
        // Core extracted data
        name: mergedName,
        brand: mergedBrand,
        description: mergedDescription,
        imageUrl: mergedImageUrl,
        weightGrams: mergedWeightGrams,
        weightUnit: mergedWeightUnit,
        priceValue: mergedPriceValue,
        currency: mergedCurrency,
        productUrl: url,
        extractionConfidence,
        extractionMethod,

        // Catalog match
        catalogMatch,

        // Category suggestion
        categorySuggestion,

        // Additional specs (only include if any are present)
        additionalSpecs: hasAdditionalSpecs && additionalSpecs ? additionalSpecs : null,
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

/**
 * Whether Firecrawl should run as paid fallback/enrichment.
 */
function shouldEnrichWithFirecrawl(
  extracted: ExtractedProductData | null
): boolean {
  if (!extracted) return true;

  const hasName = !!(extracted.name && extracted.name.trim().length >= 3);
  const hasBrand = !!(extracted.brand && extracted.brand.trim().length >= 2);
  const hasDescription = !!(extracted.description && extracted.description.trim().length >= 24);
  const hasImage = !!extracted.imageUrl;
  const hasWeight = extracted.weightGrams !== null && extracted.weightGrams > 0;

  // Already strong enough for modal + form prefill
  if (
    extracted.confidence === 'high' &&
    hasName &&
    hasBrand &&
    hasDescription &&
    hasImage &&
    hasWeight
  ) {
    return false;
  }

  // Run Firecrawl when one of the critical fields is missing.
  const missingCritical = [hasName, hasDescription, hasImage, hasWeight].filter(Boolean).length;
  return missingCritical < 4;
}

/**
 * Pick first non-empty string from unknown candidates.
 */
function pickFirstString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * Normalize to absolute http(s) URL.
 */
function normalizeHttpUrl(rawUrl: string | null, baseUrl: string): string | null {
  if (!rawUrl) return null;

  try {
    const resolved = new URL(rawUrl, baseUrl);
    if (!['http:', 'https:'].includes(resolved.protocol)) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * Best-effort product name extraction from markdown.
 */
function extractNameFromMarkdown(markdown: string | null): string | null {
  if (!markdown) return null;

  const heading = markdown.match(/^#\s+(.+)$/m);
  if (!heading?.[1]) return null;

  const cleaned = heading[1].replace(/\s+/g, ' ').trim();
  if (cleaned.length < 3 || cleaned.length > 200) return null;
  return cleaned;
}

/**
 * Best-effort name fallback from URL path.
 */
function extractNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const raw = segments[segments.length - 2] ?? segments[segments.length - 1];
    if (!raw) return null;

    const cleaned = raw
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned.length >= 3 ? cleaned : null;
  } catch {
    return null;
  }
}

/**
 * Clean title-style names that include shop/domain suffixes.
 */
function normalizeNameFromTitle(title: string | null, sourceUrl: string): string | null {
  if (!title) return null;

  let normalized = title.replace(/\s+/g, ' ').trim();
  const pipeParts = normalized.split(/\s+\|\s+/);
  if (pipeParts.length > 1) normalized = pipeParts[0]!.trim();

  const dashParts = normalized.split(/\s+[-–—]\s+/);
  if (dashParts.length > 1) {
    let domainHint = '';
    try {
      domainHint = new URL(sourceUrl).hostname.replace(/^www\./, '').split('.')[0]!.toLowerCase();
    } catch {
      domainHint = '';
    }
    const trailing = dashParts[dashParts.length - 1]!.toLowerCase();
    if (
      (domainHint && trailing.includes(domainHint)) ||
      trailing.includes('shop') ||
      trailing.includes('store')
    ) {
      normalized = dashParts.slice(0, -1).join(' - ').trim();
    }
  }

  return normalized.length >= 3 ? normalized : null;
}

/**
 * Convert weight to grams.
 */
function toWeightInGrams(value: number, unit: 'g' | 'kg' | 'oz' | 'lb'): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  switch (unit) {
    case 'kg':
      return Math.round(value * 1000);
    case 'oz':
      return Math.round(value * 28.3495);
    case 'lb':
      return Math.round(value * 453.592);
    case 'g':
    default:
      return Math.round(value);
  }
}

/**
 * Build additional specs payload from Firecrawl extraction.
 */
function mapAdditionalSpecs(specs: GearSpecs): AdditionalGearSpecs {
  return {
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
}

/**
 * Compute extraction confidence from merged fields.
 */
function computeExtractionConfidence(
  merged: {
    name: string | null;
    brand: string | null;
    description: string | null;
    imageUrl: string | null;
    weightGrams: number | null;
  },
  freeConfidence?: 'high' | 'medium' | 'low',
  firecrawlConfidence?: number
): 'high' | 'medium' | 'low' {
  let score = 0;

  if (merged.name) score += 2;
  if (merged.brand) score += 1;
  if (merged.description && merged.description.length >= 24) score += 1;
  if (merged.imageUrl) score += 1;
  if (merged.weightGrams !== null && merged.weightGrams > 0) score += 1;

  if (freeConfidence === 'high') score += 1;
  if (freeConfidence === 'medium') score += 0.5;
  if (typeof firecrawlConfidence === 'number') score += Math.min(firecrawlConfidence, 1) * 0.5;

  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}
