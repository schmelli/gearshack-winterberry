/**
 * Contributions Types
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * TypeScript interfaces for user contributions tracking and admin analytics.
 */

// =============================================================================
// Database Row Types
// =============================================================================

/**
 * User contribution record (anonymous)
 */
export interface UserContribution {
  id: string;
  contributorHash: string;
  contributorCountryCode: string | null;
  gearItemId: string | null;
  brandName: string;
  productName: string;
  sourceUrl: string | null;
  geargraphMatched: boolean;
  matchedCatalogProductId: string | null;
  matchedConfidence: number | null;
  userAddedFields: Record<string, boolean>;
  userModifiedFields: Record<string, boolean>;
  createdAt: string;
}

/**
 * Database row format (snake_case)
 */
export interface UserContributionRow {
  id: string;
  contributor_hash: string;
  contributor_country_code: string | null;
  gear_item_id: string | null;
  brand_name: string;
  product_name: string;
  source_url: string | null;
  geargraph_matched: boolean;
  matched_catalog_product_id: string | null;
  matched_confidence: number | null;
  user_added_fields: Record<string, boolean>;
  user_modified_fields: Record<string, boolean>;
  created_at: string;
}

/**
 * Missing brand log entry
 */
export interface MissingBrand {
  id: string;
  brandName: string;
  brandNameNormalized: string;
  sourceUrls: string[];
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  countriesSeen: string[];
  status: MissingBrandStatus;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  mergedIntoBrandId: string | null;
}

/**
 * Database row format (snake_case)
 */
export interface MissingBrandRow {
  id: string;
  brand_name: string;
  brand_name_normalized: string;
  source_urls: string[];
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  countries_seen: string[];
  status: MissingBrandStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  merged_into_brand_id: string | null;
}

export type MissingBrandStatus = 'pending' | 'added_to_catalog' | 'rejected' | 'merged';

// =============================================================================
// API Types
// =============================================================================

/**
 * Request to track a contribution
 */
export interface TrackContributionRequest {
  gearItemId: string;
  brandName: string;
  productName: string;
  sourceUrl?: string;
  catalogMatchId?: string;
  catalogMatchConfidence?: number;
  userAddedFields: string[];
  userModifiedFields: string[];
}

/**
 * Contribution statistics for admin dashboard
 */
export interface ContributionStats {
  // Overview
  totalContributions: number;
  totalContributions7d: number;
  totalContributions30d: number;
  uniqueContributors: number;

  // GearGraph matching
  matchedCount: number;
  unmatchedCount: number;
  matchRate: number;

  // Geographic distribution
  countryDistribution: CountryDistributionItem[];

  // Missing brands
  missingBrandsCount: number;
  topMissingBrands: TopMissingBrand[];

  // Data quality gaps
  frequentlyAddedFields: FieldFrequency[];
  frequentlyModifiedFields: FieldFrequency[];
}

export interface CountryDistributionItem {
  countryCode: string;
  count: number;
  percentage: number;
}

export interface TopMissingBrand {
  brandName: string;
  count: number;
  firstSeen: string;
  countriesSeen: string[];
}

export interface FieldFrequency {
  field: string;
  count: number;
  percentage: number;
}

/**
 * Paginated response for missing brands list
 */
export interface MissingBrandsResponse {
  brands: MissingBrand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// URL Import Types
// =============================================================================

/**
 * Request to import product data from URL
 */
export interface ImportUrlRequest {
  url: string;
}

/**
 * Response from URL import
 */
export interface ImportUrlResponse {
  success: boolean;
  data?: ImportedProductData;
  error?: string;
}

/**
 * Product data extracted from URL + catalog match
 */
export interface ImportedProductData {
  // Extracted data
  name: string | null;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  weightGrams: number | null;
  weightUnit: 'g' | 'kg' | 'oz' | 'lb' | null;
  priceValue: number | null;
  currency: string | null;
  productUrl: string;
  extractionConfidence: 'high' | 'medium' | 'low';
  extractionMethod: 'schema' | 'patterns' | 'ai';

  // GearGraph matching
  catalogMatch: CatalogMatchResult | null;
}

/**
 * Result from GearGraph catalog matching
 */
export interface CatalogMatchResult {
  id: string;
  name: string;
  brand: string | null;
  categoryMain: string | null;
  subcategory: string | null;
  productType: string | null;
  productTypeId: string | null;
  description: string | null;
  weightGrams: number | null;
  priceUsd: number | null;
  matchScore: number;
}

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * Transform database row to UserContribution
 */
export function transformContribution(row: UserContributionRow): UserContribution {
  return {
    id: row.id,
    contributorHash: row.contributor_hash,
    contributorCountryCode: row.contributor_country_code,
    gearItemId: row.gear_item_id,
    brandName: row.brand_name,
    productName: row.product_name,
    sourceUrl: row.source_url,
    geargraphMatched: row.geargraph_matched,
    matchedCatalogProductId: row.matched_catalog_product_id,
    matchedConfidence: row.matched_confidence,
    userAddedFields: row.user_added_fields || {},
    userModifiedFields: row.user_modified_fields || {},
    createdAt: row.created_at,
  };
}

/**
 * Transform database row to MissingBrand
 */
export function transformMissingBrand(row: MissingBrandRow): MissingBrand {
  return {
    id: row.id,
    brandName: row.brand_name,
    brandNameNormalized: row.brand_name_normalized,
    sourceUrls: row.source_urls || [],
    occurrenceCount: row.occurrence_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    countriesSeen: row.countries_seen || [],
    status: row.status,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    resolutionNote: row.resolution_note,
    mergedIntoBrandId: row.merged_into_brand_id,
  };
}
