/**
 * Smart Product Search Server Action
 *
 * Feature: XXX-smart-product-search
 *
 * Searches for products in GearGraph catalog first, then internet as fallback.
 * Extracts structured data from internet product pages.
 *
 * Tier Differentiation:
 * - Free tier: 10 internet searches per day (catalog always free)
 * - Trailblazer: Unlimited internet searches
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { fuzzyProductSearch } from '@/lib/supabase/catalog';
import {
  checkProductSearchLimit,
  recordProductSearchUsage,
  DAILY_LIMIT_FREE,
  CATALOG_SCORE_THRESHOLD,
} from '@/lib/rate-limits/product-search';
import type { RateLimitInfo } from '@/app/actions/weight-search';
import type {
  CatalogProductResult,
  InternetProductResult,
  SmartSearchResponse,
  ExtractedProductData,
  ExtractProductResponse,
} from '@/types/smart-search';

// =============================================================================
// Internet Search Types
// =============================================================================

interface SerperSearchResponse {
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  knowledgeGraph?: {
    title?: string;
    description?: string;
    attributes?: Record<string, string>;
  };
}

// =============================================================================
// Weight/Price Parsing (reused from weight-search)
// =============================================================================

/**
 * Convert weight to grams based on unit
 */
function convertToGrams(value: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim();

  if (normalizedUnit === 'g' || normalizedUnit === 'grams' || normalizedUnit === 'gram') {
    return value;
  }
  if (normalizedUnit === 'kg' || normalizedUnit === 'kilograms' || normalizedUnit === 'kilogram') {
    return value * 1000;
  }
  if (normalizedUnit === 'oz' || normalizedUnit === 'ounces' || normalizedUnit === 'ounce') {
    return Math.round(value * 28.3495);
  }
  if (normalizedUnit === 'lb' || normalizedUnit === 'lbs' || normalizedUnit === 'pounds' || normalizedUnit === 'pound') {
    return Math.round(value * 453.592);
  }

  return value;
}

/**
 * Get weight unit type
 */
function getWeightUnit(unit: string): 'g' | 'kg' | 'oz' | 'lb' | null {
  const normalizedUnit = unit.toLowerCase().trim();

  if (normalizedUnit === 'g' || normalizedUnit === 'grams' || normalizedUnit === 'gram') return 'g';
  if (normalizedUnit === 'kg' || normalizedUnit === 'kilograms' || normalizedUnit === 'kilogram') return 'kg';
  if (normalizedUnit === 'oz' || normalizedUnit === 'ounces' || normalizedUnit === 'ounce') return 'oz';
  if (normalizedUnit === 'lb' || normalizedUnit === 'lbs' || normalizedUnit === 'pounds' || normalizedUnit === 'pound') return 'lb';

  return null;
}

/**
 * Parse weight from text
 */
function parseWeight(text: string): { grams: number; unit: 'g' | 'kg' | 'oz' | 'lb' } | null {
  const pattern = /(\d+(?:\.\d+)?)\s*(g(?:rams?)?|kg|kilograms?|oz|ounces?|lbs?|pounds?)\b/gi;
  const match = pattern.exec(text);

  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2];
    const grams = convertToGrams(value, unit);
    const unitType = getWeightUnit(unit);

    if (grams >= 1 && grams <= 50000 && unitType) {
      return { grams, unit: unitType };
    }
  }

  return null;
}

/**
 * Parse price from text
 */
function parsePrice(text: string): { value: number; currency: string } | null {
  // Match patterns like: $299.99, €199, £149.00, 299 USD
  const patterns = [
    /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,           // $299.99
    /€\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,            // €199
    /£\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,            // £149
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|EUR|GBP)/gi, // 299 USD
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const valueStr = match[1].replace(/,/g, '');
      const value = parseFloat(valueStr);

      if (value > 0 && value < 100000) {
        // Determine currency
        const currency = text.includes('$') ? 'USD'
          : text.includes('€') ? 'EUR'
          : text.includes('£') ? 'GBP'
          : 'USD';

        return { value, currency };
      }
    }
  }

  return null;
}

// =============================================================================
// Internet Search
// =============================================================================

/**
 * Search the internet for product information using Serper API
 */
