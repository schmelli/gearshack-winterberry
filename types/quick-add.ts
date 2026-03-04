/**
 * Quick Add Types
 *
 * Feature: 054-zero-friction-input
 *
 * Types for the zero-friction gear input flow.
 * Single input field (text, URL, or image) → AI extraction → auto-save or quick-edit.
 */

import type { GearCondition } from '@/types/gear';

// =============================================================================
// State Machine
// =============================================================================

/** Status machine for the quick-add flow */
export type QuickAddStatus =
  | 'idle'
  | 'extracting'
  | 'reviewing'
  | 'saving'
  | 'success'
  | 'error';

/** Detected input type */
export type QuickAddInputType = 'url' | 'image' | 'text';

// =============================================================================
// Extraction Result
// =============================================================================

/** Normalized extraction result from any pipeline (URL, image, or text) */
export interface QuickAddExtraction {
  /** Detected input type */
  inputType: QuickAddInputType;
  /**
   * Overall confidence 0–1 (clamped via `clampConfidence()`).
   * Values >= AUTO_SAVE_CONFIDENCE (0.75) trigger auto-save (skip quick-edit).
   */
  confidence: number;

  // Core gear fields (nullable – partial extraction is expected)
  name: string | null;
  brand: string | null;
  description: string | null;
  /**
   * UUID of the resolved product type (level-3 category).
   * Populated from catalog match or category resolver.
   * When set, `categoryLabel` holds the human-readable path for display.
   */
  productTypeId: string | null;
  /** Human-readable category path (e.g. "Backpacks > Daypacks"). Display-only. */
  categoryLabel: string | null;
  weightGrams: number | null;
  condition: GearCondition | null;
  primaryImageUrl: string | null;
  productUrl: string | null;
  /**
   * Price paid for the item.
   * Co-dependency: when `pricePaid` is set, `currency` should also be set
   * (defaults to 'EUR' in the form). A `pricePaid` without `currency` is
   * treated as EUR by downstream consumers.
   */
  pricePaid: number | null;
  /** ISO 4217 currency code (e.g. 'EUR', 'USD'). See `pricePaid` for co-dependency. */
  currency: string | null;
}

// =============================================================================
// Overrides (user-editable fields for the review sheet)
// =============================================================================

/**
 * Subset of QuickAddExtraction fields that the user can edit in the review sheet.
 * Excludes computed/internal fields like `inputType`, `confidence`, `primaryImageUrl`.
 */
export type QuickAddOverrides = Partial<Pick<QuickAddExtraction,
  | 'name'
  | 'brand'
  | 'description'
  | 'weightGrams'
  | 'condition'
  | 'productTypeId'
  | 'categoryLabel'
  | 'pricePaid'
  | 'currency'
>>;

// =============================================================================
// API Response
// =============================================================================

/**
 * Response from POST /api/gear/extract-text.
 *
 * Discriminated union on `success`:
 * - `success: true`  → `data` is always present.
 * - `success: false` → `error` is always present.
 */
export type TextExtractResponse =
  | { success: true; data: QuickAddExtraction }
  | { success: false; error: string };

// =============================================================================
// Constants
// =============================================================================

/** Confidence threshold for auto-save (skip quick-edit) */
export const AUTO_SAVE_CONFIDENCE = 0.75;

/** Clamp a confidence value to the valid [0, 1] range */
export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Accepted image MIME types for quick-add */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Max image file size in bytes (10 MB) */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
