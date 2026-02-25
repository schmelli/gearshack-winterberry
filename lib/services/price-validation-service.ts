/**
 * Price validation and product matching service
 * Feature: 050-price-tracking (Enhancement for Issue #79)
 * Date: 2025-12-22
 *
 * Provides smart product matching and price validation to avoid:
 * - Accessories sold under product names (e.g., ground sheets vs actual tent)
 * - eBay naming tricks ("NOT Zpacks, NOT Hilleberg...")
 * - False positives from price outliers
 */

import { fuzzyProductSearch } from '@/lib/supabase/catalog';
import type { PriceResult } from '@/types/price-tracking';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProductPriceReference {
  catalogProductId: string;
  catalogProductName: string;
  brandName: string | null;
  expectedPriceUsd: number | null;
  categoryMain: string | null;
  productType: string | null;
}

// Validation thresholds and penalties
const VALIDATION_THRESHOLDS = {
  MIN_MATCH_SCORE: 0.3,
  MIN_CONFIDENCE: 0.3,
  SUSPICIOUSLY_CHEAP_PERCENT: 70,
  VERY_CHEAP_PERCENT: 50,
  UNUSUALLY_EXPENSIVE_PERCENT: -100,
  CONFIDENCE_SORT_THRESHOLD: 0.1,
} as const;

const CONFIDENCE_PENALTIES = {
  SPAM_BRAND_MENTIONS: 0.1,
  BRAND_MISMATCH: 0.3,
  SUSPICIOUSLY_CHEAP: 0.2,
  VERY_CHEAP: 0.5,
  UNUSUALLY_EXPENSIVE: 0.6,
  POSSIBLE_ACCESSORY: 0.4,
  PRODUCT_TYPE_MISMATCH: 0.5,
} as const;

/**
 * Look up reference price from catalog based on gear item brand and name
 */
export async function getCatalogPriceReference(
  supabase: SupabaseClient,
  itemName: string,
  brandName: string | null
): Promise<ProductPriceReference | null> {

  try {
    // First try exact brand match if brand is provided
    const searchOptions = brandName
      ? { limit: 5 }
      : { limit: 10 };

    const results = await fuzzyProductSearch(supabase, itemName, searchOptions);

    if (!results || results.length === 0) {
      return null;
    }

    // If brand provided, prioritize brand matches
    let bestMatch = results[0];
    if (brandName) {
      const brandMatch = results.find(r =>
        r.brand?.name.toLowerCase().includes(brandName.toLowerCase()) ||
        brandName.toLowerCase().includes(r.brand?.name.toLowerCase() || '')
      );
      if (brandMatch) {
        bestMatch = brandMatch;
      }
    }

    // Only use if we have a price and decent match score
    if (!bestMatch.priceUsd || bestMatch.score < VALIDATION_THRESHOLDS.MIN_MATCH_SCORE) {
      return null;
    }

    return {
      catalogProductId: bestMatch.id,
      catalogProductName: bestMatch.name,
      brandName: bestMatch.brand?.name || null,
      expectedPriceUsd: bestMatch.priceUsd,
      categoryMain: bestMatch.categoryMain,
      productType: bestMatch.productType,
    };
  } catch (error) {
    console.error('Error fetching catalog price reference:', error);
    return null;
  }
}

/**
 * Validate if a price result is reasonable based on catalog reference
 * Returns validation status and flags
 */
export interface PriceValidationResult {
  isValid: boolean;
  flags: string[];
  confidence: number; // 0-1
}

