/**
 * Gear Insights Hook
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T051-T053
 *
 * Client-side hook for fetching GearGraph insights.
 * Automatically fetches when productTypeId or categoryId is available.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GearInsight, GearInsightsResponse } from '@/types/geargraph';

// =============================================================================
// Types
// =============================================================================

interface UseGearInsightsOptions {
  /** Product type ID from taxonomy */
  productTypeId?: string | null;
  /** Category ID from taxonomy */
  categoryId?: string | null;
  /** Product brand (for fuzzy matching) */
  brand?: string | null;
  /** Product name (for fuzzy matching) */
  name?: string | null;
  /** Whether the modal is open (fetch only when open) */
  enabled?: boolean;
}

interface UseGearInsightsReturn {
  /** Array of gear insights (visible, not dismissed) */
  insights: GearInsight[] | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether the response was cached */
  cached: boolean;
  /** Cache expiration date */
  expiresAt: string | null;
  /** Dismiss an insight (thumbs down) - will be replaced by reserve if available */
  dismissInsight: (content: string) => void;
}

// =============================================================================
// Hook
// =============================================================================

/** Number of insights to display to user */
const VISIBLE_INSIGHT_COUNT = 3;

export function useGearInsights({
  productTypeId,
  categoryId,
  brand,
  name,
  enabled = true,
}: UseGearInsightsOptions): UseGearInsightsReturn {
  // T052: Loading, error, and data states
  const [allInsights, setAllInsights] = useState<GearInsight[] | null>(null);
  const [dismissedContents, setDismissedContents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Track last fetch params to avoid duplicate fetches
  const [lastFetchParams, setLastFetchParams] = useState<string | null>(null);

  // Check if we have enough params to fetch
  const canFetch = !!(productTypeId || categoryId || (brand && name));

  // T051: Fetch logic for /api/geargraph/insights
  const fetchInsights = useCallback(async () => {
    // Skip if no identifiers available
    if (!canFetch) {
      setAllInsights(null);
      setError(null);
      return;
    }

    const fetchKey = `${productTypeId ?? ''}|${categoryId ?? ''}|${brand ?? ''}|${name ?? ''}`;

    // Skip if already fetched with same params
    if (fetchKey === lastFetchParams && allInsights !== null) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (productTypeId) params.set('productTypeId', productTypeId);
      if (categoryId) params.set('categoryId', categoryId);
      if (brand) params.set('brand', brand);
      if (name) params.set('name', name);

      const response = await fetch(`/api/geargraph/insights?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Insights temporarily unavailable');
      }

      const data: GearInsightsResponse = await response.json();

      // Store all fetched insights (API returns up to 6, we show 3)
      setAllInsights(data.insights);
      setCached(data.cached);
      setExpiresAt(data.expiresAt);
      setLastFetchParams(fetchKey);
      // Reset dismissed when fetching new data
      setDismissedContents(new Set());
    } catch (err) {
      console.error('GearGraph fetch error:', err);
      setError(err instanceof Error ? err.message : 'Insights temporarily unavailable');
      setAllInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, [productTypeId, categoryId, brand, name, canFetch, lastFetchParams, allInsights]);

  // T053: Trigger fetch when modal opens with productTypeId or categoryId
  useEffect(() => {
    if (enabled && canFetch) {
      fetchInsights();
    }
  }, [enabled, canFetch, fetchInsights]);

  // Dismiss an insight - removes it and shows replacement from reserve
  const dismissInsight = useCallback((content: string) => {
    const normalizedContent = content.toLowerCase().trim();
    setDismissedContents((prev) => new Set([...prev, normalizedContent]));
  }, []);

  // Compute visible insights: filter out dismissed, take first N
  const visibleInsights = allInsights
    ? allInsights
        .filter((insight) => !dismissedContents.has(insight.content.toLowerCase().trim()))
        .slice(0, VISIBLE_INSIGHT_COUNT)
    : null;

  return {
    insights: visibleInsights,
    isLoading,
    error,
    cached,
    expiresAt,
    dismissInsight,
  };
}

export default useGearInsights;
