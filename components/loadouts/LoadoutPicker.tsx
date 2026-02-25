/**
 * LoadoutPicker Component
 *
 * Feature: 005-loadout-management
 * FR-013: Provide a searchable item picker from inventory
 * FR-014: Add items to loadout on single click/tap
 * FR-016: Display visual feedback when items are added
 *
 * Feature: 006-ui-makeover
 * FR-015: Display gear images with aspect-ratio container
 * FR-016: Show Package icon fallback for items without images
 * FR-017: Click card body to open detail modal
 * FR-018: Add button click does NOT trigger modal (stopPropagation)
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Search, Check, Plus, Package } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';
import { useMediaQuery } from '@/hooks/useGearDetailModal';
import type { GearItem } from '@/types/gear';
import { formatWeight, getSortedCategoryGroups, type SortOption } from '@/lib/loadout-utils';
import { getOptimizedImageUrl } from '@/lib/gear-utils';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getParentCategoryIds, getLocalizedLabel } from '@/lib/utils/category-helpers';

// =============================================================================
// Types
// =============================================================================

interface LoadoutPickerProps {
  items: GearItem[];
  loadoutItemIds: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddItem: (itemId: string) => void;
  sortBy?: SortOption;
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutPicker({
  items,
  loadoutItemIds,
  searchQuery,
  onSearchChange,
  onAddItem,
  sortBy = 'category',
}: LoadoutPickerProps) {
  // Modal state for gear detail view (FR-017)
  const [selectedItem, setSelectedItem] = useState<GearItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Feature 045: Responsive detection for modal
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Cascading Category Refactor: Get categories for deriving categoryId from productTypeId
  const categories = useCategoriesStore((state) => state.categories);
  const locale = useLocale();
  const t = useTranslations('Inventory');

  // Create category lookup map for O(1) access (Performance optimization)
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category.id, getLocalizedLabel(category, locale));
    });
    return map;
  }, [categories, locale]);

  const handleOpenDetail = (item: GearItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  // Group items by category when sorting by category
  const categoryGroups = sortBy === 'category'
    ? getSortedCategoryGroups(items, categories, sortBy, locale)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items List */}
      <ScrollArea className="h-[calc(100vh-24rem)]">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('noItemsFound')}
          </p>
        ) : categoryGroups ? (
          // Show grouped by category with separators
          <div className="divide-y divide-border pr-4">
            {categoryGroups.map(([categoryId, categoryItems], index) => {
              const categoryLabel = categoryMap.get(categoryId) ?? categoryId;

              return (
                <div key={categoryId} className={cn(index > 0 && 'pt-4')}>
                  {/* Category Header */}
                  <h3 className="sticky top-0 z-20 mb-3 bg-background py-2 text-sm font-medium text-muted-foreground">
                    {categoryLabel}
                  </h3>

                  {/* Items in Category */}
                  <div className="space-y-2 pb-4">
                    {categoryItems.map((item) => {
                      const addedCount = loadoutItemIds.filter(id => id === item.id).length;
                      const maxQuantity = item.quantity ?? 1;
                      const isFullyAdded = addedCount >= maxQuantity;
                      const isInLoadout = addedCount > 0;
                      return (
                        <PickerItem
                          key={item.id}
                          item={item}
                          isInLoadout={isInLoadout}
                          isFullyAdded={isFullyAdded}
                          addedCount={addedCount}
                          maxQuantity={maxQuantity}
                          onAdd={() => onAddItem(item.id)}
                          onOpenDetail={() => handleOpenDetail(item)}
                          categoryMap={categoryMap}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Show flat list for other sort options
          <div className="space-y-2 pr-4">
            {items.map((item) => {
              const addedCount = loadoutItemIds.filter(id => id === item.id).length;
              const maxQuantity = item.quantity ?? 1;
              const isFullyAdded = addedCount >= maxQuantity;
              const isInLoadout = addedCount > 0;
              return (
                <PickerItem
                  key={item.id}
                  item={item}
                  isInLoadout={isInLoadout}
                  isFullyAdded={isFullyAdded}
                  addedCount={addedCount}
                  maxQuantity={maxQuantity}
                  onAdd={() => onAddItem(item.id)}
                  onOpenDetail={() => handleOpenDetail(item)}
                  categoryMap={categoryMap}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Gear Detail Modal (FR-017, Feature 045) */}
      <GearDetailModal
        item={selectedItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
        isMobile={isMobile}
      />
    </div>
  );
}

// =============================================================================
// Picker Item Sub-Component
// =============================================================================

interface PickerItemProps {
  item: GearItem;
  isInLoadout: boolean;
  isFullyAdded: boolean;
  addedCount: number;
  maxQuantity: number;
  onAdd: () => void;
  onOpenDetail: () => void;
  categoryMap: Map<string, string>;
}

function PickerItem({
  item,
  isInLoadout,
  isFullyAdded,
  addedCount,
  maxQuantity,
  onAdd,
  onOpenDetail,
  categoryMap,
}: PickerItemProps) {
  const t = useTranslations('Loadouts');
  // Micro-interaction state for Add button (US9)
  const [justAdded, setJustAdded] = useState(false);
  // Timer ref for feedback cleanup
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Cascading Category Refactor: Derive categoryId (level 1) from productTypeId (level 3)
  const categories = useCategoriesStore((state) => state.categories);
  const { categoryId } = getParentCategoryIds(item.productTypeId, categories);

  // The image container is 56x56px (h-14, w-14). Request a 2x resolution image for high-density displays.
  const optimizedImageUrl = getOptimizedImageUrl(item, 56 * 2);

  // Handle add button click without triggering detail modal (FR-018)
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFullyAdded) {
      onAdd();
      // FIXED: Clear previous timeout to prevent memory leak on rapid clicks
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      // Brief flash feedback (US9)
      setJustAdded(true);
      feedbackTimeoutRef.current = setTimeout(() => setJustAdded(false), 200);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isFullyAdded ? -1 : 0}
      onClick={isFullyAdded ? undefined : onOpenDetail}
      onKeyDown={isFullyAdded ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
        isFullyAdded
          ? 'cursor-not-allowed opacity-50 border-muted'
          : isInLoadout
            ? 'cursor-pointer border-primary/30 bg-primary/5'
            : 'cursor-pointer hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {/* Item Image (FR-015, FR-016, Feature 019: optimized image selection) */}
      <div className="relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {optimizedImageUrl ? (
          <Image
            src={optimizedImageUrl}
            alt={item.name}
            fill
            loading="lazy"
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {/* Already in loadout overlay */}
        {isInLoadout && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/80">
            <Check className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {item.brand && <span>{item.brand} · </span>}
          <span>{formatWeight(item.weightGrams)}</span>
          {categoryId && (
            <span className="ml-2 text-xs">
              ({categoryMap.get(categoryId) ?? categoryId})
            </span>
          )}
        </p>
      </div>

      {/* Add Button (FR-018: stopPropagation, US9: micro-interaction) */}
      <Button
        type="button"
        variant={isFullyAdded ? 'ghost' : isInLoadout ? 'outline' : 'secondary'}
        size="sm"
        onClick={handleAddClick}
        disabled={isFullyAdded}
        className={cn(
          'shrink-0 transition-colors duration-200',
          isFullyAdded && 'opacity-50',
          justAdded && 'bg-primary text-primary-foreground'
        )}
        aria-label={
          isFullyAdded
            ? `${item.name} fully added to loadout`
            : isInLoadout
              ? `Add another ${item.name} (${addedCount}/${maxQuantity})`
              : `Add ${item.name} to loadout`
        }
      >
        {justAdded ? (
          <Check className="h-4 w-4" />
        ) : isFullyAdded ? (
          <>
            <Check className="h-4 w-4" />
            {maxQuantity > 1 && <span className="ml-1 text-xs">{addedCount}/{maxQuantity}</span>}
          </>
        ) : isInLoadout ? (
          <>
            <Plus className="mr-1 h-4 w-4" />
            <span className="text-xs">{addedCount}/{maxQuantity}</span>
          </>
        ) : (
          <>
            <Plus className="mr-1 h-4 w-4" />
            {t('picker.add')}
          </>
        )}
      </Button>
    </div>
  );
}