export function validatePriceResult(
  result: PriceResult,
  reference: ProductPriceReference | null,
  itemBrand: string | null
): PriceValidationResult {
  const flags: string[] = [];
  let confidence = 1.0;

  // Check 1: Spam brand mentions (e.g., "NOT Zpacks, NOT Hilleberg")
  if (hasSpamBrandMentions(result.product_name)) {
    flags.push('spam_brand_mentions');
    confidence *= CONFIDENCE_PENALTIES.SPAM_BRAND_MENTIONS;
  }

  // Check 2: Brand validation - if we know the brand, it should appear in title
  if (itemBrand && !titleContainsBrand(result.product_name, itemBrand)) {
    flags.push('brand_mismatch');
    confidence *= CONFIDENCE_PENALTIES.BRAND_MISMATCH;
  }

  // Check 3: Price range validation against catalog reference
  // Guard against division by zero and invalid values
  if (reference?.expectedPriceUsd &&
      Number.isFinite(reference.expectedPriceUsd) &&
      reference.expectedPriceUsd > 0) {
    const priceDiff = reference.expectedPriceUsd - result.total_price;
    const priceDiffPercent = (priceDiff / reference.expectedPriceUsd) * 100;

    // Suspiciously cheap (>70% below expected price) - likely accessory or fake
    if (priceDiffPercent > VALIDATION_THRESHOLDS.SUSPICIOUSLY_CHEAP_PERCENT) {
      flags.push('suspiciously_cheap');
      confidence *= CONFIDENCE_PENALTIES.SUSPICIOUSLY_CHEAP;
    }
    // Very cheap (50-70% below) - possible accessory or deeply discounted
    else if (priceDiffPercent > VALIDATION_THRESHOLDS.VERY_CHEAP_PERCENT) {
      flags.push('very_cheap');
      confidence *= CONFIDENCE_PENALTIES.VERY_CHEAP;
    }
    // Unusually expensive (>100% above) - might be bundle or wrong product
    else if (priceDiffPercent < VALIDATION_THRESHOLDS.UNUSUALLY_EXPENSIVE_PERCENT) {
      flags.push('unusually_expensive');
      confidence *= CONFIDENCE_PENALTIES.UNUSUALLY_EXPENSIVE;
    }
  }

  // Check 4: Accessory keywords detection
  if (hasAccessoryKeywords(result.product_name)) {
    flags.push('possible_accessory');
    confidence *= CONFIDENCE_PENALTIES.POSSIBLE_ACCESSORY;
  }

  // Check 5: Product type mismatch (if we have catalog info)
  if (reference?.productType && hasProductTypeMismatch(result.product_name, reference.productType)) {
    flags.push('product_type_mismatch');
    confidence *= CONFIDENCE_PENALTIES.PRODUCT_TYPE_MISMATCH;
  }

  const isValid = confidence >= VALIDATION_THRESHOLDS.MIN_CONFIDENCE && !flags.includes('spam_brand_mentions');

  return {
    isValid,
    flags,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Detect spam brand mentions like "NOT Zpacks, NOT Hilleberg"
 */
function hasSpamBrandMentions(title: string): boolean {
  const titleLower = title.toLowerCase();

  // Pattern: "NOT [Brand]" or "not [Brand]" appears multiple times
  const notPattern = /\b(not|no|kein)\s+[a-z]+/gi;
  const matches = titleLower.match(notPattern);

  // If "NOT" appears 2+ times, likely spam
  if (matches && matches.length >= 2) {
    return true;
  }

  // Pattern: Listing mentions multiple competing brands
  const brandKeywords = [
    'zpacks', 'hilleberg', 'msr', 'nemo', 'big agnes',
    'arcteryx', 'patagonia', 'montane', 'rab',
    'osprey', 'gregory', 'deuter', 'black diamond'
  ];

  let brandCount = 0;
  for (const brand of brandKeywords) {
    if (titleLower.includes(brand)) {
      brandCount++;
    }
  }

  // If 3+ brands mentioned, likely spam listing
  return brandCount >= 3;
}

/**
 * Check if title contains the expected brand name
 */
function titleContainsBrand(title: string, brand: string): boolean {
  const titleLower = title.toLowerCase();
  const brandLower = brand.toLowerCase();

  // Direct match
  if (titleLower.includes(brandLower)) {
    return true;
  }

  // Check for common brand abbreviations
  const brandAbbreviations: Record<string, string[]> = {
    'zpacks': ['zpacks', 'z-packs'],
    'arcteryx': ['arcteryx', "arc'teryx", 'arc teryx', 'arc'],
    'black diamond': ['black diamond', 'bd'],
    'msr': ['msr', 'mountain safety research'],
    'big agnes': ['big agnes', 'ba'],
  };

  const abbreviations = brandAbbreviations[brandLower] || [];
  return abbreviations.some(abbrev => titleLower.includes(abbrev));
}

/**
 * Detect accessory keywords that indicate this isn't the main product
 */
function hasAccessoryKeywords(title: string): boolean {
  const titleLower = title.toLowerCase();

  const accessoryKeywords = [
    'footprint', 'ground sheet', 'groundsheet', 'tarp',
    'stuff sack', 'compression sack', 'storage bag',
    'replacement', 'spare', 'repair kit',
    'stakes', 'guy lines', 'guylines',
    'pole', 'poles only', 'rain fly', 'rainfly',
    'instruction', 'manual', 'guide',
    'similar to', 'compatible with', 'fits',
    'accessory', 'accessories', 'add-on',
  ];

  return accessoryKeywords.some(keyword => titleLower.includes(keyword));
}

/**
 * Check if product title suggests type mismatch
 * (e.g., searching for tent but finding sleeping bag)
 */
function hasProductTypeMismatch(title: string, expectedType: string): boolean {
  const titleLower = title.toLowerCase();
  const expectedLower = expectedType.toLowerCase();

  // Define product type keywords
  const typeKeywords: Record<string, string[]> = {
    'tent': ['tent', 'shelter'],
    'sleeping bag': ['sleeping bag', 'quilt', 'sleep system'],
    'backpack': ['backpack', 'pack', 'rucksack'],
    'jacket': ['jacket', 'coat', 'shell'],
    'sleeping pad': ['sleeping pad', 'mat', 'mattress'],
  };

  // Get expected keywords for the product type
  const expectedKeywords = typeKeywords[expectedLower] || [expectedLower];

  // If none of the expected keywords appear, might be mismatch
  const hasExpectedKeyword = expectedKeywords.some(kw => titleLower.includes(kw));

  return !hasExpectedKeyword;
}

/**
 * Filter and rank price results using validation
 */
export function filterAndRankResults(
  results: PriceResult[],
  reference: ProductPriceReference | null,
  itemBrand: string | null
): PriceResult[] {
  // Validate each result
  const validatedResults = results.map(result => {
    const validation = validatePriceResult(result, reference, itemBrand);
    return {
      result,
      validation,
    };
  });

  // Filter to only valid results
  const validResults = validatedResults.filter(v => v.validation.isValid);

  // Sort by confidence (descending) then by price (ascending)
  validResults.sort((a, b) => {
    const confidenceDiff = b.validation.confidence - a.validation.confidence;
    if (Math.abs(confidenceDiff) > VALIDATION_THRESHOLDS.CONFIDENCE_SORT_THRESHOLD) {
      return confidenceDiff;
    }
    return a.result.total_price - b.result.total_price;
  });

  // Return results with validation metadata
  return validResults.map(v => ({
    ...v.result,
    validation_confidence: v.validation.confidence,
    validation_flags: v.validation.flags,
  }));
}
