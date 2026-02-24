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
// Configuration
// =============================================================================

/** Maximum response size for extraction (5MB) */
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/** Timeout for page fetch in ms */
const FETCH_TIMEOUT_MS = 10000;

/** Blocked hosts for SSRF protection */
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
];

/** Blocked IP ranges (private networks, loopback, link-local) */
const BLOCKED_IP_PATTERNS = [
  /^10\./,                     // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./,               // 192.168.0.0/16
  /^127\./,                    // 127.0.0.0/8
  /^169\.254\./,               // Link-local
  /^fc00:/i,                   // IPv6 unique local
  /^fe80:/i,                   // IPv6 link-local
];

// =============================================================================
// URL Validation (SSRF Protection)
// =============================================================================

/**
 * Validates a URL for safe fetching.
 * Blocks internal IPs, private networks, and non-HTTP(S) schemes.
 * @returns Error message if invalid, null if safe
 */
function validateExtractionUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS (and HTTP for development)
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return 'Only HTTP/HTTPS URLs are allowed';
    }

    // Block known internal hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return 'Internal URLs are not allowed';
    }

    // Block private IP ranges
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return 'Private network URLs are not allowed';
      }
    }

    // Block URLs with authentication credentials
    if (parsed.username || parsed.password) {
      return 'URLs with credentials are not allowed';
    }

    // Block non-standard ports (only 80, 443 allowed)
    const port = parsed.port;
    if (port && port !== '80' && port !== '443') {
      return 'Non-standard ports are not allowed';
    }

    return null; // URL is safe
  } catch {
    return 'Invalid URL format';
  }
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
 * Parse weight from text.
 *
 * When fullHtml is true, uses contextual patterns (e.g., "Gewicht: 700 g") to avoid
 * matching random numbers in CSS/JS. When false, matches any weight-like pattern.
 */
