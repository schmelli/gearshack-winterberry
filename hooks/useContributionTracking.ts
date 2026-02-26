/**
 * useContributionTracking Hook
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * Provides function to track user contributions after gear item creation.
 * Tracking is fire-and-forget (non-blocking).
 */

'use client';

import { useCallback } from 'react';
import type { TrackContributionRequest } from '@/types/contributions';

// =============================================================================
// Types
// =============================================================================

export interface ContributionTrackingParams {
  /** ID of the newly created gear item */
  gearItemId: string;
  /** Brand name (may be empty) */
  brandName: string;
  /** Product name */
  productName: string;
  /** Source URL if imported from URL */
  sourceUrl?: string;
  /** Catalog product ID if matched */
  catalogMatchId?: string | null;
  /** Match confidence score (0-1) */
  catalogMatchConfidence?: number | null;
  /** Fields that user added (not in catalog) */
  userAddedFields?: string[];
  /** Fields that user modified from catalog values */
  userModifiedFields?: string[];
}

export interface UseContributionTrackingReturn {
  /** Track a contribution (fire-and-forget) */
  trackContribution: (params: ContributionTrackingParams) => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useContributionTracking(): UseContributionTrackingReturn {
  /**
   * Track a contribution (fire-and-forget)
   * Does not block or throw errors
   */
  const trackContribution = useCallback((params: ContributionTrackingParams) => {
    // Fire and forget - don't await
    const request: TrackContributionRequest = {
      gearItemId: params.gearItemId,
      brandName: params.brandName,
      productName: params.productName,
      sourceUrl: params.sourceUrl,
      catalogMatchId: params.catalogMatchId || undefined,
      catalogMatchConfidence: params.catalogMatchConfidence || undefined,
      userAddedFields: params.userAddedFields || [],
      userModifiedFields: params.userModifiedFields || [],
    };

    fetch('/api/contributions/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).catch((error) => {
      // Silently ignore errors - tracking is non-critical
      console.warn('[ContributionTracking] Failed to track:', error);
    });
  }, []);

  return { trackContribution };
}

// =============================================================================
// Helpers for computing contributed fields
// =============================================================================

/**
 * Fields that can be tracked for contributions
 */
const TRACKABLE_FIELDS = [
  'name',
  'brand',
  'description',
  'weightValue',
  'pricePaid',
  'manufacturerPrice',
  'primaryImageUrl',
  'productTypeId',
  'size',
  'color',
  'volumeLiters',
  'materials',
] as const;

/**
 * Compute which fields the user added (not present in catalog data)
 */
export function computeAddedFields(
  formData: Record<string, unknown>,
  catalogData: Record<string, unknown> | null | undefined
): string[] {
  if (!catalogData) {
    // If no catalog data, all non-empty fields were added by user
    return TRACKABLE_FIELDS.filter((field) => {
      const value = formData[field];
      return value !== null && value !== undefined && value !== '';
    });
  }

  // Fields that user filled but catalog didn't have
  return TRACKABLE_FIELDS.filter((field) => {
    const formValue = formData[field];
    const catalogValue = catalogData[field];

    const formHasValue = formValue !== null && formValue !== undefined && formValue !== '';
    const catalogHasValue = catalogValue !== null && catalogValue !== undefined && catalogValue !== '';

    return formHasValue && !catalogHasValue;
  });
}

/**
 * Compute which fields the user modified from catalog values
 */
export function computeModifiedFields(
  formData: Record<string, unknown>,
  catalogData: Record<string, unknown> | null | undefined
): string[] {
  if (!catalogData) {
    return [];
  }

  // Fields where both have values but they differ
  return TRACKABLE_FIELDS.filter((field) => {
    const formValue = formData[field];
    const catalogValue = catalogData[field];

    const formHasValue = formValue !== null && formValue !== undefined && formValue !== '';
    const catalogHasValue = catalogValue !== null && catalogValue !== undefined && catalogValue !== '';

    if (!formHasValue || !catalogHasValue) {
      return false;
    }

    // Compare as strings for consistency
    return String(formValue) !== String(catalogValue);
  });
}
