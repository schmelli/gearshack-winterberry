/**
 * useChartFilter - Hook for chart segment filtering
 *
 * Feature: 006-ui-makeover
 * FR-012: Filter loadout list when user clicks a chart segment
 */

'use client';

import { useState, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ChartFilterState {
  /** Currently selected category ID, null = no filter */
  selectedCategoryId: string | null;
  /** Toggle filter on/off for a category */
  toggleCategory: (categoryId: string) => void;
  /** Clear all filters */
  clearFilter: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useChartFilter(): ChartFilterState {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategoryId((current) =>
      current === categoryId ? null : categoryId
    );
  }, []);

  const clearFilter = useCallback(() => {
    setSelectedCategoryId(null);
  }, []);

  return {
    selectedCategoryId,
    toggleCategory,
    clearFilter,
  };
}
