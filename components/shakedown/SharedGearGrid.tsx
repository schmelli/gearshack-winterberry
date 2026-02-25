'use client';

import type { SharedGearItem } from '@/types/sharing';
import type { ViewDensity } from '@/types/inventory';
import { useTranslations } from 'next-intl';
import { SharedGearCard } from './SharedGearCard';
import { cn } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';

// =============================================================================
// Types
// =============================================================================

interface SharedGearGridProps {
  /** Array of shared gear items to display */
  items: SharedGearItem[];
  /** Optional click handler for individual gear items */
  onItemClick?: (item: SharedGearItem) => void;
  /** Optional function to check if user owns an item */
  isOwned?: (itemId: string) => boolean;
  /** Optional function to check if item is on user's wishlist */
  isOnWishlist?: (itemId: string) => boolean;
  /** Optional handler for adding items to wishlist (T041) */
  onAddToWishlist?: (item: SharedGearItem) => void;
  /** Optional function to check if item is being added to wishlist */
  isAddingToWishlist?: (itemId: string) => boolean;
  /** Whether user is authenticated */
  isAuthenticated?: boolean;
  /** View density mode (defaults to 'standard') */
  viewDensity?: ViewDensity;
  /** Optional className for the grid container */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Groups items by categoryId for sectioned display
 */
function groupItemsByCategory(items: SharedGearItem[]): Map<string | null, SharedGearItem[]> {
  const grouped = new Map<string | null, SharedGearItem[]>();

  items.forEach((item) => {
    const categoryId = item.categoryId;
    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, []);
    }
    grouped.get(categoryId)!.push(item);
  });

  return grouped;
}

/**
 * Sorts categories alphabetically by label
 * Feature: 048-shared-loadout-enhancement (T030)
 * Updated: Uses Supabase categories instead of static taxonomy
 */
function sortCategoriesByLabel(
  categoryIds: (string | null)[],
  getCategoryLabel: (categoryId: string | null) => string
): (string | null)[] {
  return categoryIds.sort((a, b) => {
    // null (uncategorized) always goes last
    if (a === null) return 1;
    if (b === null) return -1;

    // Sort alphabetically by label
    const labelA = getCategoryLabel(a);
    const labelB = getCategoryLabel(b);
    return labelA.localeCompare(labelB);
  });
}

// =============================================================================
// Component
// =============================================================================

/**
 * SharedGearGrid - Displays shared gear items grouped by category
 *
 * Feature: 048-shared-loadout-enhancement (T013)
 *
 * Groups gear items by category and renders them in a grid layout with
 * section headers. Uses SharedGearCard for individual item rendering.
 */
export function SharedGearGrid({
  items,
  onItemClick,
  isOwned,
  isOnWishlist,
  onAddToWishlist,
  isAddingToWishlist,
  isAuthenticated = false,
  viewDensity = 'standard',
  className,
}: SharedGearGridProps) {
  const t = useTranslations('SharedLoadout');
  // Cascading Category Refactor: Use useCategories to get label function
  const { getLabelById } = useCategories();

  // Group items by category
  const groupedItems = groupItemsByCategory(items);

  // Sort categories alphabetically by label (T030)
  const sortedCategories = sortCategoriesByLabel(
    Array.from(groupedItems.keys()),
    getLabelById
  );

  // Grid column configuration based on view density
  const gridColsMap: Record<ViewDensity, string> = {
    compact: 'grid-cols-1',
    standard: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    detailed: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3',
  };
  const gridCols = gridColsMap[viewDensity];

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>{t('noGearItems')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {sortedCategories.map((categoryId) => {
        const categoryItems = groupedItems.get(categoryId)!;
        const categoryLabel = getLabelById(categoryId);

        return (
          <section key={categoryId ?? 'uncategorized'} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">
                {categoryLabel}
              </h3>
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground">
                {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Items Grid */}
            <div className={cn('grid gap-4', gridCols)}>
              {categoryItems.map((item) => (
                <SharedGearCard
                  key={item.id}
                  item={item}
                  onCardClick={onItemClick}
                  isOwned={isOwned?.(item.id)}
                  isOnWishlist={isOnWishlist?.(item.id)}
                  onAddToWishlist={onAddToWishlist}
                  isAddingToWishlist={isAddingToWishlist?.(item.id)}
                  isAuthenticated={isAuthenticated}
                  viewDensity={viewDensity}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
