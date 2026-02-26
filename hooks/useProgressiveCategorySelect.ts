/**
 * useProgressiveCategorySelect Hook
 *
 * Feature: Cascading Category Refactor (Phase 2)
 *
 * Manages state for progressive category selection (one morphing dropdown).
 * Handles navigation through category levels (1 → 2 → 3) and back button.
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCategories } from './useCategories';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';
import type { CategoryOption } from '@/types/category';

interface NavigationState {
  level: 1 | 2 | 3;
  categoryId: string | null;
  subcategoryId: string | null;
  productTypeId: string | null;
}

interface UseProgressiveCategorySelectReturn {
  /** Current navigation level (1, 2, or 3) */
  currentLevel: 1 | 2 | 3;
  /** Options to display in the dropdown for the current level */
  currentOptions: CategoryOption[];
  /** Select an option and advance to next level (or complete if level 3) */
  selectOption: (optionId: string) => void;
  /** Navigate back to previous level */
  navigateBack: () => void;
  /** Whether back button should be enabled */
  canNavigateBack: boolean;
  /** Whether all 3 levels have been selected */
  isComplete: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for progressive category selection with one morphing dropdown.
 *
 * @param initialProductTypeId - Optional: pre-populate with existing product type (for editing)
 * @param onComplete - Callback when product type (level 3) is selected
 * @returns Navigation state and controls
 *
 * @example
 * ```tsx
 * const {
 *   currentLevel,
 *   currentOptions,
 *   selectOption,
 *   navigateBack,
 *   canNavigateBack,
 *   isComplete
 * } = useProgressiveCategorySelect(
 *   item?.productTypeId,
 *   (productTypeId) => form.setValue('productTypeId', productTypeId)
 * );
 * ```
 */
export function useProgressiveCategorySelect(
  initialProductTypeId?: string,
  onComplete?: (productTypeId: string) => void
): UseProgressiveCategorySelectReturn {
  const { categories, getOptionsForLevel, isLoading } = useCategories();

  // Navigation state
  const [state, setState] = useState<NavigationState>({
    level: 1,
    categoryId: null,
    subcategoryId: null,
    productTypeId: null,
  });

  // Initialize from existing productTypeId (for editing)
  useEffect(() => {
    if (initialProductTypeId && categories.length > 0) {
      // Derive parent IDs and set state to level 3 (complete)
      const { categoryId, subcategoryId } = getParentCategoryIds(initialProductTypeId, categories);

      if (categoryId && subcategoryId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
          level: 3,
          categoryId,
          subcategoryId,
          productTypeId: initialProductTypeId,
        });
      }
    }
  }, [initialProductTypeId, categories]);

  // Get options for current level
  const currentOptions = useMemo(() => {
    switch (state.level) {
      case 1:
        return getOptionsForLevel(1);
      case 2:
        return getOptionsForLevel(2, state.categoryId);
      case 3:
        return getOptionsForLevel(3, state.subcategoryId);
    }
  }, [state.level, state.categoryId, state.subcategoryId, getOptionsForLevel]);

  // Select an option and advance to next level
  const selectOption = useCallback(
    (optionId: string) => {
      switch (state.level) {
        case 1:
          // Selected category, move to level 2 (subcategory)
          setState({
            ...state,
            level: 2,
            categoryId: optionId,
            subcategoryId: null,
            productTypeId: null,
          });
          break;
        case 2:
          // Selected subcategory, move to level 3 (product type)
          setState({
            ...state,
            level: 3,
            subcategoryId: optionId,
            productTypeId: null,
          });
          break;
        case 3:
          // Selected product type, complete
          setState({
            ...state,
            productTypeId: optionId,
          });
          onComplete?.(optionId);
          break;
      }
    },
    [state, onComplete]
  );

  // Navigate back to previous level
  const navigateBack = useCallback(() => {
    switch (state.level) {
      case 2:
        // Go back to level 1
        setState({
          level: 1,
          categoryId: null,
          subcategoryId: null,
          productTypeId: null,
        });
        break;
      case 3:
        // Go back to level 2
        setState({
          ...state,
          level: 2,
          subcategoryId: null,
          productTypeId: null,
        });
        break;
    }
  }, [state]);

  // Reset to initial state
  const reset = useCallback(() => {
    setState({
      level: 1,
      categoryId: null,
      subcategoryId: null,
      productTypeId: null,
    });
  }, []);

  return {
    currentLevel: state.level,
    currentOptions,
    selectOption,
    navigateBack,
    canNavigateBack: state.level > 1,
    isComplete: state.productTypeId !== null,
    isLoading,
    reset,
  };
}
