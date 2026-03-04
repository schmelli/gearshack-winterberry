/**
 * useQuickAdd Hook
 *
 * Feature: 054-zero-friction-input
 *
 * Central orchestration hook for the zero-friction gear input flow.
 * Detects input type (URL/text/image), routes to appropriate extraction API,
 * normalizes results, and either auto-saves or shows quick-edit review.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/utils/logger';
import { useSupabaseStore } from '@/hooks/useSupabaseStore';
import type { GearItem } from '@/types/gear';
import type {
  QuickAddStatus,
  QuickAddInputType,
  QuickAddExtraction,
  QuickAddOverrides,
  TextExtractResponse,
} from '@/types/quick-add';
import type { ImportUrlResponse, ImportedProductData } from '@/types/contributions';
import type { VisionScanResponse, CatalogMatchResult } from '@/types/vision-scan';
import { AUTO_SAVE_CONFIDENCE, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE, clampConfidence } from '@/types/quick-add';

// =============================================================================
// Return Type
// =============================================================================

/**
 * Return type for the useQuickAdd hook.
 *
 * Co-invariants between fields (not enforced at type level to avoid breaking consumers):
 * - `status === 'idle'`       → `extraction` is null, `error` is null
 * - `status === 'extracting'` → `extraction` is null, `error` is null
 * - `status === 'reviewing'`  → `extraction` is non-null, `error` is null
 * - `status === 'saving'`     → `extraction` is non-null, `error` is null
 * - `status === 'success'`    → `extraction` is non-null (briefly), `error` is null, auto-resets to idle after 1500ms
 * - `status === 'error'`      → `error` is non-null, `extraction` may or may not be set
 */
export interface UseQuickAddReturn {
  status: QuickAddStatus;
  inputType: QuickAddInputType | null;
  extraction: QuickAddExtraction | null;
  error: string | null;

