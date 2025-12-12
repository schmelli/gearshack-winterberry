/**
 * Inventory Gallery Types
 *
 * Feature: 002-inventory-gallery
 * Constitution: Types MUST be defined in @/types directory
 *
 * Feature: 046-inventory-sorting
 * Added sorting functionality with category grouping
 */

import type { GearItem } from './gear';

// =============================================================================
// Sort Options
// =============================================================================

/**
 * Available sort options for the inventory gallery.
 *
 * - name: Sort alphabetically by item name (A-Z)
 * - category: Sort by category with visual separators between groups
 * - dateAdded: Sort by creation date (newest first)
 */
export type SortOption = 'name' | 'category' | 'dateAdded';

/**
 * UI Labels for sort options
 */
export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  name: 'Name',
  category: 'Category',
  dateAdded: 'Date Added',
};

/**
 * All sort options for iteration
 */
export const SORT_OPTIONS: SortOption[] = ['name', 'category', 'dateAdded'];

/**
 * Default sort option
 */
export const DEFAULT_SORT_OPTION: SortOption = 'dateAdded';

/**
 * Represents a group of gear items under a category heading.
 * Used when sorting by category to create visual separators.
 */
export interface CategoryGroup {
  /** Category ID (null for uncategorized items) */
  categoryId: string | null;
  /** Display label for the category */
  categoryLabel: string;
  /** Items belonging to this category */
  items: GearItem[];
}

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

  // Sorting (Feature 046)
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  /** Items grouped by category (only populated when sortOption === 'category') */
  groupedItems: CategoryGroup[];

  // Derived State
  hasActiveFilters: boolean;
  itemCount: number;
  filteredCount: number;
}
