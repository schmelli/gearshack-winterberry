/**
 * eBay Search Result Filter
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Filter out accessories, knockoffs, and irrelevant listings
 */

import type { EbayListing, EbayFilterPatterns } from '@/types/ebay';
import { DEFAULT_FILTER_PATTERNS } from '@/types/ebay';

// =============================================================================
// Filter Functions
// =============================================================================

/**
 * Bundle context indicators - if accessory keyword appears after these,
 * it's likely part of a bundle, not a standalone accessory listing
 */
const BUNDLE_INDICATORS = [
  'mit',
  'inkl',
  'inkl.',
  'inklusive',
  'including',
  'includes',
  'with',
  'plus',
  '+',
  '&',
  'und',
  'and',
  'set',
  'bundle',
  'kit',
  'combo',
  'package',
];

/**
 * Check if accessory keyword appears in a bundle context
 * e.g., "Zelt mit Footprint" = bundle (allow)
 * e.g., "Footprint für MSR Hubba" = accessory (block)
 */
function isInBundleContext(title: string, accessoryKeyword: string): boolean {
  const lowerTitle = title.toLowerCase();
  const lowerKeyword = accessoryKeyword.toLowerCase();
  const keywordIndex = lowerTitle.indexOf(lowerKeyword);

  if (keywordIndex === -1) return false;

  // Check if any bundle indicator appears before the accessory keyword
  // with some reasonable distance (within 20 chars before)
  const textBefore = lowerTitle.substring(Math.max(0, keywordIndex - 20), keywordIndex);

  return BUNDLE_INDICATORS.some((indicator) => {
    const indicatorLower = indicator.toLowerCase();
    // Check if indicator is present and is a word boundary (not part of another word)
    const indicatorIndex = textBefore.lastIndexOf(indicatorLower);
    if (indicatorIndex === -1) return false;

    // Verify it's a word boundary (space or start before, space or end after)
    const charBefore = indicatorIndex === 0 ? ' ' : textBefore[indicatorIndex - 1];
    const charAfter = textBefore[indicatorIndex + indicatorLower.length] || ' ';

    return /\s/.test(charBefore) && /[\s,]/.test(charAfter);
  });
}

/**
 * Check if a listing title contains accessory keywords
 * Now with bundle-context awareness - allows accessories when part of a bundle
 */
function isAccessory(title: string, patterns: string[]): boolean {
  const lowerTitle = title.toLowerCase();

  for (const pattern of patterns) {
    if (lowerTitle.includes(pattern.toLowerCase())) {
      // Check if this is in a bundle context
      if (isInBundleContext(title, pattern)) {
        // It's a bundle, not a standalone accessory - allow it
        continue;
      }
      // Standalone accessory mention - block it
      return true;
    }
  }

  return false;
}

/**
 * Check if a listing title contains knockoff indicator patterns
 */
function isKnockoff(title: string, patterns: string[]): boolean {
  const lowerTitle = title.toLowerCase();
  return patterns.some((pattern) => lowerTitle.includes(pattern.toLowerCase()));
}

/**
 * Check if price is suspiciously low (likely knockoff)
 * Items below 30% of MSRP are flagged as potential knockoffs
 */
function isPriceTooLow(price: number, msrp: number | undefined, minRatio: number): boolean {
  if (!msrp || msrp <= 0) return false;
  return price / msrp < minRatio;
}

/**
 * Check if listing title contains the brand name
 */
function containsBrand(title: string, brand: string | undefined): boolean {
  if (!brand) return true; // No brand to match = always pass
  return title.toLowerCase().includes(brand.toLowerCase());
}

/**
 * Check if listing title contains at least one product type keyword
 */
function containsProductType(title: string, keywords: string[] | undefined): boolean {
  if (!keywords || keywords.length === 0) return true; // No keywords = always pass
  const lowerTitle = title.toLowerCase();
  return keywords.some((keyword) => lowerTitle.includes(keyword.toLowerCase()));
}

/**
 * Calculate similarity score between two strings (Jaccard similarity)
 * Returns a value between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(Boolean));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(Boolean));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((word) => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// =============================================================================
// Main Filter Function
// =============================================================================

export interface FilterEbayListingsOptions {
  /** Brand name to require in listing */
  brand?: string;
  /** Product type keywords to require at least one of */
  productTypeKeywords?: string[];
  /** MSRP for knockoff price detection */
  msrp?: number;
  /** Custom filter patterns (defaults to DEFAULT_FILTER_PATTERNS) */
  patterns?: EbayFilterPatterns;
  /** Item name for similarity matching */
  itemName?: string;
  /** Minimum similarity score to include (0-1, default: 0.3) */
  minSimilarity?: number;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * Filter eBay listings to remove accessories, knockoffs, and irrelevant items
 *
 * Filtering rules:
 * 1. EXCLUDE: Accessory keywords (footprint, stuff sack, repair kit, etc.)
 * 2. EXCLUDE: Knockoff indicators (replica, fake, imitation, etc.)
 * 3. EXCLUDE: Price < 30% of MSRP (likely knockoff)
 * 4. INCLUDE ONLY IF: Contains brand name AND product type keyword
 *    OR similarity score > threshold with item name
 *
 * @param listings - Raw eBay listings to filter
 * @param options - Filter options
 * @returns Filtered listings sorted by relevance
 */
export function filterEbayListings(
  listings: EbayListing[],
  options: FilterEbayListingsOptions = {}
): EbayListing[] {
  // Input validation
  if (!Array.isArray(listings)) {
    console.error('[filterEbayListings] Invalid input: listings must be an array');
    return [];
  }

  const {
    brand,
    productTypeKeywords,
    msrp,
    patterns = DEFAULT_FILTER_PATTERNS,
    itemName,
    minSimilarity = 0.3,
    limit,
  } = options;

  const filtered = listings.filter((listing) => {
    const title = listing.title;

    // EXCLUDE: Accessory keywords
    if (isAccessory(title, patterns.accessories)) {
      return false;
    }

    // EXCLUDE: Knockoff indicators
    if (isKnockoff(title, patterns.knockoffs)) {
      return false;
    }

    // EXCLUDE: Price too low (likely knockoff)
    if (isPriceTooLow(listing.price, msrp, patterns.minPriceRatio)) {
      return false;
    }

    // INCLUDE CHECK: Must match brand + product type, or have high similarity
    const hasBrand = containsBrand(title, brand);
    const hasProductType = containsProductType(title, productTypeKeywords);

    // If we have brand + product type match, include
    if (hasBrand && hasProductType) {
      return true;
    }

    // Otherwise, check similarity score
    if (itemName) {
      const similarity = calculateSimilarity(title, itemName);
      return similarity >= minSimilarity;
    }

    // If no itemName for similarity check, require brand + product type
    return hasBrand && hasProductType;
  });

  // Sort by relevance (similarity to item name if available, then price)
  const sorted = filtered.sort((a, b) => {
    if (itemName) {
      const simA = calculateSimilarity(a.title, itemName);
      const simB = calculateSimilarity(b.title, itemName);
      if (simA !== simB) return simB - simA; // Higher similarity first
    }
    return a.price - b.price; // Lower price first
  });

  // Apply limit if specified
  return limit ? sorted.slice(0, limit) : sorted;
}

// =============================================================================
// Utility Exports
// =============================================================================

export {
  isAccessory,
  isInBundleContext,
  isKnockoff,
  isPriceTooLow,
  containsBrand,
  containsProductType,
  calculateSimilarity,
};