  processInput: (input: string) => Promise<void>;
  processImage: (file: File) => Promise<void>;
  confirmSave: (overrides?: QuickAddOverrides) => Promise<void>;
  dismiss: () => void;
  reset: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

function detectInputType(input: string): 'url' | 'text' {
  return /^https?:\/\//i.test(input.trim()) ? 'url' : 'text';
}

/** Map URL-import confidence levels to numeric values */
function mapExtractionConfidence(
  level: 'high' | 'medium' | 'low'
): number {
  switch (level) {
    case 'high': return 0.85;
    case 'medium': return 0.60;
    case 'low': return 0.35;
  }
}

/** Map vision condition to gear condition */
function mapVisionCondition(
  condition: 'new' | 'good' | 'fair' | 'poor' | null
): 'new' | 'used' | 'worn' | null {
  switch (condition) {
    case 'new': return 'new';
    case 'good': return 'used';
    case 'fair': return 'worn';
    case 'poor': return 'worn';
    default: return null;
  }
}

/** Normalize URL import response to QuickAddExtraction */
function normalizeUrlImportResult(data: ImportedProductData): QuickAddExtraction {
  let confidence = mapExtractionConfidence(data.extractionConfidence);

  // Boost confidence if catalog match is strong
  if (data.catalogMatch && data.catalogMatch.matchScore >= 0.5) {
    confidence = clampConfidence(confidence + 0.10);
  }

  return {
    inputType: 'url',
    confidence,
    name: data.name,
    brand: data.brand,
    description: data.description,
    productTypeId: data.catalogMatch?.productTypeId ?? data.categorySuggestion?.categoryId ?? null,
    categoryLabel: data.categorySuggestion?.categoryPath ?? null,
    weightGrams: data.weightGrams,
    condition: 'new',
    primaryImageUrl: data.imageUrl,
    productUrl: data.productUrl,
    pricePaid: data.priceValue,
    currency: data.currency,
  };
}

/** Normalize Vision Scan result to QuickAddExtraction */
function normalizeVisionScanResult(result: CatalogMatchResult): QuickAddExtraction {
  const { detected, catalogMatch } = result;

  let confidence = clampConfidence(detected.confidence);

  // Boost confidence if catalog match exists
  if (catalogMatch && catalogMatch.matchScore >= 0.5) {
    confidence = clampConfidence(confidence + 0.10);
  }

  // Use catalog match data when available (more accurate)
  const name = catalogMatch?.productName ?? detected.name;
  const brand = catalogMatch?.brandName ?? detected.brand;
  const productTypeId = catalogMatch?.productTypeId ?? detected.resolvedProductTypeId ?? null;
  const weightGrams = catalogMatch?.weightGrams ?? detected.estimatedWeightGrams;
  const imageUrl = catalogMatch?.imageUrl ?? null;
  const productUrl = catalogMatch?.productUrl ?? null;

  return {
    inputType: 'image',
    confidence,
    name,
    brand,
    description: catalogMatch?.description ?? null,
    productTypeId,
    categoryLabel: detected.category,
    weightGrams,
    condition: mapVisionCondition(detected.condition),
    primaryImageUrl: imageUrl,
    productUrl,
    pricePaid: catalogMatch?.priceUsd ?? null,
    currency: catalogMatch?.priceUsd ? 'USD' : null,
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useQuickAdd(): UseQuickAddReturn {
  const t = useTranslations('QuickAdd');
  const addItem = useSupabaseStore((state) => state.addItem);

  const [status, setStatus] = useState<QuickAddStatus>('idle');
  const [inputType, setInputType] = useState<QuickAddInputType | null>(null);
  const [extraction, setExtraction] = useState<QuickAddExtraction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AbortController to cancel in-flight requests
  const abortRef = useRef<AbortController | null>(null);
  // Timer ref to clear success-reset timeout on unmount / manual reset
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount: abort in-flight requests and clear timers
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setStatus('idle');
    setInputType(null);
    setExtraction(null);
    setError(null);
  }, []);

  // dismiss is semantically distinct (user cancelled review) vs reset (programmatic),
  // but the implementation is identical. Delegate to reset to prevent future drift.
  const dismiss = useCallback(() => {
    reset();
  }, [reset]);

  // ───────────────────────────────────────────────────────────────────────────
  // Auto-save or review
  // ───────────────────────────────────────────────────────────────────────────
  const handleExtractionResult = useCallback(
    async (result: QuickAddExtraction) => {
      setExtraction(result);

      if (result.confidence >= AUTO_SAVE_CONFIDENCE && result.name) {
        // Auto-save path
        setStatus('saving');
        try {
          const payload = buildGearItemPayload(result);
          await addItem(payload);
          toast.success(t('savedSuccess'), {
            description: t('savedSuccessDesc', { name: result.name }),
          });
          setStatus('success');
          // Auto-reset after brief success state (clear any leaked previous timer)
          if (successTimerRef.current) clearTimeout(successTimerRef.current);
          successTimerRef.current = setTimeout(() => {
            successTimerRef.current = null;
            setStatus('idle');
            setExtraction(null);
            setInputType(null);
            setError(null);
          }, 1500);
        } catch (err) {
          logger.error('[QuickAdd] Auto-save failed', { module: 'QuickAdd' }, err instanceof Error ? err : undefined);
          setStatus('error');
          setError(t('errorSave'));
        }
      } else {
        // Review path (confidence below threshold or missing name)
        setStatus('reviewing');
      }
    },
    [addItem, t]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Process text or URL input
  // ───────────────────────────────────────────────────────────────────────────
  const processInput = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Clear any pending success-reset timer to prevent it from
      // resetting the UI mid-extraction (race condition fix)
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }

      const type = detectInputType(trimmed);
      setInputType(type);
      setStatus('extracting');
      setError(null);

      try {
        if (type === 'url') {
          // ── URL extraction ──
          const response = await fetch('/api/gear/import-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: trimmed }),
            signal: controller.signal,
          });

          if (controller.signal.aborted) return;

          if (!response.ok) {
            setStatus('error');
            setError(response.status === 429 ? t('errorRateLimit') : t('errorExtraction'));
            return;
          }

          let result: ImportUrlResponse;
          try {
            result = await response.json();
          } catch (parseError) {
            logger.error('[QuickAdd] Failed to parse URL import response', { module: 'QuickAdd', endpoint: '/api/gear/import-url' }, parseError instanceof Error ? parseError : undefined);
            setStatus('error');
            setError(t('errorExtraction'));
            return;
          }

          if (!result.success || !result.data) {
            setStatus('error');
            setError(result.error ?? t('errorExtraction'));
            return;
          }

          await handleExtractionResult(normalizeUrlImportResult(result.data));
        } else {
          // ── Text extraction ──
          const response = await fetch('/api/gear/extract-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: trimmed }),
            signal: controller.signal,
          });

          if (controller.signal.aborted) return;

          if (!response.ok) {
            setStatus('error');
            setError(response.status === 429 ? t('errorRateLimit') : t('errorExtraction'));
            return;
          }

          let result: TextExtractResponse;
          try {
            result = await response.json();
          } catch (parseError) {
            logger.error('[QuickAdd] Failed to parse text extract response', { module: 'QuickAdd', endpoint: '/api/gear/extract-text' }, parseError instanceof Error ? parseError : undefined);
            setStatus('error');
            setError(t('errorExtraction'));
            return;
          }

          if (!result.success) {
            setStatus('error');
            setError(result.error);
            return;
          }

          await handleExtractionResult(result.data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        logger.error('[QuickAdd] processInput failed', { module: 'QuickAdd', inputType: type }, err instanceof Error ? err : undefined);
        setStatus('error');
        setError(t('errorExtraction'));
      }
    },
    [handleExtractionResult, t]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Process image (drop, paste, camera)
  // ───────────────────────────────────────────────────────────────────────────
  const processImage = useCallback(
    async (file: File) => {
      // Validate file type
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
        setStatus('error');
        setError(t('errorInvalidImage'));
        return;
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        setStatus('error');
        setError(t('errorImageTooLarge'));
        return;
      }

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Clear any pending success-reset timer to prevent it from
      // resetting the UI mid-extraction (race condition fix)
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }

