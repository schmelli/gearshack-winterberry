/**
 * Loadout Image Generation Hook
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Custom hook containing ALL business logic for image generation
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type {
  ImageGenerationState,
  GeneratedLoadoutImage,
  StylePreferences,
} from '@/types/loadout-image';
import { buildPrompt, generateAltText } from '@/lib/prompt-builder';
import { selectFallbackImage } from '@/lib/fallback-images';
import { AI_GENERATION_RETRY_DELAY_MS } from '@/lib/config/image-generation';

// =============================================================================
// Hook Interface
// =============================================================================

export interface UseLoadoutImageGenerationParams {
  loadoutId: string;
  loadoutTitle?: string;
  loadoutDescription?: string;
  season?: string;
  activityTypes?: string[];
  userId: string;
}

export interface UseLoadoutImageGenerationReturn {
  /** Current generation state */
  state: ImageGenerationState;

  /** Current active image (if any) */
  activeImage: GeneratedLoadoutImage | null;

  /** Image history (up to 3) */
  imageHistory: GeneratedLoadoutImage[];

  /** Generate new AI image */
  generateImage: (stylePreferences?: StylePreferences) => Promise<void>;

  /** Regenerate (same as generateImage but for UX clarity) */
  regenerateImage: (stylePreferences?: StylePreferences) => Promise<void>;

  /** Set a historical image as active */
  setActiveImage: (imageId: string) => Promise<void>;

  /** Delete a generated image */
  deleteImage: (imageId: string) => Promise<void>;

  /** Refresh image history from database */
  refreshHistory: () => Promise<void>;
}

// =============================================================================
// Main Hook
// =============================================================================

