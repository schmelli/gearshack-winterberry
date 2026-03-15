/**
 * LoadoutList Component
 *
 * Feature: 005-loadout-management
 * FR-012: Group loadout items by category in the List panel
 * FR-015: Remove items from loadout on single click/tap
 *
 * Feature: 006-ui-makeover
 * FR-012: Filter loadout list when user clicks a chart segment
 * FR-023: Empty state with "Your pack is empty" message and guidance
 *
 * Feature: 007-grand-polish-sprint
 * US4: Advanced Weight Calculations - Worn/Consumable toggles
 *
 * Swipeable gear item cards:
 * On mobile/tablet, items support swipe-to-reveal actions (configurable in settings).
 * Desktop retains hover-based action buttons.
 */

'use client';

import { useMemo } from 'react';
import { X, Package, Shirt, Apple, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Image from 'next/image';
import type { GearItem } from '@/types/gear';
import { getSortedCategoryGroups, formatWeight, type SortOption } from '@/lib/loadout-utils';
import { useCategories } from '@/hooks/useCategories';
import { getLocalizedLabel, getParentCategoryIds } from '@/lib/utils/category-helpers';
import { getOptimizedImageUrl } from '@/lib/gear-utils';
import type { LighterAlternative } from '@/hooks/useLighterAlternatives';
import type { SwipeActionConfig } from '@/types/settings';
import { DEFAULT_USER_PREFERENCES } from '@/types/settings';
import { SwipeableCard } from '@/components/loadouts/SwipeableCard';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useSwipeActions } from '@/hooks/useSwipeActions';

// =============================================================================
// Types
// =============================================================================

