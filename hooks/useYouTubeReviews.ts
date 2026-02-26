/**
 * YouTube Reviews Hook
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T033-T035
 *
 * Client-side hook for fetching YouTube product review videos.
 * Automatically fetches when brand and name are available.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { YouTubeVideo, YouTubeSearchResponse } from '@/types/youtube';

// =============================================================================
// Types
// =============================================================================

interface UseYouTubeReviewsOptions {
  /** Product brand (optional) */
  brand?: string | null;
  /** Product name (required to trigger fetch) */
  name?: string | null;
  /** Max results (default: 5) */
  limit?: number;
  /** Whether the modal is open (fetch only when open) */
  enabled?: boolean;
}

interface UseYouTubeReviewsReturn {
  /** Array of YouTube videos */
  videos: YouTubeVideo[] | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether quota is exhausted (retry won't help until tomorrow) */
  isQuotaExhausted: boolean;
  /** Whether the response was cached */
  cached: boolean;
  /** Cache expiration date */
  expiresAt: string | null;
  /** T034a: Retry function to re-fetch */
  retry: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useYouTubeReviews({
  brand,
  name,
  limit = 5,
  enabled = true,
}: UseYouTubeReviewsOptions): UseYouTubeReviewsReturn {
  // T034: Loading, error, and data states
  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [cached, setCached] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Track last fetch params to avoid duplicate fetches (using ref to avoid re-renders)
  const lastFetchParamsRef = useRef<string | null>(null);
  // Track if currently fetching to prevent concurrent requests
  const isFetchingRef = useRef(false);

  // T033: Fetch logic for /api/youtube/search
  const fetchReviews = useCallback(async () => {
    // Skip if name is missing
    if (!name) {
      setVideos(null);
      setError(null);
      return;
    }

    const fetchKey = `${brand ?? ''}|${name}|${limit}`;

    // Skip if already fetched with same params or currently fetching
    if (fetchKey === lastFetchParamsRef.current || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (brand) params.set('brand', brand);
      params.set('name', name);
      params.set('limit', String(limit));

      const response = await fetch(`/api/youtube/search?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Unable to load reviews');
      }

      const data: YouTubeSearchResponse = await response.json();

      setVideos(data.videos);
      setCached(data.cached);
      setExpiresAt(data.expiresAt);
      lastFetchParamsRef.current = fetchKey;
    } catch (err) {
      console.error('YouTube fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unable to load reviews';
      setError(errorMessage);
      // Detect quota exhaustion from error message (retry won't help until quota resets)
      setIsQuotaExhausted(errorMessage.toLowerCase().includes('quota'));
      setVideos(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [brand, name, limit]);

  // T034a: Retry function that clears error state and re-fetches
  const retry = useCallback(() => {
    setError(null);
    setIsQuotaExhausted(false);
    lastFetchParamsRef.current = null; // Force re-fetch
    isFetchingRef.current = false;
    fetchReviews();
  }, [fetchReviews]);

  // T035: Trigger fetch when modal opens and brand+name are available
  useEffect(() => {
    if (enabled && name) {
      fetchReviews();
    }
  }, [enabled, name, brand, fetchReviews]);

  return {
    videos,
    isLoading,
    error,
    isQuotaExhausted,
    cached,
    expiresAt,
    retry,
  };
}

export default useYouTubeReviews;