      setInputType('image');
      setStatus('extracting');
      setError(null);

      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/vision/scan', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!response.ok) {
          setStatus('error');
          setError(response.status === 429 ? t('errorRateLimit') : t('errorExtraction'));
          return;
        }

        let result: VisionScanResponse;
        try {
          result = await response.json();
        } catch (parseError) {
          logger.error('[QuickAdd] Failed to parse vision scan response', { module: 'QuickAdd', endpoint: '/api/vision/scan' }, parseError instanceof Error ? parseError : undefined);
          setStatus('error');
          setError(t('errorExtraction'));
          return;
        }

        if (!result.success) {
          setStatus('error');
          setError(result.error ?? t('errorExtraction'));
          return;
        }

        if (result.items.length === 0) {
          setStatus('error');
          setError(t('noGearDetected'));
          return;
        }

        // Take the first (highest confidence) detected item
        const bestResult = result.items[0];
        await handleExtractionResult(normalizeVisionScanResult(bestResult));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        logger.error('[QuickAdd] processImage failed', { module: 'QuickAdd', fileName: file.name, fileSize: file.size }, err instanceof Error ? err : undefined);
        setStatus('error');
        setError(t('errorExtraction'));
      }
    },
    [handleExtractionResult, t]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Confirm save (from quick-edit sheet)
  // ───────────────────────────────────────────────────────────────────────────
  const confirmSave = useCallback(
    async (overrides?: QuickAddOverrides) => {
      if (!extraction) {
        setStatus('error');
        setError(t('errorExtraction'));
        return;
      }

      const merged: QuickAddExtraction = {
        ...extraction,
        ...overrides,
      };

      if (!merged.name) {
        setStatus('error');
        setError(t('errorNoName'));
        return;
      }

      setStatus('saving');
      setError(null);

      try {
        const payload = buildGearItemPayload(merged);
        await addItem(payload);
        toast.success(t('savedSuccess'), {
          description: t('savedSuccessDesc', { name: merged.name }),
        });
        setStatus('success');
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => {
          successTimerRef.current = null;
          setStatus('idle');
          setExtraction(null);
          setInputType(null);
          setError(null);
        }, 1500);
      } catch (err) {
        logger.error('[QuickAdd] confirmSave failed', { module: 'QuickAdd' }, err instanceof Error ? err : undefined);
        setStatus('error');
        setError(t('errorSave'));
      }
    },
    [extraction, addItem, t]
  );

  return {
    status,
    inputType,
    extraction,
    error,
    processInput,
    processImage,
    confirmSave,
    dismiss,
    reset,
  };
}

// =============================================================================
// Payload Builder
// =============================================================================

function buildGearItemPayload(
  extraction: QuickAddExtraction
): Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: extraction.name ?? 'Unknown Gear',
    brand: extraction.brand ?? null,
    description: extraction.description ?? null,
    brandUrl: null,
    modelNumber: null,
    productUrl: extraction.productUrl ?? null,
    productTypeId: extraction.productTypeId ?? null,
    weightGrams: extraction.weightGrams ?? null,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    size: null,
    color: null,
    volumeLiters: null,
    materials: null,
    tentConstruction: null,
    pricePaid: extraction.pricePaid ?? null,
    currency: extraction.currency ?? null,
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    manufacturerPrice: null,
    manufacturerCurrency: null,
    primaryImageUrl: extraction.primaryImageUrl ?? null,
    galleryImageUrls: [],
    condition: extraction.condition ?? 'new',
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
  };
}
