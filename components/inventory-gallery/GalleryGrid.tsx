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
 */

import type { GearItem } from '@/types/gear';
import type { ViewDensity, SortOption, CategoryGroup } from '@/types/inventory';
import { GearCard } from './GearCard';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

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
}

// =============================================================================
// Grid Configuration by Density
// =============================================================================

const GRID_CLASSES = {
  // Compact: horizontal cards need more width - 1 col mobile, 2 cols tablet+
  compact: 'grid grid-cols-1 gap-3 md:grid-cols-2',
  // Standard: medium cards - 1 col mobile, 2 tablet, 3 desktop, 4 wide
  standard: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  // Detailed: large cards - fewer columns
  detailed: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3',
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
}: GalleryGridProps) {
  // Empty state when no items match filters
  if (items.length === 0 && hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No gear matches your filters
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or category filter
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  const gridClass = GRID_CLASSES[viewDensity] || GRID_CLASSES.standard;

  // Feature 046: Render with category separators when sorting by category
  if (sortOption === 'category' && groupedItems.length > 0) {
    return (
      <div className="space-y-8">
        {groupedItems.map((group) => (
          <section key={group.categoryId ?? 'uncategorized'}>
            {/* Category Separator Header */}
            <div className="mb-4 flex items-center gap-4">
              <h2 className="text-lg font-semibold text-foreground whitespace-nowrap">
                {group.categoryLabel}
              </h2>
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            {/* Items Grid */}
            <div className={cn(gridClass)}>
              {group.items.map((item) => (
                <GearCard
                  key={item.id}
                  item={item}
                  viewDensity={viewDensity}
                  onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Default: flat grid without separators
  return (
    <div className={cn(gridClass)}>
      {items.map((item) => (
        <GearCard
          key={item.id}
          item={item}
          viewDensity={viewDensity}
          onClick={onItemClick ? () => onItemClick(item.id) : undefined}
        />
      ))}
    </div>
  );
}
