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

import { useState } from 'react';
import Image from 'next/image';
import { Search, Check, Plus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GearDetailModal } from '@/components/gear-detail/GearDetailModal';
import { useMediaQuery } from '@/hooks/useGearDetailModal';
import type { GearItem } from '@/types/gear';
import { formatWeight, CATEGORY_LABELS } from '@/lib/loadout-utils';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-utils';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';

// =============================================================================
// Types
// =============================================================================

interface LoadoutPickerProps {
  items: GearItem[];
  loadoutItemIds: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddItem: (itemId: string) => void;
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
}: LoadoutPickerProps) {
  // Modal state for gear detail view (FR-017)
  const [selectedItem, setSelectedItem] = useState<GearItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Feature 045: Responsive detection for modal
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Cascading Category Refactor: Get categories for deriving categoryId from productTypeId
  const categories = useCategoriesStore((state) => state.categories);

  const handleOpenDetail = (item: GearItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search gear by name or brand..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items List */}
      <ScrollArea className="h-[calc(100vh-24rem)]">
        <div className="space-y-2 pr-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No items found
            </p>
          ) : (
            items.map((item) => {
              const isInLoadout = loadoutItemIds.includes(item.id);
              return (
                <PickerItem
                  key={item.id}
                  item={item}
                  isInLoadout={isInLoadout}
                  onAdd={() => onAddItem(item.id)}
                  onOpenDetail={() => handleOpenDetail(item)}
                />
              );
            })
          )}
        </div>
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
  onAdd: () => void;
  onOpenDetail: () => void;
}

function PickerItem({ item, isInLoadout, onAdd, onOpenDetail }: PickerItemProps) {
  // Micro-interaction state for Add button (US9)
  const [justAdded, setJustAdded] = useState(false);

  // Cascading Category Refactor: Derive categoryId (level 1) from productTypeId (level 3)
  const categories = useCategoriesStore((state) => state.categories);
  const { categoryId } = getParentCategoryIds(item.productTypeId, categories);

  // Handle add button click without triggering detail modal (FR-018)
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInLoadout) {
      onAdd();
      // Brief flash feedback (US9)
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 200);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors',
        isInLoadout
          ? 'border-primary/30 bg-primary/5'
          : 'hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {/* Item Image (FR-015, FR-016) */}
      <div className="relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.primaryImageUrl ? (
          <Image
            src={optimizeCloudinaryUrl(item.primaryImageUrl, { width: 112, quality: 'auto:good' })}
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
              ({CATEGORY_LABELS[categoryId] ?? categoryId})
            </span>
          )}
        </p>
      </div>

      {/* Add Button (FR-018: stopPropagation, US9: micro-interaction) */}
      <Button
        type="button"
        variant={isInLoadout ? 'ghost' : 'secondary'}
        size="sm"
        onClick={handleAddClick}
        disabled={isInLoadout}
        className={cn(
          'shrink-0 transition-colors duration-200',
          isInLoadout && 'opacity-50',
          justAdded && 'bg-primary text-primary-foreground'
        )}
        aria-label={isInLoadout ? `${item.name} already in loadout` : `Add ${item.name} to loadout`}
      >
        {justAdded ? (
          <Check className="h-4 w-4" />
        ) : isInLoadout ? (
          <Check className="h-4 w-4" />
        ) : (
          <>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </>
        )}
      </Button>
    </div>
  );
}
