/**
 * Banner Carousel Hook
 *
 * Feature: 056-community-hub-enhancements
 * Task: T027
 *
 * Fetches active banners for display in the community page carousel.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchActiveBanners } from '@/lib/supabase/banner-queries';
import type { CommunityBanner } from '@/types/banner';

// ============================================================================
// Types
// ============================================================================

type LoadingState = 'idle' | 'loading' | 'error';

interface UseBannerCarouselReturn {
  banners: CommunityBanner[];
  loadingState: LoadingState;
  error: string | null;
  hasBanners: boolean;
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useBannerCarousel(): UseBannerCarouselReturn {
  const supabase = useMemo(() => createClient(), []);

  const [banners, setBanners] = useState<CommunityBanner[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [error, setError] = useState<string | null>(null);

  const loadBanners = useCallback(async () => {
    setLoadingState('loading');
    setError(null);

    try {
      const result = await fetchActiveBanners(supabase);
      setBanners(result.banners);
      setLoadingState('idle');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load banners';
      setError(message);
      setLoadingState('error');
      // Don't throw - banners are optional, page should still work
      console.error('Failed to load banners:', err);
    }
  }, [supabase]);

  // Load banners on mount
  useEffect(() => {
    // Data fetching in useEffect is a valid pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBanners();
  }, [loadBanners]);

  return {
    banners,
    loadingState,
    error,
    hasBanners: banners.length > 0,
    refresh: loadBanners,
  };
}
