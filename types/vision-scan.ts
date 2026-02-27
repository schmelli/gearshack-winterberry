/**
 * Vision Scan Types
 *
 * Feature: Image-to-Inventory via Vision
 * Types for AI-powered gear detection from photos.
 */

// =============================================================================
// Detected Item (from AI Vision)
// =============================================================================

export interface DetectedGearItem {
  /** AI-generated name of the item */
  name: string;
  /** Detected brand, if recognizable */
  brand: string | null;
  /** Detected category (e.g., "Backpack", "Tent", "Sleeping Bag") */
  category: string;
  /** Estimated weight in grams, if recognizable */
  estimatedWeightGrams: number | null;
  /** Estimated condition */
  condition: 'new' | 'good' | 'fair' | 'poor' | null;
  /** AI confidence score (0.0 - 1.0) */
  confidence: number;
  /**
   * Server-resolved level-3 category ID from the `categories` table.
   * Set by the API route via `resolveProductTypeId()` when no catalog match
   * provides a `productTypeId`. Used as fallback during inventory import.
   */
  resolvedProductTypeId?: string | null;
}

// =============================================================================
// Single Catalog Match
// =============================================================================

export interface CatalogMatch {
  productId: string;
  productName: string;
  brandName: string | null;
  productTypeId: string | null;
  weightGrams: number | null;
  priceUsd: number | null;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  matchScore: number;
}

// =============================================================================
// Catalog Match Result (with alternatives)
// =============================================================================

export interface CatalogMatchResult {
  /** Original detected item from vision */
  detected: DetectedGearItem;
  /** Best catalog product match, if found */
  catalogMatch: CatalogMatch | null;
  /** Alternative catalog matches for disambiguation (sorted by score desc) */
  alternatives: CatalogMatch[];
}

// =============================================================================
// Vision Scan State
// =============================================================================

/** State machine: idle -> analyzing -> review -> selecting -> importing -> success/error */
export type VisionScanStatus =
  | 'idle'
  | 'analyzing'
  | 'review'
  | 'selecting'
  | 'importing'
  | 'success'
  | 'error';

/** Destination for imported items */
export type VisionScanDestination = 'inventory' | 'wishlist';

export interface VisionScanState {
  status: VisionScanStatus;
  results: CatalogMatchResult[];
  selectedIndices: Set<number>;
  error: string | null;
  importedCount: number;
  /** Index of item currently being disambiguated (choosing from alternatives) */
  disambiguatingIndex: number | null;
  /** Object URL for the uploaded image preview (revoked on reset) */
  previewUrl: string | null;
}

// =============================================================================
// API Request/Response
// =============================================================================

export interface VisionScanResponse {
  success: boolean;
  items: CatalogMatchResult[];
  error?: string;
}