function parseWeight(text: string, fullHtml = false): { grams: number; unit: 'g' | 'kg' | 'oz' | 'lb' } | null {
  // Contextual patterns for full HTML - require a weight-related label nearby
  // This prevents matching random numbers in CSS/JS (e.g., "0.7" in opacity)
  if (fullHtml) {
    const contextualPatterns = [
      // German: "Gewicht: 700 g", "Gewicht 0,7 kg", "Gewicht: ca. 700g"
      /(?:gewicht|weight|masse|mass)\s*[:=]?\s*(?:ca\.?\s*)?(\d+(?:[.,]\d+)?)\s*(g(?:rams?)?|kg|kilograms?|oz|ounces?|lbs?|pounds?)\b/gi,
      // Structured data attributes: data-weight="700", itemprop="weight" content="700 g"
      /(?:data-weight|itemprop=["']weight["'])[^>]*?(\d+(?:[.,]\d+)?)\s*(g(?:rams?)?|kg|kilograms?|oz|ounces?|lbs?|pounds?)/gi,
      // Table/list context: "<td>700 g</td>", "<dd>0,7 kg</dd>", "<span>700g</span>"
      /(?:<(?:td|dd|span|p|li|div)[^>]*>)\s*(\d+(?:[.,]\d+)?)\s*(g(?:rams?)?|kg|kilograms?|oz|ounces?|lbs?|pounds?)\s*(?:<\/)/gi,
    ];

    for (const pattern of contextualPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const rawValue = match[1].replace(',', '.');
        const value = parseFloat(rawValue);
        const unit = match[2];
        const grams = convertToGrams(value, unit);
        const unitType = getWeightUnit(unit);

        if (grams >= 5 && grams <= 50000 && unitType) {
          return { grams, unit: unitType };
        }
      }
    }

    return null;
  }

  // Simple pattern for non-HTML text (supports both "." and "," as decimal separator)
  const pattern = /(\d+(?:[.,]\d+)?)\s*(g(?:rams?)?|kg|kilograms?|oz|ounces?|lbs?|pounds?)\b/gi;
  const match = pattern.exec(text);

  if (match) {
    const rawValue = match[1].replace(',', '.');
    const value = parseFloat(rawValue);
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
 * Parse price from text - supports both German (DE) and English (EN) formats.
 *
 * German formats:
 * - "299,95 €" or "€ 299,95" or "EUR 299,95" or "299,95 EUR"
 * - "1.299,00 €" (thousand separator = period, decimal = comma)
 *
 * English formats:
 * - "$299.95" or "299.95 USD"
 * - "$1,299.00" (thousand separator = comma, decimal = period)
 * - "£149.00" or "GBP 149.00"
 *
 * Detection logic:
 * - If both separators present: last separator determines format
 * - If last separator is comma AND followed by exactly 2 digits → German format (comma = decimal)
 * - If last separator is period AND followed by exactly 2 digits → English format (period = decimal)
 *
 * Regional format detection for ambiguous cases (single separator):
 * - If EUR/CHF symbol found → prefer German format (comma = decimal, period = thousands)
 * - If USD/GBP symbol found → prefer English format (period = decimal, comma = thousands)
 */
function parsePrice(text: string): { value: number; currency: string } | null {
  // Detect currency from text fragment
  const detectCurrency = (str: string): string => {
    const upperStr = str.toUpperCase();
    if (str.includes('$') || upperStr.includes('USD')) return 'USD';
    if (str.includes('€') || upperStr.includes('EUR')) return 'EUR';
    if (str.includes('£') || upperStr.includes('GBP')) return 'GBP';
    if (upperStr.includes('CHF')) return 'CHF';
    return 'USD'; // Default fallback
  };

  // Determine if currency typically uses German format (comma as decimal separator)
  const isGermanFormatCurrency = (currency: string): boolean => {
    return ['EUR', 'CHF'].includes(currency);
  };

  // Pattern to match price-like strings with various formats
  // Matches: currency symbol/code (optional), number with separators, currency symbol/code (optional)
  const pricePattern = /(?:[$€£]|USD|EUR|GBP|CHF)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:[$€£]|USD|EUR|GBP|CHF)?/gi;

  let match;
  while ((match = pricePattern.exec(text)) !== null) {
    const fullMatch = match[0].trim();
    const numberPart = match[1];

    if (!numberPart) continue;

    // Skip if no currency indicator in the match
    const hasCurrencyIndicator =
      fullMatch.includes('$') ||
      fullMatch.includes('€') ||
      fullMatch.includes('£') ||
      /USD|EUR|GBP|CHF/i.test(fullMatch);

    if (!hasCurrencyIndicator) continue;

    // Detect currency early for ambiguous format resolution
    const currency = detectCurrency(fullMatch);
    const preferGermanFormat = isGermanFormatCurrency(currency);

    // Determine if this is German or English format by analyzing the last separator
    // German: 1.234,56 (period = thousands, comma = decimal)
    // English: 1,234.56 (comma = thousands, period = decimal)

    const lastCommaIndex = numberPart.lastIndexOf(',');
    const lastPeriodIndex = numberPart.lastIndexOf('.');
    const hasComma = lastCommaIndex !== -1;
    const hasPeriod = lastPeriodIndex !== -1;

    let normalizedValue: number;

    if (hasComma && hasPeriod) {
      // Both separators present - use position-based detection
      if (lastCommaIndex > lastPeriodIndex) {
        // Last separator is comma - German format
        const afterComma = numberPart.slice(lastCommaIndex + 1);
        if (afterComma.length === 2 && /^\d{2}$/.test(afterComma)) {
          // German format: remove period (thousands), replace comma with period (decimal)
          const cleaned = numberPart.replace(/\./g, '').replace(',', '.');
          normalizedValue = parseFloat(cleaned);
        } else {
          // Comma is thousands separator (English style without decimal)
          const cleaned = numberPart.replace(/,/g, '');
          normalizedValue = parseFloat(cleaned);
        }
      } else {
        // Last separator is period - English format
        const afterPeriod = numberPart.slice(lastPeriodIndex + 1);
        if (afterPeriod.length === 2 && /^\d{2}$/.test(afterPeriod)) {
          // English format: remove comma (thousands), period is decimal
          const cleaned = numberPart.replace(/,/g, '');
          normalizedValue = parseFloat(cleaned);
        } else {
          // Period is thousands separator (German style without decimal)
          const cleaned = numberPart.replace(/\./g, '');
          normalizedValue = parseFloat(cleaned);
        }
      }
    } else if (hasComma && !hasPeriod) {
      // Only comma present - ambiguous case, use currency hint
      const afterComma = numberPart.slice(lastCommaIndex + 1);
      if (afterComma.length === 2 && /^\d{2}$/.test(afterComma)) {
        // Could be German decimal (e.g., "299,95 €") or English thousands (e.g., "$1,234")
        // Use currency hint: EUR/CHF → German (comma = decimal), USD/GBP → English (comma = thousands)
        if (preferGermanFormat) {
          // German format: comma is decimal separator
          const cleaned = numberPart.replace(',', '.');
          normalizedValue = parseFloat(cleaned);
        } else {
          // English format: comma is thousands separator
          const cleaned = numberPart.replace(/,/g, '');
          normalizedValue = parseFloat(cleaned);
        }
      } else {
        // More than 2 digits after comma - definitely thousands separator
        const cleaned = numberPart.replace(/,/g, '');
        normalizedValue = parseFloat(cleaned);
      }
    } else if (hasPeriod && !hasComma) {
      // Only period present - ambiguous case, use currency hint
      const afterPeriod = numberPart.slice(lastPeriodIndex + 1);
      if (afterPeriod.length === 2 && /^\d{2}$/.test(afterPeriod)) {
        // Could be English decimal (e.g., "$299.95") or German thousands (e.g., "1.234 €")
        // Use currency hint: EUR/CHF → German (period = thousands), USD/GBP → English (period = decimal)
        if (preferGermanFormat) {
          // German format: period is thousands separator (e.g., "1.234 €" = 1234)
          const cleaned = numberPart.replace(/\./g, '');
          normalizedValue = parseFloat(cleaned);
        } else {
          // English format: period is decimal separator (e.g., "$1.23" = 1.23)
          normalizedValue = parseFloat(numberPart);
        }
      } else if (afterPeriod.length === 3 && /^\d{3}$/.test(afterPeriod)) {
        // Exactly 3 digits after period - likely thousands separator (e.g., "1.234")
        const cleaned = numberPart.replace(/\./g, '');
        normalizedValue = parseFloat(cleaned);
      } else {
        // Other cases - assume decimal separator
        normalizedValue = parseFloat(numberPart);
      }
    } else {
      // No separators
      normalizedValue = parseFloat(numberPart);
    }

    // Validate the parsed value
    if (!isNaN(normalizedValue) && normalizedValue > 0 && normalizedValue < 100000) {
      return { value: normalizedValue, currency };
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

  // SSRF Protection: Validate URL before fetching
  const validationError = validateExtractionUrl(url);
  if (validationError) {
    return { data: null, error: validationError };
  }

  try {
    // Fetch the page with timeout
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GearShackBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { data: null, error: `Failed to fetch page: ${response.status}` };
    }

    // Check content length to prevent DoS via large files
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      return { data: null, error: 'Page too large to process' };
    }

    const html = await response.text();

    // Double-check size after reading (in case content-length was missing)
    if (html.length > MAX_RESPONSE_SIZE) {
      return { data: null, error: 'Page too large to process' };
    }

    // Try schema.org extraction first
    const schemaData = extractSchemaOrgProduct(html);
    if (schemaData && (schemaData.confidence === 'high' || schemaData.confidence === 'medium')) {
      // If schema extraction succeeded but has no image, try fallback image sources
      let imageUrl = schemaData.imageUrl;
      if (!imageUrl) {
        imageUrl =
          extractOgImage(html) ??
          extractTwitterImage(html) ??
          extractProductImageHeuristic(html, url);
      }

      // If schema has no name, try to supplement from HTML patterns
      let name = schemaData.name;
      if (!name) {
        name = extractProductName(html, url);
      }

      // If schema has no brand, try pattern extraction
      let brand = schemaData.brand;
      if (!brand) {
        brand = extractBrand(html);
      }

      // If schema has no description, try pattern extraction
      let description = schemaData.description;
      if (!description) {
        description = extractProductDescription(html);
      }

      return {
        data: {
          ...schemaData,
          name,
          brand,
          description,
          imageUrl,
          productUrl: url,
        },
      };
    }

    // Fallback to pattern extraction
    const patternData = extractWithPatterns(html, url);

    return { data: patternData };
  } catch (error) {
    console.error('[SmartSearch] Extraction failed:', error);

    // Specific handling for timeout errors
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return { data: null, error: 'Request timed out. The page took too long to respond.' };
      }
      // Handle network errors
      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
        return { data: null, error: 'Could not connect to the website. Please check the URL.' };
      }
    }

    // Log details server-side only, return generic message to client
    return { data: null, error: 'Extraction failed. Please try again later.' };
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

          const schemaName = typeof product.name === 'string' ? product.name : null;
          const schemaWeight = extractSchemaWeight(product);
          const schemaPrice = extractSchemaPrice(product);
          const schemaImage = extractSchemaImage(product);

          // Calculate confidence based on how much data was actually extracted
          const schemaDescription = typeof product.description === 'string' ? product.description : null;
          const fieldCount = [schemaName, brandName, schemaDescription, schemaWeight, schemaPrice, schemaImage]
            .filter(Boolean).length;
          const schemaConfidence: 'high' | 'medium' | 'low' =
            fieldCount >= 3 ? 'high' : fieldCount >= 1 ? 'medium' : 'low';

          return {
            name: schemaName,
            brand: brandName,
            description: truncateDescription(product.description as string | undefined),
            weightGrams: schemaWeight,
            weightUnit: null, // Schema gives normalized weight
            priceValue: schemaPrice?.value ?? null,
            currency: schemaPrice?.currency ?? null,
            imageUrl: schemaImage,
            confidence: schemaConfidence,
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
 * Extract OG image from HTML meta tags
 */
function extractOgImage(html: string): string | null {
  // Try property="og:image" with content attribute
  const ogImageMatch = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i.exec(html);
  if (ogImageMatch) return ogImageMatch[1];

  // Try with reversed attribute order (content before property)
  const ogImageMatchReversed = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i.exec(html);
  if (ogImageMatchReversed) return ogImageMatchReversed[1];

  return null;
}

/**
 * Extract Twitter card image from HTML meta tags
 */
function extractTwitterImage(html: string): string | null {
  // Try name="twitter:image" with content attribute
  const twitterImageMatch = /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i.exec(html);
  if (twitterImageMatch) return twitterImageMatch[1];

  // Try with reversed attribute order
  const twitterImageMatchReversed = /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i.exec(html);
  if (twitterImageMatchReversed) return twitterImageMatchReversed[1];

  // Try property="twitter:image" (some sites use property instead of name)
  const twitterImagePropertyMatch = /<meta[^>]*property=["']twitter:image["'][^>]*content=["']([^"']+)["']/i.exec(html);
  if (twitterImagePropertyMatch) return twitterImagePropertyMatch[1];

  return null;
}

/**
 * Extract product image using heuristics when meta tags fail
 *
 * Strategy:
 * 1. Look for <img> tags with product-related attributes
 * 2. Filter by size (>= 300px is likely a product image)
 * 3. Ignore small images (< 100px) which are likely icons/thumbnails
 * 4. Ensure absolute URL
 */
function extractProductImageHeuristic(html: string, baseUrl: string): string | null {
  // Regex to find all <img> tags with their attributes
  const imgTagPattern = /<img\s+([^>]*)\/?>/gi;
  const candidates: Array<{ src: string; score: number }> = [];

  let imgMatch;
  while ((imgMatch = imgTagPattern.exec(html)) !== null) {
    const attributes = imgMatch[1];

    // Extract src attribute
    const srcMatch = /src=["']([^"']+)["']/i.exec(attributes);
    if (!srcMatch) continue;

    const src = srcMatch[1];

    // Skip data URIs, empty srcs, and obvious non-product images
    if (
      !src ||
      src.startsWith('data:') ||
      src.includes('blank.') ||
      src.includes('placeholder') ||
      src.includes('spinner') ||
      src.includes('loading')
    ) {
      continue;
    }

    // Extract dimensions if available
    const widthMatch = /width=["']?(\d+)/i.exec(attributes);
    const heightMatch = /height=["']?(\d+)/i.exec(attributes);
    const width = widthMatch ? parseInt(widthMatch[1], 10) : 0;
    const height = heightMatch ? parseInt(heightMatch[1], 10) : 0;

    // Skip small images (likely icons, logos, thumbnails)
    if ((width > 0 && width < 100) || (height > 0 && height < 100)) {
      continue;
    }

    // Collect all relevant text for scoring
    const attrText = attributes.toLowerCase();
    const srcLower = src.toLowerCase();

    // Skip common non-product patterns
    if (
      srcLower.includes('logo') ||
      srcLower.includes('icon') ||
      srcLower.includes('avatar') ||
      srcLower.includes('banner') ||
      srcLower.includes('footer') ||
      srcLower.includes('header') ||
      srcLower.includes('social') ||
      srcLower.includes('badge') ||
      srcLower.includes('button') ||
      srcLower.includes('sprite') ||
      attrText.includes('logo') ||
      attrText.includes('icon') ||
      attrText.includes('avatar')
    ) {
      continue;
    }

    // Score the image based on product-related attributes
    let score = 0;

    // Boost for product-related keywords in src
    if (srcLower.includes('product')) score += 10;
    if (srcLower.includes('item')) score += 5;
    if (srcLower.includes('main')) score += 5;
    if (srcLower.includes('primary')) score += 5;
    if (srcLower.includes('hero')) score += 5;
    if (srcLower.includes('gallery')) score += 3;

    // Boost for product-related keywords in alt, class, or data-* attributes
    if (attrText.includes('product')) score += 8;
    if (attrText.includes('item')) score += 4;
    if (attrText.includes('main')) score += 4;
    if (attrText.includes('primary')) score += 4;
    if (attrText.includes('gallery')) score += 3;

    // Boost for large dimensions (likely main product image)
    if (width >= 300 || height >= 300) score += 10;
    if (width >= 500 || height >= 500) score += 5;

    // Boost for data-* attributes that suggest product images
    if (attrText.includes('data-zoom')) score += 5;
    if (attrText.includes('data-large')) score += 5;
    if (attrText.includes('data-src')) score += 2;

    // Only consider images with some relevance score or unknown dimensions
    // (unknown dimensions might still be product images)
    if (score > 0 || (width === 0 && height === 0)) {
      candidates.push({ src, score: score > 0 ? score : 1 });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Get the best candidate
  const bestCandidate = candidates[0];
  if (!bestCandidate) return null;

  // Ensure absolute URL
  let imageUrl = bestCandidate.src;
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    try {
      const base = new URL(baseUrl);
      if (imageUrl.startsWith('//')) {
        // Protocol-relative URL
        imageUrl = `${base.protocol}${imageUrl}`;
      } else if (imageUrl.startsWith('/')) {
        // Absolute path
        imageUrl = `${base.origin}${imageUrl}`;
      } else {
        // Relative path
        imageUrl = new URL(imageUrl, baseUrl).href;
      }
    } catch {
      // If URL parsing fails, skip this candidate
      return null;
    }
  }

  return imageUrl;
}

/**
 * Extract brand name from HTML using multiple strategies
 */
function extractBrand(html: string): string | null {
  // Strategy 1: og:brand meta tag
  const ogBrand = /<meta[^>]*property=["'](?:og:brand|product:brand)["'][^>]*content=["']([^"']+)["']/i.exec(html)
    ?? /<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:brand|product:brand)["']/i.exec(html);
  if (ogBrand) return decodeHtmlEntities(ogBrand[1].trim());

  // Strategy 2: itemprop="brand" (Schema.org microdata)
  const itempropBrand = /itemprop=["']brand["'][^>]*content=["']([^"']+)["']/i.exec(html)
    ?? /itemprop=["']brand["'][^>]*>([^<]+)</i.exec(html);
  if (itempropBrand) return decodeHtmlEntities(itempropBrand[1].trim());

  // Strategy 3: Structured data in meta tags (excluding "author" to avoid generic CMS metadata)
  const metaBrand = /<meta[^>]*name=["'](?:brand|manufacturer)["'][^>]*content=["']([^"']+)["']/i.exec(html)
    ?? /<meta[^>]*content=["']([^"']+)["'][^>]*name=["'](?:brand|manufacturer)["']/i.exec(html);
  if (metaBrand) return decodeHtmlEntities(metaBrand[1].trim());

  // Strategy 4: Common HTML patterns for brand display
  // e.g., <span class="brand">Fjällräven</span>, <a class="product-brand">Brand</a>
  // Reject captures containing JS-like characters to avoid matching inside script blocks
  const brandClassPattern = /<(?:span|a|div|p)[^>]*class=["'][^"']*(?:brand|manufacturer|hersteller)[^"']*["'][^>]*>([^<]+)</i;
  const brandClassMatch = brandClassPattern.exec(html);
  if (brandClassMatch) {
    const brand = brandClassMatch[1].trim();
    if (brand.length > 1 && brand.length < 60 && !/[{;=]/.test(brand)) return decodeHtmlEntities(brand);
  }

  // Strategy 5: German patterns "Marke: X" or "Hersteller: X"
  const germanBrand = /(?:marke|hersteller|brand)\s*[:]\s*(?:<[^>]*>)*\s*([^<\n,;]+)/i.exec(html);
  if (germanBrand) {
    const brand = germanBrand[1].trim();
    if (brand.length > 1 && brand.length < 60) return decodeHtmlEntities(brand);
  }

  return null;
}

/**
 * Extract product name from HTML title with smart splitting.
 * Avoids splitting on hyphens within product names by using broader separators.
 */
function extractProductName(html: string, url: string): string | null {
  // Strategy 1: og:title (usually cleaner than <title>)
  const ogTitle = /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html)
    ?? /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i.exec(html);
  if (ogTitle) {
    const cleaned = cleanProductTitle(decodeHtmlEntities(ogTitle[1].trim()), url);
    if (cleaned) return cleaned;
  }

  // Strategy 2: <title> tag with smart splitting
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (titleMatch) {
    const cleaned = cleanProductTitle(decodeHtmlEntities(titleMatch[1].trim()), url);
    if (cleaned) return cleaned;
  }

  // Strategy 3: h1 tag (often contains the product name)
  const h1Match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html);
  if (h1Match) {
    const h1 = decodeHtmlEntities(h1Match[1].trim());
    if (h1.length > 2 && h1.length < 200) return h1;
  }

  return null;
}

/**
 * Clean a product title by removing shop name suffixes.
 * Uses " | " and " - " (with spaces) as separators, not bare hyphens.
 * Also strips known shop name patterns.
 */
function cleanProductTitle(title: string, url: string): string | null {
  if (!title) return null;

  // Extract domain name for shop name detection
  let shopName = '';
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    // Use domain without TLD as shop name hint
    shopName = hostname.split('.')[0].toLowerCase();
  } catch { /* ignore */ }

  // Split on " | " first (most reliable separator)
  const parts = title.split(/\s*\|\s*/);
  let name = parts[0].trim();

  // If the first part looks like a shop name (matches domain), use the second part
  if (parts.length > 1 && shopName && name.toLowerCase().includes(shopName)) {
    name = parts[1].trim();
  }

  // Split on " - " (with spaces) to separate product from shop name
  // Only split if the part after " - " looks like a shop/site name (short, matches domain, etc.)
  const dashParts = name.split(/\s+[-–—]\s+/);
  if (dashParts.length > 1) {
    const lastPart = dashParts[dashParts.length - 1].toLowerCase();
    // If last part is short (likely shop name) or matches domain, remove it
    if (
      lastPart.length < 30 &&
      (
        (shopName && lastPart.includes(shopName)) ||
        lastPart.includes('shop') ||
        lastPart.includes('store') ||
        lastPart.includes('online')
      )
    ) {
      name = dashParts.slice(0, -1).join(' - ').trim();
    }
    // If first part matches shop name, use the rest
    else if (shopName && dashParts[0].toLowerCase().includes(shopName)) {
      name = dashParts.slice(1).join(' - ').trim();
    }
  }

  // Final cleanup: remove common suffixes like "kaufen", "bestellen", "online", "günstig"
  name = name.replace(/\s+(?:kaufen|bestellen|online|günstig|buy|shop|order)\s*$/i, '').trim();

  return name.length > 1 ? name : null;
}

/**
 * Extract product description from HTML using multiple sources
 */
function extractProductDescription(html: string): string | null {
  // Strategy 1: og:description (usually product-specific)
  const ogDesc = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i.exec(html)
    ?? /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i.exec(html);
  if (ogDesc) {
    const desc = truncateDescription(decodeHtmlEntities(ogDesc[1]));
    if (desc && desc.length > 10) return desc;
  }

  // Strategy 2: meta description
  const descMatch = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i.exec(html)
    ?? /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i.exec(html);
  if (descMatch) {
    const desc = truncateDescription(decodeHtmlEntities(descMatch[1]));
    if (desc && desc.length > 10) return desc;
  }

  // Strategy 3: itemprop="description"
  const itempropDesc = /itemprop=["']description["'][^>]*content=["']([^"']+)["']/i.exec(html);
  if (itempropDesc) {
    const desc = truncateDescription(decodeHtmlEntities(itempropDesc[1]));
    if (desc && desc.length > 10) return desc;
  }

  return null;
}

/**
 * Fallback pattern-based extraction
 */
function extractWithPatterns(html: string, url: string): ExtractedProductData {
  // Extract product name using smart title extraction
  const name = extractProductName(html, url);

  // Extract brand from multiple HTML sources
  const brand = extractBrand(html);

  // Extract description from multiple sources
  const description = extractProductDescription(html);

  // Try to find weight in page content (use contextual patterns for full HTML)
  const weightResult = parseWeight(html, true);

  // Try to find price
  const priceResult = parsePrice(html);

  // Extract image with priority fallback chain:
  // 1. og:image (most reliable)
  // 2. twitter:image (also common)
  // 3. Heuristic product image detection (last resort)
  const imageUrl =
    extractOgImage(html) ??
    extractTwitterImage(html) ??
    extractProductImageHeuristic(html, url);

  // Confidence: based on how many fields we extracted
  const extractedFieldCount = [name, brand, description, weightResult, priceResult, imageUrl]
    .filter(Boolean).length;
  const confidence: 'high' | 'medium' | 'low' =
    extractedFieldCount >= 4 ? 'high'
      : extractedFieldCount >= 2 ? 'medium'
      : 'low';

  return {
    name,
    brand,
    description,
    weightGrams: weightResult?.grams ?? null,
    weightUnit: weightResult?.unit ?? null,
    priceValue: priceResult?.value ?? null,
    currency: priceResult?.currency ?? null,
    imageUrl,
    productUrl: url,
    confidence,
    extractionMethod: 'patterns',
  };
}

/**
 * Decode common HTML entities in extracted strings.
 * Meta content attributes and og:title/h1 text often contain entities like &amp;, &#39;, etc.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

/**
 * Truncate description to reasonable length
 */
function truncateDescription(text: string | undefined | null): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 500 ? cleaned.slice(0, 497) + '...' : cleaned;
}
