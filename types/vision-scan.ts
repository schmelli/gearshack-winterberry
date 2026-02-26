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
}

// =============================================================================
// Catalog Match Result
// =============================================================================

export interface CatalogMatchResult {
  /** Original detected item from vision */
  detected: DetectedGearItem;
  /** Best catalog product match, if found */
  catalogMatch: {
    productId: string;
    productName: string;
    brandName: string | null;
    productTypeId: string | null;
    weightGrams: number | null;
    priceUsd: number | null;
    matchScore: number;
  } | null;
}

// =============================================================================
// Vision Scan State
// =============================================================================

/** State machine: idle -> analyzing -> review -> importing -> success/error */
export type VisionScanStatus =
  | 'idle'
  | 'analyzing'
  | 'review'
  | 'importing'
  | 'success'
  | 'error';

export interface VisionScanState {
  status: VisionScanStatus;
  results: CatalogMatchResult[];
  selectedIndices: Set<number>;
  error: string | null;
  importedCount: number;
}

// =============================================================================
// API Request/Response
// =============================================================================

export interface VisionScanResponse {
  success: boolean;
  items: CatalogMatchResult[];
  error?: string;
}
