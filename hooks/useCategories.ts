/**
 * useCategories Hook
 *
 * Feature: 043-ontology-i18n-import
 * Task: T022
 * Updated: Performance optimization - now uses Zustand store for global caching
 *
 * Fetches and caches categories with i18n support.
 * Provides localized options for Select components.
 */

'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import {
  getLocalizedLabel,
  getCategoryOptions,
  getCategoryHierarchy,
} from '@/lib/utils/category-helpers';
import type { Category, CategoryOption, CategoryWithChildren } from '@/types/category';

interface UseCategoriesReturn {
  /** All categories */
  categories: Category[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Hierarchical category tree */
  hierarchy: CategoryWithChildren[];
  /** Get options for a specific level */
  getOptionsForLevel: (level: 1 | 2 | 3, parentId?: string | null) => CategoryOption[];
  /** Get localized label for a category ID */
  getLabelById: (id: string | null | undefined) => string;
  /** Refetch categories */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and working with localized categories.
 *
 * @example
 * ```tsx
 * const { categories, getOptionsForLevel, getLabelById, isLoading } = useCategories();
 *
 * // Get level 1 options
 * const categoryOptions = getOptionsForLevel(1);
 *
 * // Get level 2 options filtered by parent
 * const subcategoryOptions = getOptionsForLevel(2, selectedCategoryId);
 *
 * // Get label for a category ID
 * const label = getLabelById(item.categoryId);
 * ```
 */
export function useCategories(): UseCategoriesReturn {
  const locale = useLocale();
  const t = useTranslations('Common');

  // Get categories from global Zustand store
  const categories = useCategoriesStore((state) => state.categories);
  const isLoading = useCategoriesStore((state) => state.isLoading);
  const error = useCategoriesStore((state) => state.error);
  const fetchCategories = useCategoriesStore((state) => state.fetchCategories);
  const refresh = useCategoriesStore((state) => state.refresh);

  // Fetch categories on mount if not already initialized
  // Also refetch when locale changes to ensure fresh data for new locale
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories, locale]);

  // Build hierarchy from flat categories
  const hierarchy = useMemo(() => {
    if (categories.length === 0) return [];
    return getCategoryHierarchy(categories, locale);
  }, [categories, locale]);

  // Get options filtered by level and optional parent
  const getOptionsForLevel = useCallback(
    (level: 1 | 2 | 3, parentId?: string | null): CategoryOption[] => {
      return getCategoryOptions(categories, locale, level, parentId);
    },
    [categories, locale]
  );

  // Get localized label by ID
  const getLabelById = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return t('uncategorized');
      const category = categories.find((c) => c.id === id);
      if (!category) return t('uncategorized');
      return getLocalizedLabel(category, locale);
    },
    [categories, locale, t]
  );

  return {
    categories,
    isLoading,
    error,
    hierarchy,
    getOptionsForLevel,
    getLabelById,
    refresh,
  };
}
