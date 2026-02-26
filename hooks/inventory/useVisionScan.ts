/**
 * useVisionScan Hook
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Business logic for AI-powered gear detection from photos.
 * State machine: idle → analyzing → review → importing → success/error
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useSupabaseStore } from '@/hooks/useSupabaseStore';
import type {
  VisionScanState,
  VisionScanStatus,
  CatalogMatchResult,
  VisionScanResponse,
} from '@/types/vision-scan';
import type { GearCondition, GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

export interface UseVisionScanOptions {
  onImportComplete?: (count: number) => void;
  /** Called after successful import to trigger auto-close. Managed internally with delay. */
  onAutoClose?: () => void;
  /** Delay in ms before calling onAutoClose after success (default: 1500) */
  autoCloseDelayMs?: number;
}

export interface UseVisionScanReturn {
  state: VisionScanState;
  scanImage: (file: File) => Promise<void>;
  toggleItem: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  importSelected: () => Promise<void>;
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

function createInitialState(): VisionScanState {
  return {
    status: 'idle',
    results: [],
    selectedIndices: new Set(),
    error: null,
    importedCount: 0,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function mapVisionConditionToGear(
  condition: 'new' | 'good' | 'fair' | 'poor' | null
): GearCondition {
  switch (condition) {
    case 'new':
      return 'new';
    case 'good':
    case 'fair':
      return 'used';
    case 'poor':
      return 'worn';
    default:
      return 'used';
  }
}

/**
 * Map structured API error codes to i18n-friendly messages.
 * Keeps internals off the network and lets the client own the UX copy.
 */
function mapApiError(
  code: string | undefined,
  t: (key: string) => string
): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return t('errorUnauthorized');
    case 'AI_NOT_CONFIGURED':
      return t('errorNotConfigured');
    case 'NO_IMAGE_PROVIDED':
      return t('errorNoImage');
    case 'INVALID_IMAGE_TYPE':
      return t('errorInvalidType');
    case 'IMAGE_TOO_LARGE':
      return t('errorTooLarge');
    case 'VISION_TIMEOUT':
      return t('errorTimeout');
    case 'RATE_LIMITED':
      return t('errorRateLimited');
    case 'SCAN_FAILED':
    default:
      return t('scanFailed');
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useVisionScan({
  onImportComplete,
  onAutoClose,
  autoCloseDelayMs = 1500,
}: UseVisionScanOptions = {}): UseVisionScanReturn {
  const t = useTranslations('VisionScan');
  const addItem = useSupabaseStore((state) => state.addItem);
  const [state, setState] = useState<VisionScanState>(createInitialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up in-flight request and auto-close timer on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const setStatus = useCallback((status: VisionScanStatus) => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  // =========================================================================
  // Scan Image
  // =========================================================================

  const scanImage = useCallback(
    async (file: File) => {
      // Client-side validation before upload
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

      if (file.size > MAX_FILE_SIZE) {
        setState((prev) => ({ ...prev, status: 'error', error: t('errorTooLarge') }));
        toast.error(t('errorTooLarge'));
        return;
      }

      if (file.type && !ALLOWED_TYPES.includes(file.type)) {
        setState((prev) => ({ ...prev, status: 'error', error: t('errorInvalidType') }));
        toast.error(t('errorInvalidType'));
        return;
      }

      // Abort any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({
        status: 'analyzing',
        results: [],
        selectedIndices: new Set(),
        error: null,
        importedCount: 0,
      });

      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/vision/scan', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        const data = (await response.json()) as VisionScanResponse;

        if (!response.ok || !data.success) {
          throw new Error(mapApiError(data.error, t));
        }

        if (data.items.length === 0) {
          setState({
            status: 'review',
            results: [],
            selectedIndices: new Set(),
            error: null,
            importedCount: 0,
          });
          toast.info(t('noItemsDetected'));
          return;
        }

        // Pre-select all items with confidence >= 0.5
        const selectedIndices = new Set<number>();
        data.items.forEach((item, index) => {
          if (item.detected.confidence >= 0.5) {
            selectedIndices.add(index);
          }
        });

        setState({
          status: 'review',
          results: data.items,
          selectedIndices,
          error: null,
          importedCount: 0,
        });

        toast.success(t('itemsDetected', { count: data.items.length }));
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Cancelled, don't update state
        }

        const message =
          error instanceof Error ? error.message : t('scanFailed');
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: message,
        }));
        toast.error(t('scanFailed'), { description: message });
      }
    },
    [t]
  );

  // =========================================================================
  // Selection Controls
  // =========================================================================

  const toggleItem = useCallback((index: number) => {
    setState((prev) => {
      const next = new Set(prev.selectedIndices);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return { ...prev, selectedIndices: next };
    });
  }, []);

  const selectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIndices: new Set(prev.results.map((_, i) => i)),
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIndices: new Set(),
    }));
  }, []);

  // =========================================================================
  // Import Selected Items
  // =========================================================================

  const importSelected = useCallback(async () => {
    const selectedItems: CatalogMatchResult[] = [];
    state.results.forEach((item, index) => {
      if (state.selectedIndices.has(index)) {
        selectedItems.push(item);
      }
    });

    if (selectedItems.length === 0) {
      toast.warning(t('noItemsSelected'));
      return;
    }

    setStatus('importing');

    try {
      // Build all GearItem payloads upfront
      const itemPayloads: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>[] =
        selectedItems.map(({ detected, catalogMatch }) => ({
          name: catalogMatch?.productName ?? detected.name,
          brand: catalogMatch?.brandName ?? detected.brand ?? null,
          description: null,
          brandUrl: null,
          modelNumber: null,
          productUrl: null,
          productTypeId: catalogMatch?.productTypeId ?? null,
          weightGrams:
            catalogMatch?.weightGrams ??
            detected.estimatedWeightGrams ??
            null,
          weightDisplayUnit: 'g',
          lengthCm: null,
          widthCm: null,
          heightCm: null,
          size: null,
          color: null,
          volumeLiters: null,
          materials: null,
          tentConstruction: null,
          pricePaid: null,
          currency: null,
          purchaseDate: null,
          retailer: null,
          retailerUrl: null,
          manufacturerPrice: catalogMatch?.priceUsd || null,
          manufacturerCurrency: catalogMatch?.priceUsd ? 'USD' : null,
          primaryImageUrl: null,
          galleryImageUrls: [],
          nobgImages: undefined,
          condition: mapVisionConditionToGear(detected.condition),
          status: 'own',
          notes: null,
          quantity: 1,
          isFavourite: false,
          isForSale: false,
          canBeBorrowed: false,
          canBeTraded: false,
          sourceMerchantId: null,
          sourceOfferId: null,
          sourceLoadoutId: null,
          sourceAttribution: null,
          dependencyIds: [],
        }));

      // Batch import in parallel via the Zustand store so the UI refreshes
      // immediately without requiring a page reload.
      const importResults = await Promise.allSettled(
        itemPayloads.map((payload) => addItem(payload))
      );

      const importedCount = importResults.filter(
        (r) => r.status === 'fulfilled'
      ).length;

      const failedNames = importResults
        .map((r, i) => ({ result: r, name: selectedItems[i].detected.name }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ name }) => name);

      setState((prev) => ({
        ...prev,
        status: 'success',
        importedCount,
      }));

      if (failedNames.length === 0) {
        toast.success(t('importSuccess', { count: importedCount }));
      } else {
        toast.success(t('importSuccess', { count: importedCount }), {
          description: t('importPartialFailure', {
            failed: failedNames.join(', '),
          }),
        });
      }

      onImportComplete?.(importedCount);

      // Schedule auto-close if callback provided
      if (onAutoClose) {
        closeTimerRef.current = setTimeout(() => {
          onAutoClose();
        }, autoCloseDelayMs);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t('importFailed');
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
      }));
      toast.error(t('importFailed'), { description: message });
    }
  }, [state.results, state.selectedIndices, t, setStatus, onImportComplete, onAutoClose, autoCloseDelayMs, addItem]);

  // =========================================================================
  // Reset
  // =========================================================================

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setState(createInitialState());
  }, []);

  return {
    state,
    scanImage,
    toggleItem,
    selectAll,
    deselectAll,
    importSelected,
    reset,
  };
}

export default useVisionScan;
