/**
 * useAlternativeImages Hook
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Lazy-loads product images for catalog alternatives via /api/vision/product-image.
 * Fetches sequentially (not in parallel) to respect Serper API rate limits.
 *
 * Extracted from the component layer to comply with Feature-Sliced Light:
 * all data fetching and state management belongs in hooks, not UI components.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { CatalogMatch } from '@/types/vision-scan';

/**
 * Lazy-load product images for catalog alternatives.
 *
 * @param options - Array of CatalogMatch items to fetch images for.
 *   Pass an empty array when disambiguation is not active.
 * @returns A map of productId → imageUrl (or null if fetch failed/pending).
 */
export function useAlternativeImages(
  options: CatalogMatch[]
): Record<string, string | null> {
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({});

  // Stable key to track when the set of products changes
  const optionIds = useMemo(
    () => options.map((o) => o.productId).join(','),
    [options]
  );

  useEffect(() => {
    let cancelled = false;

    // Only fetch images for options that don't already have one
    const toFetch = options.filter(
      (o) => o.imageUrl === null && !(o.productId in imageMap)
    );

    if (toFetch.length === 0) return;

    // Fetch sequentially to avoid hammering Serper (max ~5 alternatives)
    const fetchImages = async () => {
      const newMap: Record<string, string | null> = {};

      for (const option of toFetch) {
        if (cancelled) break;
        try {
          const res = await fetch('/api/vision/product-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand: option.brandName,
              productName: option.productName,
            }),
          });

          let imageUrl: string | null = null;
          if (res.ok) {
            try {
              const data: unknown = await res.json();
              // Runtime validation instead of unsafe `as string` cast
              if (
                data !== null &&
                typeof data === 'object' &&
                'imageUrl' in data &&
                typeof (data as Record<string, unknown>).imageUrl === 'string'
              ) {
                imageUrl = (data as Record<string, unknown>).imageUrl as string;
              }
            } catch {
              // JSON parse error — imageUrl stays null
            }
          }
          newMap[option.productId] = imageUrl;
        } catch {
          // Network error or other failure — store null so spinner resolves
          // to placeholder instead of spinning forever
          newMap[option.productId] = null;
        }
      }

      if (!cancelled) {
        setImageMap((prev) => ({ ...prev, ...newMap }));
      }
    };

    void fetchImages();

    return () => {
      cancelled = true;
    };
    // Re-run when the set of option productIds changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionIds]);

  return imageMap;
}
