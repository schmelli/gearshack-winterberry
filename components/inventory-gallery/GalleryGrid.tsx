/**
 * GalleryGrid Component
 *
 * Feature: 002-inventory-gallery
 * Responsive CSS Grid container for gear cards
 *
 * Feature: 018-gearcard-hierarchy-polish
 * Adapts grid columns based on view density:
 * - Compact: 1-2 columns (horizontal cards need more width)
 * - Standard: 2-4 columns
 * - Detailed: 1-3 columns (large cards)
 *
 * Feature: 046-inventory-sorting
 * Supports category grouping with visual separators when sorting by category
 *
 * Feature: 054-gallery-virtualization
 * Uses react-virtuoso for virtualized rendering to improve performance with large collections (100+ items)
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import type { GearItem } from '@/types/gear';
import type { ViewDensity, SortOption, CategoryGroup } from '@/types/inventory';
import { GearCard } from './GearCard';
import { cn } from '@/lib/utils';
import { VirtuosoGrid, GroupedVirtuoso } from 'react-virtuoso';

// =============================================================================
// Types
// =============================================================================

/**
 * Translations for empty state messages
 * T073: Wishlist-specific empty state messages
 */
interface EmptyStateTranslations {
  noResults: string;
  noResultsSubtext: string;
  clearFilters: string;
}

interface GalleryGridProps {
  /** Items to display in the grid */
  items: GearItem[];
  /** Items grouped by category (Feature 046) */
  groupedItems?: CategoryGroup[];
  /** Current sort option (Feature 046) */
  sortOption?: SortOption;
  /** Current view density mode */
  viewDensity: ViewDensity;
  /** Whether filters are currently applied */
  hasActiveFilters?: boolean;
  /** Callback to clear filters */
  onClearFilters?: () => void;
  /** Callback when a gear card is clicked (Feature 045) */
  onItemClick?: (itemId: string) => void;
  /** Function to get translated item count string (Feature 046) */
  getItemCountLabel?: (count: number) => string;
  /** Context for card rendering - Feature 049: wishlist hides availability markers */
  context?: 'inventory' | 'wishlist';
  /** Feature 049 US3: Callback to move wishlist item to inventory */
  onMoveToInventory?: (itemId: string) => Promise<void>;
  /** Feature 049 US3: Callback after successful move (for navigation) */
  onMoveComplete?: () => void;
  /** T073: Optional translations for empty state, allows wishlist-specific messages */
  emptyStateTranslations?: EmptyStateTranslations;
}

// =============================================================================
// Grid Configuration by Density
// =============================================================================

const GRID_CLASSES = {
  // Compact: horizontal cards need more width - 1 col mobile, 2 cols tablet+
  compact: 'grid grid-cols-1 gap-3 md:grid-cols-2',
  // Standard: medium cards - 2 col mobile (compact grid), 2 tablet, 3 desktop, 4 wide
  standard: 'grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  // Detailed: large cards - fewer columns
  detailed: 'grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3',
} as const;

// =============================================================================
// Component
// =============================================================================

export function GalleryGrid({
  items,
  groupedItems = [],
  sortOption = 'dateAdded',
  viewDensity,
  hasActiveFilters = false,
  onClearFilters,
  onItemClick,
  getItemCountLabel,
  context = 'inventory',
  onMoveToInventory,
  onMoveComplete,
  emptyStateTranslations,
}: GalleryGridProps) {
  const t = useTranslations('Inventory');

  // T073: Use provided translations or fall back to translated defaults
  const emptyMessages = emptyStateTranslations ?? {
    noResults: t('emptyState.noResults'),
    noResultsSubtext: t('emptyState.noResultsSubtext'),
    clearFilters: t('emptyState.clearFilters'),
  };

  // Empty state when no items match filters
  if (items.length === 0 && hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          {emptyMessages.noResults}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {emptyMessages.noResultsSubtext}
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            {emptyMessages.clearFilters}
          </button>
        )}
      </div>
    );
  }

  const gridClass = GRID_CLASSES[viewDensity] || GRID_CLASSES.standard;

  // Feature 046: Render with category separators when sorting by category
  // Feature 054: Virtualize both groups AND items within groups for better performance
  // FIXED: GroupedVirtuoso's itemContent receives ITEM index, not group index.
  // We use groupContent for group headers and itemContent for individual items.
  if (sortOption === 'category' && groupedItems.length > 0) {
    // Build group counts array for GroupedVirtuoso
    const groupCounts: number[] = groupedItems.map((group) => group.items.length);

    // Build flat items array with group index tracking
    const flattenedItems: Array<{ item: GearItem; groupIndex: number }> = [];
    groupedItems.forEach((group, groupIndex) => {
      group.items.forEach((item) => {
        flattenedItems.push({ item, groupIndex });
      });
    });

    return (
      <GroupedVirtuoso
        useWindowScroll
        groupCounts={groupCounts}
        overscan={50}
        groupContent={(groupIndex: number) => {
          const group = groupedItems[groupIndex];
          if (!group) return null;

          return (
            <div className="mb-4 mt-8 first:mt-0 flex items-center gap-4 bg-background py-2">
              <h2 className="text-lg font-semibold text-foreground whitespace-nowrap">
                {group.categoryLabel}
              </h2>
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {getItemCountLabel ? getItemCountLabel(group.items.length) : `${group.items.length} items`}
              </span>
            </div>
          );
        }}
        itemContent={(index: number) => {
          // FIXED: index is the flat item index, not group index
          const flatItem = flattenedItems[index];
          if (!flatItem) return null;

          const { item } = flatItem;
          return (
            <div className={cn(gridClass, 'mb-2')}>
              <GearCard
                key={item.id}
                item={item}
                viewDensity={viewDensity}
                onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                context={context}
                onMoveToInventory={onMoveToInventory}
                onMoveComplete={onMoveComplete}
              />
            </div>
          );
        }}
      />
    );
  }

  // Default: flat grid without separators - virtualized for performance
  // Feature 054: Only render visible items to improve performance with 100+ items
  return (
    <VirtuosoGrid
      useWindowScroll
      totalCount={items.length}
      overscan={50}
      listClassName={cn(gridClass)}
      itemContent={(index) => {
        const item = items[index];
        if (!item) return null;

        return (
          <GearCard
            key={item.id}
            item={item}
            viewDensity={viewDensity}
            onClick={onItemClick ? () => onItemClick(item.id) : undefined}
            context={context}
            onMoveToInventory={onMoveToInventory}
            onMoveComplete={onMoveComplete}
          />
        );
      }}
    />
  );
}
