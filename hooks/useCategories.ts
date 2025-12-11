/**
 * useCategories Hook
 *
 * Feature: 043-ontology-i18n-import
 * Task: T022
 *
 * Fetches and caches categories with i18n support.
 * Provides localized options for Select components.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { fetchCategories } from '@/lib/supabase/categories';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load categories';
      setError(message);
      console.error('useCategories error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
      if (!id) return '';
      const category = categories.find((c) => c.id === id);
      if (!category) return '';
      return getLocalizedLabel(category, locale);
    },
    [categories, locale]
  );

  return {
    categories,
    isLoading,
    error,
    hierarchy,
    getOptionsForLevel,
    getLabelById,
    refresh: loadCategories,
  };
}
