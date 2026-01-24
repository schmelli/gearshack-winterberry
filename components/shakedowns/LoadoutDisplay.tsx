/**
 * LoadoutDisplay Component
 *
 * Feature: 001-community-shakedowns + Shakedown Detail Enhancement
 * Extracted from: ShakedownDetail.tsx
 *
 * Displays the loadout associated with a shakedown, including gear items grid.
 * Enhanced with search, filter, and sort functionality.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, MessageSquare, Package, Scale, Info, Eye } from 'lucide-react';

import type { FeedbackNode } from '@/types/shakedown';
import type { Loadout } from '@/types/loadout';
import type { ShakedownGearItem } from '@/hooks/shakedowns';
import { useShakedownGearFilters, type GearSortOption } from '@/hooks/shakedowns/useShakedownGearFilters';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShakedownGearToolbar } from './ShakedownGearToolbar';

export interface SelectedGearItem {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  weight?: number | null;
  imageUrl?: string | null;
}

interface LoadoutDisplayProps {
  loadout: Loadout;
  loadoutName: string;
  totalWeightGrams: number;
  itemCount: number;
  gearItems: ShakedownGearItem[];
  feedbackTree: FeedbackNode[];
  onItemClick: (item: SelectedGearItem) => void;
  /** Callback for viewing item details (opens detail modal) */
  onItemDetail?: (item: SelectedGearItem) => void;
  /** Show toolbar with search/filter/sort (default: true if > 5 items) */
  showToolbar?: boolean;
}

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

