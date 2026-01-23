/**
 * LoadoutDisplay Component
 *
 * Feature: 001-community-shakedowns + Shakedown Detail Enhancement
 * Extracted from: ShakedownDetail.tsx
 *
 * Displays the loadout associated with a shakedown, including gear items grid.
 * Enhanced with search, filter, and sort functionality.
 * Enhanced: Parent category grouping, weight distribution donut, feedback tooltips.
 */

'use client';

import { useCallback, useMemo, lazy, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronRight, MessageSquare, Package, Scale, Eye } from 'lucide-react';

import type { FeedbackNode } from '@/types/shakedown';
import type { Loadout } from '@/types/loadout';
import type { ShakedownGearItem } from '@/hooks/shakedowns';
import type { GearItem } from '@/types/gear';
import { useShakedownGearFilters, type GearSortOption } from '@/hooks/shakedowns/useShakedownGearFilters';
import { useCategories } from '@/hooks/useCategories';
import { getParentCategoryIds, getLocalizedLabel } from '@/lib/utils/category-helpers';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ShakedownGearToolbar } from './ShakedownGearToolbar';

// Lazy load the donut chart for better performance
const EnhancedWeightDonut = lazy(() =>
  import('@/components/loadouts/EnhancedWeightDonut').then((m) => ({
    default: m.EnhancedWeightDonut,
  }))
);

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
  /** Show weight distribution donut chart */
  showDonut?: boolean;
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
  showDonut = true,
}: LoadoutDisplayProps): React.ReactElement {
  const t = useTranslations('Shakedowns.detail');
  const locale = useLocale();
  const { categories } = useCategories();

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

  // Build feedback counts and map feedback content by item ID
  const { itemFeedbackCounts, itemFeedbackMap } = useMemo(() => {
    const counts: Record<string, number> = {};
    const feedbackMap: Record<string, FeedbackNode[]> = {};
    feedbackTree.forEach((feedback) => {
      if (feedback.gearItemId) {
        counts[feedback.gearItemId] = (counts[feedback.gearItemId] || 0) + 1;
        if (!feedbackMap[feedback.gearItemId]) {
          feedbackMap[feedback.gearItemId] = [];
        }
        feedbackMap[feedback.gearItemId].push(feedback);
      }
    });
    return { itemFeedbackCounts: counts, itemFeedbackMap: feedbackMap };
  }, [feedbackTree]);

  // Build parent category map for grouping (level 1 categories)
  const parentCategoryMap = useMemo(() => {
    const map: Record<string, { id: string; label: string }> = {};
    gearItems.forEach((item) => {
      if (item.productTypeId && categories.length > 0) {
        const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
        if (categoryId) {
          const category = categories.find((c) => c.id === categoryId);
          if (category) {
            map[item.productTypeId] = {
              id: categoryId,
              label: getLocalizedLabel(category, locale),
            };
          }
        }
      }
    });
    return map;
  }, [gearItems, categories, locale]);

  // Get available parent categories for the filter dropdown
  const availableParentCategories = useMemo(() => {
    const uniqueCategories = new Map<string, string>();
    Object.values(parentCategoryMap).forEach(({ id, label }) => {
      uniqueCategories.set(id, label);
    });
    return Array.from(uniqueCategories.entries())
      .map(([id, label]) => label)
      .sort();
  }, [parentCategoryMap]);

  // Convert ShakedownGearItem[] to GearItem[] for the donut chart
  // Only the fields used by EnhancedWeightDonut: productTypeId, weightGrams
  const gearItemsForDonut = useMemo<GearItem[]>(() => {
    return gearItems.map((item): GearItem => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      description: item.description,
      brandUrl: null,
      modelNumber: null,
      productUrl: null,
      productTypeId: item.productTypeId,
      weightGrams: item.weightGrams,
      weightDisplayUnit: 'g',
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      size: null,
      color: null,
      volumeLiters: null,
      materials: null,
      tentConstruction: null,
      pricePaid: null,
      currency: null,
      purchaseDate: null,
      retailer: null,
      retailerUrl: null,
      manufacturerPrice: null,
      manufacturerCurrency: null,
      primaryImageUrl: item.imageUrl,
      galleryImageUrls: [],
      condition: 'used',
      status: 'own',
      notes: null,
      quantity: 1,
      isFavourite: false,
      isForSale: false,
      canBeBorrowed: false,
      canBeTraded: false,
      sourceMerchantId: null,
      sourceOfferId: null,
      sourceLoadoutId: null,
      dependencyIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }, [gearItems]);

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
        {/* Weight Summary with Donut */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Stats Cards */}
          <div className="flex-1 grid grid-cols-2 gap-4">
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
                <p className="text-xs text-muted-foreground">Items</p>
                <p className="font-semibold">{t('itemCount', { count: itemCount })}</p>
              </div>
            </div>
          </div>

          {/* Weight Distribution Donut */}
          {showDonut && gearItemsForDonut.length > 0 && (
            <div className="flex justify-center md:justify-end">
              <Suspense
                fallback={
                  <div className="size-[200px] flex items-center justify-center">
                    <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                }
              >
                <EnhancedWeightDonut items={gearItemsForDonut} size={200} />
              </Suspense>
            </div>
          )}
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
                  availableCategories={availableParentCategories.length > 0 ? availableParentCategories : availableCategories}
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
                  itemFeedbackMap={itemFeedbackMap}
                  parentCategoryMap={parentCategoryMap}
                  categories={categories}
                  locale={locale}
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
  itemFeedbackMap: Record<string, FeedbackNode[]>;
  parentCategoryMap: Record<string, { id: string; label: string }>;
  categories: Array<{ id: string; parentId: string | null; level: number; label: string; i18n?: { en: string; de?: string } | null }>;
  locale: string;
  onItemClick: (item: ShakedownGearItem) => void;
  onItemDetail?: (e: React.MouseEvent, item: ShakedownGearItem) => void;
  t: ReturnType<typeof useTranslations>;
}

function GearItemsGrid({
  items,
  sortOption,
  itemFeedbackCounts,
  itemFeedbackMap,
  parentCategoryMap,
  categories,
  locale,
  onItemClick,
  onItemDetail,
  t,
}: GearItemsGridProps): React.ReactElement {
  // Group items by parent category (level 1) when sorting by category
  type CategoryGroup = { category: string | null; categoryId: string | null; items: ShakedownGearItem[] };
  const groupedItems = useMemo((): CategoryGroup[] => {
    if (sortOption !== 'category') {
      return [{ category: null, categoryId: null, items }];
    }

    // Group by parent category (level 1)
    const categoryGroups = new Map<string, { label: string; items: ShakedownGearItem[] }>();
    const uncategorized: ShakedownGearItem[] = [];

    items.forEach((item) => {
      const parentCat = item.productTypeId ? parentCategoryMap[item.productTypeId] : null;
      if (parentCat) {
        const existing = categoryGroups.get(parentCat.id);
        if (existing) {
          existing.items.push(item);
        } else {
          categoryGroups.set(parentCat.id, { label: parentCat.label, items: [item] });
        }
      } else {
        uncategorized.push(item);
      }
    });

    // Convert to array and sort by label
    const groups: CategoryGroup[] = Array.from(categoryGroups.entries())
      .map(([id, { label, items: groupItems }]): CategoryGroup => ({
        category: label,
        categoryId: id,
        items: groupItems,
      }))
      .sort((a, b) => (a.category || '').localeCompare(b.category || ''));

    // Add uncategorized items at the end if any
    if (uncategorized.length > 0) {
      groups.push({ category: t('uncategorized'), categoryId: null, items: uncategorized });
    }

    return groups;
  }, [items, sortOption, parentCategoryMap, t]);

  const handleKeyDown = (e: React.KeyboardEvent, item: ShakedownGearItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onItemClick(item);
    }
  };

  return (
    <div className="space-y-4">
      {groupedItems.map((group, groupIndex) => (
        <div key={group.categoryId || `group-${groupIndex}`}>
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
              const feedbackItems = itemFeedbackMap[item.id] || [];

              return (
                <GearItemCard
                  key={item.id}
                  item={item}
                  feedbackCount={feedbackCount}
                  feedbackItems={feedbackItems}
                  onItemClick={onItemClick}
                  onItemDetail={onItemDetail}
                  onKeyDown={handleKeyDown}
                  t={t}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// GearItemCard Component - Individual item with feedback hover
// =============================================================================

interface GearItemCardProps {
  item: ShakedownGearItem;
  feedbackCount: number;
  feedbackItems: FeedbackNode[];
  onItemClick: (item: ShakedownGearItem) => void;
  onItemDetail?: (e: React.MouseEvent, item: ShakedownGearItem) => void;
  onKeyDown: (e: React.KeyboardEvent, item: ShakedownGearItem) => void;
  t: ReturnType<typeof useTranslations>;
}

function GearItemCard({
  item,
  feedbackCount,
  feedbackItems,
  onItemClick,
  onItemDetail,
  onKeyDown,
  t,
}: GearItemCardProps): React.ReactElement {
  const cardContent = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onItemClick(item)}
      onKeyDown={(e) => onKeyDown(e, item)}
      className={cn(
        'relative flex items-center gap-3 rounded-lg border p-3',
        'cursor-pointer transition-colors',
        'hover:bg-muted/50 hover:border-primary/30',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        feedbackCount > 0 && 'border-primary/20'
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
          className={cn(
            'size-4',
            feedbackCount > 0 ? 'text-primary' : 'text-muted-foreground/50'
          )}
          aria-hidden="true"
        />
      </div>
    </div>
  );

  // If there's feedback, wrap in HoverCard to show preview
  if (feedbackCount > 0 && feedbackItems.length > 0) {
    return (
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>{cardContent}</HoverCardTrigger>
        <HoverCardContent className="w-80" side="top" align="start">
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="size-4" />
              {t('feedbackPreview', { count: feedbackCount })}
            </p>
            <Separator />
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {feedbackItems.slice(0, 3).map((feedback) => (
                <div key={feedback.id} className="text-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    {feedback.authorName}
                  </p>
                  <p className="line-clamp-2">{feedback.content}</p>
                </div>
              ))}
              {feedbackItems.length > 3 && (
                <p className="text-xs text-muted-foreground italic">
                  {t('moreFeedback', { count: feedbackItems.length - 3 })}
                </p>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return cardContent;
}

export default LoadoutDisplay;
