/**
 * GalleryGrid Component
 *
 * Feature: 002-inventory-gallery
 * Responsive CSS Grid container for gear cards
 */

import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';
import { GearCard } from './GearCard';

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
}

// =============================================================================
// Component
// =============================================================================

export function GalleryGrid({
  items,
  viewDensity,
  hasActiveFilters = false,
  onClearFilters,
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <GearCard key={item.id} item={item} viewDensity={viewDensity} />
      ))}
    </div>
  );
}
