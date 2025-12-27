/**
 * Smart Product Search Types
 *
 * Feature: XXX-smart-product-search
 *
 * Types for the smart product search feature that combines
 * GearGraph catalog search with internet fallback.
 */

import type { RateLimitInfo } from '@/app/actions/weight-search';

// =============================================================================
// Search Result Types
// =============================================================================

/** Source of a search result */
export type SearchResultSource = 'catalog' | 'internet';

/** Result from GearGraph catalog search */
export interface CatalogProductResult {
  source: 'catalog';
  /** Product ID in catalog */
  id: string;
  /** Product name */
  name: string;
  /** Brand info if available */
  brand: { id: string; name: string } | null;
  /** Main category (level 1) */
  categoryMain: string | null;
  /** Subcategory (level 2) */
  subcategory: string | null;
  /** Product type (level 3) */
  productType: string | null;
  /** Product type ID for form mapping */
  productTypeId: string | null;
  /** Product description */
  description: string | null;
  /** Weight in grams */
  weightGrams: number | null;
  /** Price in USD */
  priceUsd: number | null;
  /** Match confidence score (0-1) */
  score: number;
}

/** Result from internet search */
export interface InternetProductResult {
  source: 'internet';
  /** Page title */
  title: string;
  /** Full URL to the page */
  link: string;
  /** Search result snippet/description */
  snippet: string;
  /** Domain name (e.g., "rei.com") */
  domain: string;
  /** Thumbnail image URL if available */
  thumbnailUrl?: string;
}

/** Union type for any search result */
export type SmartSearchResult = CatalogProductResult | InternetProductResult;

// =============================================================================
// Extracted Data Types
// =============================================================================

/** Data extracted from an internet product page */
export interface ExtractedProductData {
  /** Product name */
  name: string | null;
  /** Brand name */
  brand: string | null;
  /** Product description */
  description: string | null;
  /** Weight in grams (converted from original unit) */
  weightGrams: number | null;
  /** Original weight unit found */
  weightUnit: 'g' | 'kg' | 'oz' | 'lb' | null;
  /** Price value */
  priceValue: number | null;
  /** Currency code (e.g., "USD", "EUR") */
  currency: string | null;
  /** Product image URL */
  imageUrl: string | null;
  /** Original product page URL */
  productUrl: string;
  /** Extraction confidence level */
  confidence: 'high' | 'medium' | 'low';
  /** Extraction source (schema.org, AI, or fallback patterns) */
  extractionMethod: 'schema' | 'ai' | 'patterns';
}

// =============================================================================
// Response Types
// =============================================================================

/** Response from the smart product search server action */
export interface SmartSearchResponse {
  /** Results from GearGraph catalog */
  catalogResults: CatalogProductResult[];
  /** Results from internet search (only if catalog score < 0.7) */
  internetResults: InternetProductResult[];
  /** Highest score from catalog results */
  catalogTopScore: number;
  /** Whether internet results should be displayed */
  showInternetResults: boolean;
  /** Rate limit information */
  rateLimit: RateLimitInfo;
  /** Error message if rate limited */
  rateLimitError?: string;
}

/** Response from product data extraction */
export interface ExtractProductResponse {
  /** Extracted product data */
  data: ExtractedProductData | null;
  /** Error message if extraction failed */
  error?: string;
}

// =============================================================================
// Hook State Types
// =============================================================================

/** Status of the smart search operation */
export type SmartSearchStatus =
  | 'idle'
  | 'searching'
  | 'extracting'
  | 'success'
  | 'error';

// =============================================================================
// Type Guards
// =============================================================================

/** Check if a result is from the catalog */
export function isCatalogResult(
  result: SmartSearchResult
): result is CatalogProductResult {
  return result.source === 'catalog';
}

/** Check if a result is from the internet */
export function isInternetResult(
  result: SmartSearchResult
): result is InternetProductResult {
  return result.source === 'internet';
}