export function useLoadoutImageGeneration(
  params: UseLoadoutImageGenerationParams
): UseLoadoutImageGenerationReturn {
  const t = useTranslations('Loadouts.imageGeneration');
  const {
    loadoutId,
    loadoutTitle,
    loadoutDescription,
    season,
    activityTypes,
    userId,
  } = params;

  // State
  const [state, setState] = useState<ImageGenerationState>({
    status: 'idle',
    progress: undefined,
    error: undefined,
    generatedImageId: undefined,
  });

  const [activeImage, setActiveImageState] =
    useState<GeneratedLoadoutImage | null>(null);
  const [imageHistory, setImageHistory] = useState<GeneratedLoadoutImage[]>([]);

  // Retry guard ref to prevent race conditions from rapid clicks
  // Using ref instead of state to avoid stale closure issues
  const retryAttemptRef = useRef(0);

  // AbortController ref to cleanup fetch operations on unmount
  // Prevents memory leaks when component unmounts during image generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Metrics tracking
  const logMetric = useCallback(
    (event: string, data?: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ImageGen Metric] ${event}`, {
          loadoutId,
          timestamp: new Date().toISOString(),
          ...data,
        });
      }
      // In production, this would send to analytics service
    },
    [loadoutId]
  );

  // =============================================================================
  // History Management (moved here to avoid circular dependencies)
  // =============================================================================

  const refreshHistory = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/loadout-images/history?loadoutId=${loadoutId}`
      );

      if (response.ok) {
        const data = await response.json();
        setImageHistory(data.images || []);

        const active = data.images?.find((img: GeneratedLoadoutImage) => img.isActive);
        setActiveImageState(active || null);
      }
    } catch (error) {
      console.error('[ImageGen] Failed to refresh history:', error);
    }
  }, [loadoutId]);

  // =============================================================================
  // Core Generation Function (T015)
  // =============================================================================

  const generateImage = useCallback(
    async (stylePreferences?: StylePreferences): Promise<void> => {
      const startTime = performance.now();

      // Reset retry counter for new generation attempt
      retryAttemptRef.current = 0;

      // Abort any previous in-flight request before creating new one
      abortControllerRef.current?.abort();
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      try {
        // Update state to generating
        setState({
          status: 'generating',
          progress: 0,
        });

        logMetric('generation_started', {
          stylePreferences,
          hasTitle: !!loadoutTitle,
          hasSeason: !!season,
          activityCount: activityTypes?.length || 0,
        });

        // Build prompt from loadout characteristics
        const { prompt, negativePrompt } = buildPrompt({
          title: loadoutTitle,
          description: loadoutDescription,
          season,
          activityTypes,
          stylePreferences,
        });

        // Call generation API (server-side API route)
        const response = await fetch('/api/loadout-images/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            loadoutId,
            prompt,
            negativePrompt,
            stylePreferences,
            userId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Generation failed');
        }

        const result = await response.json();

        // Success - update state
        setState({
          status: 'success',
          generatedImageId: result.imageId,
        });

        setActiveImageState(result.image);

        const duration = performance.now() - startTime;

        logMetric('generation_success', {
          duration,
          imageId: result.imageId,
          prompt: prompt.substring(0, 100), // Log first 100 chars
        });

        toast.success(t('generateSuccess'));

        // Refresh history
        await refreshHistory();
      } catch (error) {
        // Handle error with retry logic (T016)
        await handleGenerationError(error, stylePreferences, startTime);
      }
    },
    // handleGenerationError is intentionally excluded to avoid circular dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      loadoutId,
      loadoutTitle,
      loadoutDescription,
      season,
      activityTypes,
      userId,
      logMetric,
      refreshHistory,
    ]
  );

  // =============================================================================
  // Retry Logic (T016)
  // =============================================================================

  const handleGenerationError = useCallback(
    async (
      error: unknown,
      stylePreferences: StylePreferences | undefined,
      startTime: number
    ): Promise<void> => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logMetric('generation_error', {
        error: errorMessage,
        retryable: retryAttemptRef.current === 0, // Only retry once
      });

      // If this is the first failure, try retry (guard against race conditions)
      if (retryAttemptRef.current === 0) {
        retryAttemptRef.current = 1;
        console.log('[ImageGen] First attempt failed, retrying once...');

        setState({
          status: 'retrying',
          error: errorMessage,
        });

        try {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, AI_GENERATION_RETRY_DELAY_MS));

          // Retry the generation
          await executeRetry(stylePreferences, startTime);
        } catch (retryError) {
          // Retry also failed - use fallback (T017)
          await applyFallback(retryError, startTime);
        }
      } else {
        // Already retried once - go straight to fallback
        await applyFallback(error, startTime);
      }
    },
    // Removed state.status from deps to avoid stale closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logMetric]
  );

  const executeRetry = useCallback(
    async (
      stylePreferences: StylePreferences | undefined,
      startTime: number
    ): Promise<void> => {
      const { prompt, negativePrompt } = buildPrompt({
        title: loadoutTitle,
        description: loadoutDescription,
        season,
        activityTypes,
        stylePreferences,
      });

      // Use the same AbortController signal for retry to allow cancellation
      const response = await fetch('/api/loadout-images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current?.signal,
        body: JSON.stringify({
          loadoutId,
          prompt,
          negativePrompt,
          stylePreferences,
          userId,
          isRetry: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Retry failed');
      }

      const result = await response.json();

      // Check if aborted before state updates
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setState({
        status: 'success',
        generatedImageId: result.imageId,
      });

      setActiveImageState(result.image);

      const duration = performance.now() - startTime;

      logMetric('generation_retry_success', {
        duration,
        imageId: result.imageId,
      });

      toast.success(t('generateSuccess'));

      // Check again before refresh
      if (!abortControllerRef.current?.signal.aborted) {
        await refreshHistory();
      }
    },
    [
      loadoutId,
      loadoutTitle,
      loadoutDescription,
      season,
      activityTypes,
      userId,
      logMetric,
      refreshHistory,
      t,
    ]
  );

  // =============================================================================
  // Fallback Logic (T017)
  // =============================================================================

  const applyFallback = useCallback(
    async (error: unknown, startTime: number): Promise<void> => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      console.log('[ImageGen] Both attempts failed, using fallback image');

      logMetric('generation_fallback', {
        error: errorMessage,
        duration: performance.now() - startTime,
      });

      // Select appropriate fallback image
      const primaryActivity = activityTypes?.[0];
      const fallbackImage = selectFallbackImage(primaryActivity, season);

      // Generate alt-text for fallback
      const altText = generateAltText({
        title: loadoutTitle,
        season,
        activityTypes,
      });

      // Save fallback as generated image (T018)
      try {
        const response = await fetch('/api/loadout-images/save-fallback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            loadoutId,
            fallbackImageUrl: fallbackImage.url,
            fallbackImageId: fallbackImage.id,
            altText,
            userId,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          setState({
            status: 'fallback',
            generatedImageId: result.imageId,
          });

          setActiveImageState(result.image);

          // Silent fallback - don't show error toast
          toast.info(t('usingDefault'));

          await refreshHistory();
        } else {
          throw new Error('Failed to save fallback image');
        }
      } catch {
        // Even fallback save failed - show error
        setState({
          status: 'error',
          error: 'Failed to generate or load fallback image',
        });

        toast.error(t('generateFailed'));
      }
    },
    [loadoutId, loadoutTitle, season, activityTypes, userId, logMetric, refreshHistory, t]
  );

  const setActiveImageById = useCallback(
    async (imageId: string): Promise<void> => {
      try {
        const response = await fetch('/api/loadout-images/set-active', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageId,
            loadoutId,
            userId,
          }),
        });

        if (response.ok) {
          toast.success(t('imageUpdated'));
          await refreshHistory();
        } else {
          throw new Error('Failed to set active image');
        }
      } catch (error) {
        console.error('[ImageGen] Failed to set active image:', error);
        toast.error(t('updateFailed'));
      }
    },
    [loadoutId, userId, refreshHistory, t]
  );

  const deleteImage = useCallback(
    async (imageId: string): Promise<void> => {
      try {
        const response = await fetch('/api/loadout-images/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageId,
            loadoutId,
            userId,
          }),
        });

        if (response.ok) {
          toast.success(t('imageDeleted'));
          await refreshHistory();
        } else {
          throw new Error('Failed to delete image');
        }
      } catch (error) {
        console.error('[ImageGen] Failed to delete image:', error);
        toast.error(t('deleteFailed'));
      }
    },
    [loadoutId, userId, refreshHistory, t]
  );

  // =============================================================================
  // Return Hook Interface
  // =============================================================================

  return {
    state,
    activeImage,
    imageHistory,
    generateImage,
    regenerateImage: generateImage, // Alias for UX clarity
    setActiveImage: setActiveImageById,
    deleteImage,
    refreshHistory,
  };
}