async function searchInternet(query: string): Promise<InternetProductResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error('[SmartSearch] SERPER_API_KEY not configured');
    return [];
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${query} specifications weight price`,
        num: 8,
      }),
    });

    if (!response.ok) {
      console.error('[SmartSearch] Serper API error:', response.status);
      return [];
    }

    const data: SerperSearchResponse = await response.json();

    return (data.organic || [])
      .filter((result) => result.link && result.title)
      .slice(0, 6)
      .map((result) => ({
        source: 'internet' as const,
        title: result.title,
        link: result.link,
        snippet: result.snippet || '',
        domain: new URL(result.link).hostname.replace('www.', ''),
        thumbnailUrl: undefined,
      }));
  } catch (error) {
    console.error('[SmartSearch] Internet search failed:', error);
    return [];
  }
}

// =============================================================================
// Main Search Function
// =============================================================================

/**
 * Smart product search - catalog first, internet fallback
 */
export async function smartProductSearch(query: string): Promise<SmartSearchResponse> {
  // Get current user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to search for products.');
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) {
    throw new Error('Please enter at least 2 characters to search.');
  }

  // Always search catalog first (free)
  const catalogProducts = await fuzzyProductSearch(supabase, trimmedQuery, { limit: 8 });

  // Map to CatalogProductResult format
  const catalogResults: CatalogProductResult[] = catalogProducts.map((p) => ({
    source: 'catalog' as const,
    id: p.id,
    name: p.name,
    brand: p.brand,
    categoryMain: p.categoryMain,
    subcategory: p.subcategory,
    productType: p.productType,
    productTypeId: p.productTypeId,
    description: p.description,
    weightGrams: p.weightGrams,
    priceUsd: p.priceUsd,
    score: p.score,
  }));

  // Find top catalog score
  const catalogTopScore = catalogResults.length > 0
    ? Math.max(...catalogResults.map((r) => r.score))
    : 0;

  // Check if we need internet search
  const shouldSearchInternet = catalogTopScore < CATALOG_SCORE_THRESHOLD;

  // Check rate limit for internet search
  const rateLimitStatus = await checkProductSearchLimit(user.id);

  // Build rate limit info
  const rateLimit: RateLimitInfo = {
    remaining: rateLimitStatus.isUnlimited ? Infinity : rateLimitStatus.remaining,
    limit: rateLimitStatus.isUnlimited ? Infinity : DAILY_LIMIT_FREE,
    resetAt: rateLimitStatus.resetAt.toISOString(),
    isUnlimited: rateLimitStatus.isUnlimited,
  };

  // If catalog score is good enough, return catalog only
  if (!shouldSearchInternet) {
    return {
      catalogResults,
      internetResults: [],
      catalogTopScore,
      showInternetResults: false,
      rateLimit,
    };
  }

  // If rate limited, return catalog only with error
  if (!rateLimitStatus.allowed) {
    return {
      catalogResults,
      internetResults: [],
      catalogTopScore,
      showInternetResults: false,
      rateLimit,
      rateLimitError: 'Daily internet search limit reached. Upgrade to Trailblazer for unlimited searches.',
    };
  }

  // Perform internet search
  const internetResults = await searchInternet(trimmedQuery);

  // Record usage (only if internet search was performed)
  if (!rateLimitStatus.isUnlimited && internetResults.length > 0) {
    await recordProductSearchUsage(user.id);
    rateLimit.remaining = Math.max(0, rateLimit.remaining - 1);
  }

  return {
    catalogResults,
    internetResults,
    catalogTopScore,
    showInternetResults: true,
    rateLimit,
  };
}

// =============================================================================
// Data Extraction
// =============================================================================

/**
 * Extract product data from a URL
 *
 * Strategy:
 * 1. Fetch page HTML
 * 2. Try schema.org/Product JSON-LD extraction (most accurate)
 * 3. Fallback to pattern matching for weight/price
 */
export async function extractProductDataFromUrl(url: string): Promise<ExtractProductResponse> {
  // Get current user (for rate limit tracking, though extraction uses same quota as search)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: 'You must be logged in to extract product data.' };
  }

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GearShackBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return { data: null, error: `Failed to fetch page: ${response.status}` };
    }

    const html = await response.text();

    // Try schema.org extraction first
    const schemaData = extractSchemaOrgProduct(html);
    if (schemaData && schemaData.confidence === 'high') {
      return { data: { ...schemaData, productUrl: url } };
    }

    // Fallback to pattern extraction
    const patternData = extractWithPatterns(html, url);

    return { data: patternData };
  } catch (error) {
    console.error('[SmartSearch] Extraction failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: `Extraction failed: ${message}` };
  }
}

/**
 * Extract product data from schema.org JSON-LD
 */
function extractSchemaOrgProduct(html: string): Omit<ExtractedProductData, 'productUrl'> | null {
  try {
    // Find JSON-LD script tags
    const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = jsonLdPattern.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        const product = findProductInSchema(jsonData);

        if (product) {
          // Extract brand - could be string or object with name property
          const brandValue = product.brand;
          let brandName: string | null = null;
          if (typeof brandValue === 'string') {
            brandName = brandValue;
          } else if (brandValue && typeof brandValue === 'object' && 'name' in brandValue) {
            brandName = String((brandValue as Record<string, unknown>).name);
          }

          return {
            name: typeof product.name === 'string' ? product.name : null,
            brand: brandName,
            description: truncateDescription(product.description as string | undefined),
            weightGrams: extractSchemaWeight(product),
            weightUnit: null, // Schema gives normalized weight
            priceValue: extractSchemaPrice(product)?.value ?? null,
            currency: extractSchemaPrice(product)?.currency ?? null,
            imageUrl: extractSchemaImage(product),
            confidence: 'high',
            extractionMethod: 'schema',
          };
        }
      } catch {
        // Invalid JSON, continue to next
      }
    }
  } catch {
    // Pattern matching failed
  }

  return null;
}

/**
 * Find Product object in schema.org data (handles arrays and nested objects)
 */
function findProductInSchema(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;

  // Handle arrays
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findProductInSchema(item);
      if (found) return found;
    }
    return null;
  }

  // Check if this is a Product
  const obj = data as Record<string, unknown>;
  if (obj['@type'] === 'Product' || obj['@type']?.toString().includes('Product')) {
    return obj;
  }

  // Check @graph
  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    return findProductInSchema(obj['@graph']);
  }

  return null;
}

/**
 * Extract weight from schema.org product
 */
function extractSchemaWeight(product: Record<string, unknown>): number | null {
  // Check weight property
  const weight = product.weight as Record<string, unknown> | undefined;
  if (weight?.value) {
    const value = parseFloat(String(weight.value));
    const unit = String(weight.unitCode || weight.unitText || 'g');
    return convertToGrams(value, unit);
  }

  // Check additionalProperty for weight
  const additionalProps = product.additionalProperty as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(additionalProps)) {
    for (const prop of additionalProps) {
      if (prop.name?.toString().toLowerCase().includes('weight')) {
        const parsed = parseWeight(String(prop.value));
        if (parsed) return parsed.grams;
      }
    }
  }

  return null;
}

/**
 * Extract price from schema.org product
 */
function extractSchemaPrice(product: Record<string, unknown>): { value: number; currency: string } | null {
  const offers = product.offers as Record<string, unknown> | Array<Record<string, unknown>> | undefined;

  if (!offers) return null;

  // Handle single offer or array of offers
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer) return null;

  const price = parseFloat(String(offer.price || offer.lowPrice || 0));
  const currency = String(offer.priceCurrency || 'USD');

  if (price > 0) {
    return { value: price, currency };
  }

  return null;
}

/**
 * Extract image from schema.org product
 */
function extractSchemaImage(product: Record<string, unknown>): string | null {
  const image = product.image;

  if (typeof image === 'string') return image;
  if (Array.isArray(image) && image.length > 0) {
    return typeof image[0] === 'string' ? image[0] : (image[0] as Record<string, unknown>)?.url as string || null;
  }
  if (typeof image === 'object' && image !== null) {
    return (image as Record<string, unknown>).url as string || null;
  }

  return null;
}

/**
 * Fallback pattern-based extraction
 */
function extractWithPatterns(html: string, url: string): ExtractedProductData {
  // Extract title from page
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].trim().split('|')[0].split('-')[0].trim() : null;

  // Extract meta description
  const descMatch = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i.exec(html);
  const description = descMatch ? truncateDescription(descMatch[1]) : null;

  // Try to find weight in page content
  const weightResult = parseWeight(html);

  // Try to find price
  const priceResult = parsePrice(html);

  // Try to find OG image
  const ogImageMatch = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i.exec(html);
  const imageUrl = ogImageMatch ? ogImageMatch[1] : null;

  return {
    name: title,
    brand: null, // Hard to extract reliably without schema
    description,
    weightGrams: weightResult?.grams ?? null,
    weightUnit: weightResult?.unit ?? null,
    priceValue: priceResult?.value ?? null,
    currency: priceResult?.currency ?? null,
    imageUrl,
    productUrl: url,
    confidence: weightResult || priceResult ? 'medium' : 'low',
    extractionMethod: 'patterns',
  };
}

/**
 * Truncate description to reasonable length
 */
function truncateDescription(text: string | undefined | null): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 500 ? cleaned.slice(0, 497) + '...' : cleaned;
}
