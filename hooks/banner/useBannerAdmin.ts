/**
 * Banner Admin Hook
 *
 * Feature: 056-community-hub-enhancements
 * Task: T028
 *
 * Admin CRUD operations for community banners.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '@/lib/supabase/banner-queries';
import type {
  CommunityBanner,
  CommunityBannerWithStatus,
  CreateBannerInput,
  UpdateBannerInput,
} from '@/types/banner';
import { computeBannerStatus } from '@/types/banner';

// ============================================================================
// Types
// ============================================================================

type LoadingState = 'idle' | 'loading' | 'submitting' | 'deleting' | 'error';

interface UseBannerAdminReturn {
  banners: CommunityBannerWithStatus[];
  loadingState: LoadingState;
  error: string | null;

  // Actions
  loadBanners: () => Promise<void>;
  createNewBanner: (input: CreateBannerInput) => Promise<CommunityBanner>;
  updateExistingBanner: (
    id: string,
    input: UpdateBannerInput
  ) => Promise<CommunityBanner>;
  deleteExistingBanner: (id: string) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useBannerAdmin(): UseBannerAdminReturn {
  const supabase = useMemo(() => createClient(), []);

  const [banners, setBanners] = useState<CommunityBannerWithStatus[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [error, setError] = useState<string | null>(null);

  /**
   * Transform banners to include computed status
   */
  const transformWithStatus = useCallback(
    (rawBanners: CommunityBanner[]): CommunityBannerWithStatus[] => {
      return rawBanners.map((banner) => ({
        ...banner,
        status: computeBannerStatus(banner),
      }));
    },
    []
  );

  /**
   * Load all banners for admin
   */
  const loadBanners = useCallback(async () => {
    setLoadingState('loading');
    setError(null);

    try {
      const rawBanners = await fetchAllBanners(supabase, true);
      setBanners(transformWithStatus(rawBanners));
      setLoadingState('idle');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load banners';
      setError(message);
      setLoadingState('error');
    }
  }, [supabase, transformWithStatus]);

  /**
   * Create a new banner
   */
  const createNewBanner = useCallback(
    async (input: CreateBannerInput): Promise<CommunityBanner> => {
      setLoadingState('submitting');
      setError(null);

      try {
        const newBanner = await createBanner(supabase, input);

        // Add to local state with status
        setBanners((prev) => [
          ...transformWithStatus([newBanner]),
          ...prev,
        ]);

        setLoadingState('idle');
        return newBanner;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create banner';
        setError(message);
        setLoadingState('error');
        throw err;
      }
    },
    [supabase, transformWithStatus]
  );

  /**
   * Update an existing banner
   */
  const updateExistingBanner = useCallback(
    async (id: string, input: UpdateBannerInput): Promise<CommunityBanner> => {
      setLoadingState('submitting');
      setError(null);

      try {
        const updatedBanner = await updateBanner(supabase, id, input);

        // Update local state
        setBanners((prev) =>
          prev.map((b) =>
            b.id === id
              ? { ...updatedBanner, status: computeBannerStatus(updatedBanner) }
              : b
          )
        );

        setLoadingState('idle');
        return updatedBanner;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update banner';
        setError(message);
        setLoadingState('error');
        throw err;
      }
    },
    [supabase]
  );

  /**
   * Delete a banner
   */
  const deleteExistingBanner = useCallback(
    async (id: string): Promise<void> => {
      setLoadingState('deleting');
      setError(null);

      try {
        await deleteBanner(supabase, id);

        // Remove from local state
        setBanners((prev) => prev.filter((b) => b.id !== id));

        setLoadingState('idle');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete banner';
        setError(message);
        setLoadingState('error');
        throw err;
      }
    },
    [supabase]
  );

  // Load banners on mount
  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  return {
    banners,
    loadingState,
    error,
    loadBanners,
    createNewBanner,
    updateExistingBanner,
    deleteExistingBanner,
  };
}