export function LoadoutDisplay({
  loadout,
  loadoutName,
  totalWeightGrams,
  itemCount,
  gearItems,
  feedbackTree,
  onItemClick,
  onItemDetail,
  showToolbar,
}: LoadoutDisplayProps): React.ReactElement {
  const t = useTranslations('Shakedowns.detail');

  // Determine if toolbar should be shown (default: show if > 5 items)
  const shouldShowToolbar = showToolbar ?? gearItems.length > 5;

  // Use filter hook
  const {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    sortOption,
    setSortOption,
    statusFilter,
    setStatusFilter,
    filteredItems,
    totalCount,
    filteredCount,
    hasActiveFilters,
    clearFilters,
  } = useShakedownGearFilters({
    gearItems,
    itemStates: loadout.itemStates,
  });

  const itemFeedbackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    feedbackTree.forEach((feedback) => {
      if (feedback.gearItemId) {
        counts[feedback.gearItemId] = (counts[feedback.gearItemId] || 0) + 1;
      }
    });
    return counts;
  }, [feedbackTree]);

  const handleItemClick = useCallback(
    (item: ShakedownGearItem) => {
      onItemClick({
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: item.productTypeId,
        weight: item.weightGrams,
        imageUrl: item.imageUrl,
      });
    },
    [onItemClick]
  );

  const handleItemDetail = useCallback(
    (e: React.MouseEvent, item: ShakedownGearItem) => {
      e.stopPropagation();
      if (onItemDetail) {
        onItemDetail({
          id: item.id,
          name: item.name,
          brand: item.brand,
          category: item.productTypeId,
          weight: item.weightGrams,
          imageUrl: item.imageUrl,
        });
      }
    },
    [onItemDetail]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, item: ShakedownGearItem) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleItemClick(item);
      }
    },
    [handleItemClick]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('loadoutInfo')}</CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href={`/loadouts/${loadout.id}`}>
              {t('viewLoadout')}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        <CardDescription>{loadoutName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weight and item count summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className="rounded-full bg-forest-100 p-2 dark:bg-forest-900/30">
              <Scale className="size-5 text-forest-600 dark:text-forest-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('totalWeight')}</p>
              <p className="font-semibold">{formatWeight(totalWeightGrams)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className="rounded-full bg-terracotta-100 p-2 dark:bg-terracotta-900/30">
              <Package className="size-5 text-terracotta-600 dark:text-terracotta-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('items')}</p>
              <p className="font-semibold">{t('itemCount', { count: itemCount })}</p>
            </div>
          </div>
        </div>

        {/* Activity types and seasons */}
        {((loadout.activityTypes && loadout.activityTypes.length > 0) ||
          (loadout.seasons && loadout.seasons.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {loadout.activityTypes?.map((activity) => (
              <Badge key={activity} variant="secondary" className="text-xs">
                {activity}
              </Badge>
            ))}
            {loadout.seasons?.map((season) => (
              <Badge key={season} variant="outline" className="text-xs">
                {season}
              </Badge>
            ))}
          </div>
        )}

        {/* Gear Items Section */}
        {gearItems.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t('clickToFeedback')}
              </p>

              {/* Toolbar with Search/Filter/Sort */}
              {shouldShowToolbar && (
                <ShakedownGearToolbar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  categoryFilter={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                  availableCategories={availableCategories}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                  totalCount={totalCount}
                  filteredCount={filteredCount}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={clearFilters}
                />
              )}

              {/* Gear Items Grid */}
              {filteredItems.length > 0 ? (
                <GearItemsGrid
                  items={filteredItems}
                  sortOption={sortOption}
                  itemFeedbackCounts={itemFeedbackCounts}
                  onItemClick={handleItemClick}
                  onItemDetail={onItemDetail ? handleItemDetail : undefined}
                  t={t}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('noItemsMatch')}</p>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      {t('clearFilters')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// GearItemsGrid Component - Handles category grouping
// =============================================================================

interface GearItemsGridProps {
  items: ShakedownGearItem[];
  sortOption: GearSortOption;
  itemFeedbackCounts: Record<string, number>;
  onItemClick: (item: ShakedownGearItem) => void;
  onItemDetail?: (e: React.MouseEvent, item: ShakedownGearItem) => void;
  t: ReturnType<typeof useTranslations>;
}

function GearItemsGrid({
  items,
  sortOption,
  itemFeedbackCounts,
  onItemClick,
  onItemDetail,
  t,
}: GearItemsGridProps): React.ReactElement {
  // Group items by category when sorting by category
  const groupedItems = useMemo(() => {
    if (sortOption !== 'category') {
      return [{ category: null, items }];
    }

    const groups: { category: string | null; items: ShakedownGearItem[] }[] = [];
    let currentCategory: string | null = null;
    let currentGroup: ShakedownGearItem[] = [];

    items.forEach((item) => {
      const itemCategory = item.categoryName || item.productTypeId || null;
      if (itemCategory !== currentCategory) {
        if (currentGroup.length > 0) {
          groups.push({ category: currentCategory, items: currentGroup });
        }
        currentCategory = itemCategory;
        currentGroup = [item];
      } else {
        currentGroup.push(item);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ category: currentCategory, items: currentGroup });
    }

    return groups;
  }, [items, sortOption]);

  const handleKeyDown = (e: React.KeyboardEvent, item: ShakedownGearItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onItemClick(item);
    }
  };

  return (
    <div className="space-y-4">
      {groupedItems.map((group, groupIndex) => (
        <div key={group.category || `group-${groupIndex}`}>
          {/* Category Divider */}
          {sortOption === 'category' && group.category && (
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs font-medium">
                {group.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({group.items.length})
              </span>
              <Separator className="flex-1" />
            </div>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const feedbackCount = itemFeedbackCounts[item.id] || 0;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onItemClick(item)}
                  onKeyDown={(e) => handleKeyDown(e, item)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg border p-3',
                    'cursor-pointer transition-colors',
                    'hover:bg-muted/50 hover:border-primary/30',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                  )}
                >
                  <Avatar className="size-10 rounded-md shrink-0">
                    {item.imageUrl ? (
                      <AvatarImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-md bg-muted">
                      <Package className="size-4 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.brand}
                      </p>
                    )}
                    {item.weightGrams !== null && (
                      <p className="text-xs text-muted-foreground">
                        {formatWeight(item.weightGrams)}
                      </p>
                    )}
                  </div>

                  {/* Feedback Count Badge */}
                  {feedbackCount > 0 && (
                    <div
                      className="absolute -top-1 -right-1 flex items-center justify-center
                        size-5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                      title={`${feedbackCount} feedback${feedbackCount !== 1 ? 's' : ''}`}
                    >
                      {feedbackCount}
                    </div>
                  )}

                  {/* Action Icons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {onItemDetail && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => onItemDetail(e, item)}
                            className="p-1 rounded hover:bg-muted transition-colors"
                            aria-label={t('viewDetails')}
                          >
                            <Eye className="size-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{t('viewDetails')}</TooltipContent>
                      </Tooltip>
                    )}
                    <MessageSquare
                      className="size-4 text-muted-foreground/50"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadoutDisplay;