interface LoadoutListProps {
  items: GearItem[];
  onRemoveItem: (itemId: string) => void;
  /** Swap an item with a lighter alternative */
  onSwapItem?: (currentItemId: string, alternativeItemId: string) => void;
  /** Filter to show only items from this category (FR-012: chart segment filter) */
  filterCategoryId?: string | null;
  /** Sort option to apply to items and categories */
  sortBy?: SortOption;
  /** Check if item is worn (US4) */
  isWorn: (itemId: string) => boolean;
  /** Check if item is consumable (US4) */
  isConsumable: (itemId: string) => boolean;
  /** Toggle worn state (US4) */
  onToggleWorn: (itemId: string) => void;
  /** Toggle consumable state (US4) */
  onToggleConsumable: (itemId: string) => void;
  /** Feature 045: Click to view gear details in modal */
  onItemClick?: (itemId: string) => void;
  /** Get lighter alternative for an item */
  getLighterAlternative?: (itemId: string) => LighterAlternative | null;
  /** Swipe action configuration (mobile/tablet) */
  swipeConfig?: SwipeActionConfig;
  /** Whether the device supports touch (below lg breakpoint) */
  isTouchDevice?: boolean;
  /** Duplicate an item in the loadout */
  onDuplicateItem?: (itemId: string) => void;
  /** Whether user prefers reduced animations */
  reduceAnimations?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function LoadoutList({
  items,
  onRemoveItem,
  onSwapItem,
  filterCategoryId,
  sortBy = 'category',
  isWorn,
  isConsumable,
  onToggleWorn,
  onToggleConsumable,
  onItemClick,
  getLighterAlternative,
  swipeConfig,
  isTouchDevice = false,
  onDuplicateItem,
  reduceAnimations = false,
}: LoadoutListProps) {
  const { categories, getLabelById } = useCategories();
  const locale = useLocale();
  const t = useTranslations('Loadouts');
  const isEmpty = items.length === 0;

  const swipeEnabled = isTouchDevice && !!swipeConfig;

  // Create category lookup map for O(1) access (Performance optimization)
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category.id, getLocalizedLabel(category, locale));
    });
    return map;
  }, [categories, locale]);

  // Separate worn items from bag items (Feature 150: Worn items on top)
  const wornItems = items.filter((item) => isWorn(item.id));
  const bagItems = items.filter((item) => !isWorn(item.id));

  // Group bag items by category
  const bagCategoryGroups = getSortedCategoryGroups(bagItems, categories, sortBy, locale);

  // Filter groups if a category is selected (FR-012: chart segment filter)
  const filteredBagGroups = filterCategoryId
    ? bagCategoryGroups.filter(([categoryId]) => categoryId === filterCategoryId)
    : bagCategoryGroups;

  const filteredWornItems = filterCategoryId
    ? wornItems.filter((item) => {
        const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
        return categoryId === filterCategoryId;
      })
    : wornItems;

  // FR-023: Empty state with helpful guidance (visible without scroll)
  if (isEmpty) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8">
        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">{t('emptyState.title')}</p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t('emptyState.description')}
        </p>
        <p className="mt-4 hidden text-center text-xs text-muted-foreground md:block">
          {t('clickToDrillDown')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100dvh-20rem)]">
      <div className="divide-y divide-border pr-4">
        {/* Worn Items Section (Feature 150: Worn items on top) */}
        {filteredWornItems.length > 0 && (
          <div className="pb-4">
            <h3 className="sticky top-0 z-20 mb-3 bg-background py-2 text-sm font-medium text-muted-foreground">
              {t('weightSummary.worn')}
            </h3>
            <div className="space-y-2">
              {filteredWornItems.map((item) => {
                const lighterAlt = getLighterAlternative?.(item.id) ?? null;
                return (
                  <LoadoutListItem
                    key={item.id}
                    item={item}
                    onRemove={() => onRemoveItem(item.id)}
                    onSwap={onSwapItem && lighterAlt ? () => onSwapItem(item.id, lighterAlt.alternativeItem.id) : undefined}
                    isWorn={isWorn(item.id)}
                    isConsumable={isConsumable(item.id)}
                    onToggleWorn={() => onToggleWorn(item.id)}
                    onToggleConsumable={() => onToggleConsumable(item.id)}
                    onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                    lighterAlternative={lighterAlt}
                    productTypeLabel={item.productTypeId ? getLabelById(item.productTypeId) : undefined}
                    t={t}
                    swipeConfig={swipeConfig}
                    swipeEnabled={swipeEnabled}
                    onDuplicate={onDuplicateItem ? () => onDuplicateItem(item.id) : undefined}
                    reduceAnimations={reduceAnimations}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state for worn items when filtering */}
        {filteredWornItems.length === 0 && filterCategoryId !== null && wornItems.length > 0 && (
          <div className="pb-4">
            <h3 className="sticky top-0 z-20 mb-3 bg-background py-2 text-sm font-medium text-muted-foreground">
              {t('weightSummary.worn')}
            </h3>
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('noWornItemsInCategory')}
            </p>
          </div>
        )}

        {/* Bag Items Grouped by Category */}
        {filteredBagGroups.map(([categoryId, categoryItems], index) => {
          const categoryLabel = categoryMap.get(categoryId) ?? categoryId;
          // Only add top padding if there are worn items above OR this is not the first bag category
          const shouldAddPadding = filteredWornItems.length > 0 || index > 0;

          return (
          <div key={categoryId} className={cn(shouldAddPadding && 'pt-4')}>
            {/* Category Header */}
            <h3 className="sticky top-0 z-20 mb-3 bg-background py-2 text-sm font-medium text-muted-foreground">
              {categoryLabel}
            </h3>

            {/* Items in Category */}
            <div className="space-y-2 pb-4">
              {categoryItems.map((item) => {
                const lighterAlt = getLighterAlternative?.(item.id) ?? null;
                return (
                  <LoadoutListItem
                    key={item.id}
                    item={item}
                    onRemove={() => onRemoveItem(item.id)}
                    onSwap={onSwapItem && lighterAlt ? () => onSwapItem(item.id, lighterAlt.alternativeItem.id) : undefined}
                    isWorn={isWorn(item.id)}
                    isConsumable={isConsumable(item.id)}
                    onToggleWorn={() => onToggleWorn(item.id)}
                    onToggleConsumable={() => onToggleConsumable(item.id)}
                    onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                    lighterAlternative={lighterAlt}
                    productTypeLabel={item.productTypeId ? getLabelById(item.productTypeId) : undefined}
                    t={t}
                    swipeConfig={swipeConfig}
                    swipeEnabled={swipeEnabled}
                    onDuplicate={onDuplicateItem ? () => onDuplicateItem(item.id) : undefined}
                    reduceAnimations={reduceAnimations}
                  />
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// =============================================================================
// List Item Sub-Component
// =============================================================================

interface LoadoutListItemProps {
  item: GearItem;
  onRemove: () => void;
  /** Swap with lighter alternative */
  onSwap?: () => void;
  isWorn: boolean;
  isConsumable: boolean;
  onToggleWorn: () => void;
  onToggleConsumable: () => void;
  /** Feature 045: Click to view gear details */
  onClick?: () => void;
  /** Lighter alternative info */
  lighterAlternative: LighterAlternative | null;
  /** Product type label for tooltip */
  productTypeLabel?: string;
  /** Translation function */
  t: ReturnType<typeof useTranslations<'Loadouts'>>;
  /** Swipe action configuration (mobile/tablet) */
  swipeConfig?: SwipeActionConfig;
  /** Whether swipe is enabled */
  swipeEnabled: boolean;
  /** Duplicate item callback */
  onDuplicate?: () => void;
  /** Whether to reduce animations */
  reduceAnimations: boolean;
}

function LoadoutListItem({
  item,
  onRemove,
  onSwap,
  isWorn,
  isConsumable,
  onToggleWorn,
  onToggleConsumable,
  onClick,
  lighterAlternative,
  productTypeLabel,
  t,
  swipeConfig,
  swipeEnabled,
  onDuplicate,
  reduceAnimations,
}: LoadoutListItemProps) {
  // Get optimized image URL (56x56 display * 2 for retina)
  const optimizedImageUrl = getOptimizedImageUrl(item, 56 * 2);

  // The card content — shared between swipeable and non-swipeable modes
  const cardContent = (
    <LoadoutListItemContent
      item={item}
      onRemove={onRemove}
      onSwap={onSwap}
      isWorn={isWorn}
      isConsumable={isConsumable}
      onToggleWorn={onToggleWorn}
      onToggleConsumable={onToggleConsumable}
      onClick={onClick}
      lighterAlternative={lighterAlternative}
      productTypeLabel={productTypeLabel}
      t={t}
      swipeEnabled={swipeEnabled}
      optimizedImageUrl={optimizedImageUrl}
    />
  );

  // Only mount swipe hooks when actually needed (perf: avoids useTranslations +
  // useMemo overhead for every item on desktop)
  if (swipeEnabled) {
    return (
      <SwipeableLoadoutListItem
        config={swipeConfig ?? DEFAULT_USER_PREFERENCES.swipeActions}
        onRemove={onRemove}
        onToggleWorn={onToggleWorn}
        onToggleConsumable={onToggleConsumable}
        onDuplicate={onDuplicate}
        onViewDetails={onClick}
        reduceAnimations={reduceAnimations}
      >
        {cardContent}
      </SwipeableLoadoutListItem>
    );
  }

  return cardContent;
}

// =============================================================================
// SwipeableLoadoutListItem — mounts swipe hooks only on touch devices
// =============================================================================

interface SwipeableLoadoutListItemProps {
  children: React.ReactNode;
  config: SwipeActionConfig;
  onRemove: () => void;
  onToggleWorn: () => void;
  onToggleConsumable: () => void;
  onDuplicate?: () => void;
  onViewDetails?: () => void;
  reduceAnimations: boolean;
}

function SwipeableLoadoutListItem({
  children,
  config,
  onRemove,
  onToggleWorn,
  onToggleConsumable,
  onDuplicate,
  onViewDetails,
  reduceAnimations,
}: SwipeableLoadoutListItemProps) {
  const swipeActions = useSwipeActions({
    config,
    onRemove,
    onToggleWorn,
    onToggleConsumable,
    onDuplicate,
    onViewDetails,
  });

  const swipeGesture = useSwipeGesture({
    enabled: true,
    reduceAnimations,
    onPrimaryAction: swipeActions.handlePrimaryAction,
    onSecondaryAction: swipeActions.handleSecondaryAction,
  });

  return (
    <SwipeableCard
      offsetX={swipeGesture.state.offsetX}
      shouldAnimate={swipeGesture.shouldAnimate}
      primaryReached={swipeGesture.state.primaryReached}
      secondaryReached={swipeGesture.state.secondaryReached}
      touchHandlers={swipeGesture.handlers}
      leftActions={swipeActions.leftActions}
      rightActions={swipeActions.rightActions}
    >
      {children}
    </SwipeableCard>
  );
}

// =============================================================================
// LoadoutListItemContent — pure UI for a single item row
// =============================================================================

interface LoadoutListItemContentProps {
  item: GearItem;
  onRemove: () => void;
  onSwap?: () => void;
  isWorn: boolean;
  isConsumable: boolean;
  onToggleWorn: () => void;
  onToggleConsumable: () => void;
  onClick?: () => void;
  lighterAlternative: LighterAlternative | null;
  productTypeLabel?: string;
  t: ReturnType<typeof useTranslations<'Loadouts'>>;
  swipeEnabled: boolean;
  optimizedImageUrl: string | null;
}

function LoadoutListItemContent({
  item,
  onRemove,
  onSwap,
  isWorn,
  isConsumable,
  onToggleWorn,
  onToggleConsumable,
  onClick,
  lighterAlternative,
  productTypeLabel,
  t,
  swipeEnabled,
  optimizedImageUrl,
}: LoadoutListItemContentProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-lg border bg-card p-3',
        'transition-colors',
        onClick ? 'cursor-pointer hover:border-primary/50 hover:bg-muted/50' : 'hover:border-destructive/50 hover:bg-destructive/5'
      )}
    >
      {/* Item Image */}
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
      </div>

      {/* Item Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium">{item.name}</p>
          {/* Lighter alternative: tooltip on desktop, compact badge on touch */}
          {lighterAlternative && !swipeEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="shrink-0 text-amber-500"
                  onClick={(e) => e.stopPropagation()}
                  role="img"
                  aria-label={t('itemActions.lighterAlternativeAvailable')}
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">
                  {t('lighterAlternativeTooltip', {
                    productType: productTypeLabel ?? 'item',
                    itemName: lighterAlternative.alternativeItem.name,
                    weight: formatWeight(lighterAlternative.alternativeItem.weightGrams),
                  })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('itemActions.saveWeight', { weight: formatWeight(lighterAlternative.weightSavings) })}
                </p>
                {onSwap && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwap();
                    }}
                  >
                    <ArrowLeftRight className="mr-2 h-3 w-3" />
                    {t('itemActions.swapItem')}
                  </Button>
                )}
              </TooltipContent>
            </Tooltip>
          )}
          {lighterAlternative && swipeEnabled && (
            <span
              className="shrink-0 text-amber-500"
              role="img"
              aria-label={t('itemActions.lighterAlternativeAvailable')}
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-muted-foreground">
            {item.brand && <span>{item.brand} · </span>}
            <span>{formatWeight(item.weightGrams)}</span>
          </p>
          {/* Status indicators for touch mode (replacing hover buttons) */}
          {swipeEnabled && (isWorn || isConsumable) && (
            <div className="flex items-center gap-1">
              {isWorn && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20">
                  <Shirt className="h-2.5 w-2.5 text-primary" />
                </span>
              )}
              {isConsumable && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600/20">
                  <Apple className="h-2.5 w-2.5 text-amber-600" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Worn and Consumable Toggles (US4) - desktop only */}
      {!swipeEnabled && (
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <WornToggle pressed={isWorn} onPressedChange={onToggleWorn} />
          <ConsumableToggle pressed={isConsumable} onPressedChange={onToggleConsumable} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={onRemove}
            aria-label={t('itemActions.removeFromLoadout', { name: item.name })}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// WornToggle Sub-Component (US4)
// =============================================================================

interface WornToggleProps {
  pressed: boolean;
  onPressedChange: () => void;
}

function WornToggle({ pressed, onPressedChange }: WornToggleProps) {
  const t = useTranslations('Loadouts.itemActions');
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      size="sm"
      aria-label={t('markAsWorn')}
      className={cn(
        'h-8 w-8 data-[state=on]:bg-primary/20 data-[state=on]:text-primary',
        'hover:bg-muted'
      )}
    >
      <Shirt className="h-4 w-4" />
    </Toggle>
  );
}

// =============================================================================
// ConsumableToggle Sub-Component (US4)
// =============================================================================

interface ConsumableToggleProps {
  pressed: boolean;
  onPressedChange: () => void;
}

function ConsumableToggle({ pressed, onPressedChange }: ConsumableToggleProps) {
  const t = useTranslations('Loadouts.itemActions');
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      size="sm"
      aria-label={t('markAsConsumable')}
      className={cn(
        'h-8 w-8 data-[state=on]:bg-accent/20 data-[state=on]:text-accent',
        'hover:bg-muted'
      )}
    >
      <Apple className="h-4 w-4" />
    </Toggle>
  );
}
