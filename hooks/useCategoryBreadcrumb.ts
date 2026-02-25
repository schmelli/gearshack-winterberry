/**
 * useCategoryBreadcrumb Hook
 *
 * Feature: Cascading Category Refactor (Phase 2)
 *
 * Provides breadcrumb path and product type label for a given product type ID.
 * Used for displaying category breadcrumbs in GearCard and other components.
 */

'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useCategories } from './useCategories';
import { getCategoryPath, getCategorySlugPath, getLocalizedLabel } from '@/lib/utils/category-helpers';

interface UseCategoryBreadcrumbReturn {
  /** Array of localized labels from root to product type, e.g., ["Shelter", "Tents", "Dome Tents"] */
  breadcrumb: string[];
  /** Array of stable slugs from root to product type, e.g., ["shelter", "tents", "dome-tents"] */
  slugPath: string[];
  /** Localized label for the product type itself */
  productTypeLabel: string | null;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook for getting breadcrumb path and label for a product type.
 *
 * @param productTypeId - The product type (level 3) category ID
 * @returns Breadcrumb array, product type label, and loading state
 *
 * @example
 * ```tsx
 * const { breadcrumb, productTypeLabel, isLoading } = useCategoryBreadcrumb(item.productTypeId);
 *
 * // breadcrumb: ["Shelter", "Tents", "Dome Tents"]
 * // productTypeLabel: "Dome Tents"
 * ```
 */
export function useCategoryBreadcrumb(productTypeId: string | null): UseCategoryBreadcrumbReturn {
  const { categories, isLoading } = useCategories();
  const locale = useLocale();

  // Compute breadcrumb path (localized labels)
  const breadcrumb = useMemo(() => {
    if (!productTypeId || isLoading || categories.length === 0) {
      return [];
    }
    return getCategoryPath(productTypeId, categories, locale);
  }, [productTypeId, categories, locale, isLoading]);

  // Compute slug path (stable, non-localized)
  const slugPath = useMemo(() => {
    if (!productTypeId || isLoading || categories.length === 0) {
      return [];
    }
    return getCategorySlugPath(productTypeId, categories);
  }, [productTypeId, categories, isLoading]);

  // Compute product type label
  const productTypeLabel = useMemo(() => {
    if (!productTypeId || categories.length === 0) {
      return null;
    }
    const category = categories.find((c) => c.id === productTypeId);
    return category ? getLocalizedLabel(category, locale) : null;
  }, [productTypeId, categories, locale]);

  return {
    breadcrumb,
    slugPath,
    productTypeLabel,
    isLoading,
  };
}
