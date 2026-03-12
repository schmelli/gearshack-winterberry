/**
 * useUrlImport Hook
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * Manages the URL import flow: fetch data → match catalog → prepare form prefill.
 */

'use client';

import { useState, useCallback } from 'react';
import type {
  ImportedProductData,
  CatalogMatchResult,
} from '@/types/contributions';

// =============================================================================
// Types
// =============================================================================

export type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

export interface UseUrlImportReturn {
  /** Current import status */
  status: ImportStatus;
  /** Imported product data (when status is 'success') */
  importedData: ImportedProductData | null;
  /** Catalog match result (if found) */
  catalogMatch: CatalogMatchResult | null;
  /** Error message (when status is 'error') */
  error: string | null;
  /** Whether user chose to use catalog data */
  useCatalogData: boolean;

  // Actions
  /** Import product data from URL */
  importFromUrl: (url: string) => Promise<boolean>;
  /** Clear import state */
  clearImport: () => void;
  /** Toggle whether to use catalog data */
  setUseCatalogData: (use: boolean) => void;
  /** Get form prefill data based on current selection */
  getFormPrefill: () => FormPrefillData | null;
}

/**
 * Data structure for form prefill
 */
export interface FormPrefillData {
  name: string;
  brand: string;
  description: string;
  primaryImageUrl: string;
  weightValue: string;
  weightDisplayUnit: 'g' | 'oz' | 'lb';
  pricePaid: string;
  currency: string;
  productUrl: string;
  productTypeId: string;
  // Tracking metadata
  sourceUrl: string;
  catalogMatchId: string | null;
  catalogMatchConfidence: number | null;
}

// =============================================================================
// Hook
// =============================================================================

export function useUrlImport(): UseUrlImportReturn {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [importedData, setImportedData] = useState<ImportedProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useCatalogData, setUseCatalogData] = useState(true);

  /**
   * Import product data from URL
   */
  const importFromUrl = useCallback(async (url: string): Promise<boolean> => {
    setStatus('importing');
    setError(null);
    setImportedData(null);

    try {
      const response = await fetch('/api/gear/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!result.success || !result.data) {
        setStatus('error');
        setError(result.error || 'Failed to import product data');
        return false;
      }

      setImportedData(result.data);
      setStatus('success');

      // Default to using catalog data if a good match was found
      setUseCatalogData(
        result.data.catalogMatch !== null &&
        result.data.catalogMatch.matchScore >= 0.6
      );

      return true;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Import failed');
      return false;
    }
  }, []);

  /**
   * Clear import state
   */
  const clearImport = useCallback(() => {
    setStatus('idle');
    setImportedData(null);
    setError(null);
    setUseCatalogData(true);
  }, []);

  /**
   * Get form prefill data based on current selection
   */
  const getFormPrefill = useCallback((): FormPrefillData | null => {
    if (!importedData) return null;

    const catalogMatch = importedData.catalogMatch;
    const usesCatalog = useCatalogData && catalogMatch !== null;
    const suggestedCategoryId = importedData.categorySuggestion?.categoryId ?? null;

    // Determine weight value and unit
    let weightValue = '';
    let weightDisplayUnit: 'g' | 'oz' | 'lb' = 'g';

    if (usesCatalog && catalogMatch?.weightGrams) {
      weightValue = String(catalogMatch.weightGrams);
      weightDisplayUnit = 'g';
    } else if (importedData.weightGrams) {
      // URL import returns normalized grams, so keep display in grams to avoid double conversion.
      weightValue = String(importedData.weightGrams);
      weightDisplayUnit = 'g';
    }

    // Determine price and currency
    let pricePaid = '';
    let currency = 'USD';

    if (usesCatalog && catalogMatch?.priceUsd) {
      pricePaid = String(catalogMatch.priceUsd);
      currency = 'USD';
    } else if (importedData.priceValue) {
      pricePaid = String(importedData.priceValue);
      currency = importedData.currency || 'USD';
    }

    const name = usesCatalog
      ? (catalogMatch?.name || importedData.name || '')
      : (importedData.name || catalogMatch?.name || '');
    const brand = usesCatalog
      ? (catalogMatch?.brand || importedData.brand || '')
      : (importedData.brand || catalogMatch?.brand || '');
    const description = usesCatalog
      ? (catalogMatch?.description || importedData.description || '')
      : (importedData.description || catalogMatch?.description || '');
    const productTypeId = usesCatalog
      ? (catalogMatch?.productTypeId || suggestedCategoryId || '')
      : (suggestedCategoryId || catalogMatch?.productTypeId || '');

    return {
      name,
      brand,
      description,
      primaryImageUrl: importedData.imageUrl || '',
      weightValue,
      weightDisplayUnit,
      pricePaid,
      currency,
      productUrl: importedData.productUrl,
      productTypeId,
      // Tracking metadata
      sourceUrl: importedData.productUrl,
      catalogMatchId: catalogMatch?.id || null,
      catalogMatchConfidence: catalogMatch?.matchScore || null,
    };
  }, [importedData, useCatalogData]);

  return {
    status,
    importedData,
    catalogMatch: importedData?.catalogMatch || null,
    error,
    useCatalogData,
    importFromUrl,
    clearImport,
    setUseCatalogData,
    getFormPrefill,
  };
}
