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
 */

import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';
import { GearCard } from './GearCard';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface GalleryGridProps {
  /** Items to display in the grid */
  items: GearItem[];
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
