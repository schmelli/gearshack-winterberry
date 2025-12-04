/**
 * Inventory Gallery Types
 *
 * Feature: 002-inventory-gallery
 * Constitution: Types MUST be defined in @/types directory
 */

import type { GearItem } from './gear';

// =============================================================================
// View Density
// =============================================================================

/**
 * Controls how much information is displayed on each gear card.
 *
 * - compact: Image, Brand, Name only (minimal, quick scanning)
 * - standard: + Category, Weight, Status Badge (default, balanced view)
 * - detailed: + Notes snippet (maximum information)
 */
export type ViewDensity = 'compact' | 'standard' | 'detailed';

/**
 * UI Labels for view density options
 */
export const VIEW_DENSITY_LABELS: Record<ViewDensity, string> = {
  compact: 'Compact',
  standard: 'Standard',
  detailed: 'Detailed',
};

/**
 * All view density options for iteration
 */
export const VIEW_DENSITY_OPTIONS: ViewDensity[] = [
  'compact',
  'standard',
  'detailed',
];

// =============================================================================
// Filter State
// =============================================================================

/**
 * Current filter/search state for the inventory gallery.
 * Used internally by useInventory hook.
 */
export interface FilterState {
  /** Text search query (filters name and brand) */
  searchQuery: string;

  /** Selected category ID for filtering (null = all categories) */
  categoryFilter: string | null;
}

/**
 * Default filter state (no filters applied)
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  searchQuery: '',
  categoryFilter: null,
};

// =============================================================================
// Hook Return Type
// =============================================================================

/**
 * Return type for the useInventory hook.
 * Provides all state and actions needed by the gallery UI.
 */
export interface UseInventoryReturn {
  // Data
  items: GearItem[];
  filteredItems: GearItem[];
  isLoading: boolean;

  // View Density
  viewDensity: ViewDensity;
  setViewDensity: (density: ViewDensity) => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (categoryId: string | null) => void;
  clearFilters: () => void;

  // Derived State
  hasActiveFilters: boolean;
  itemCount: number;
  filteredCount: number;
}
