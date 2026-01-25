'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, ExternalLink, StickyNote, FileText, ChevronRight } from 'lucide-react';

import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';
import type { WishlistItemAvailability } from '@/types/wishlist';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { formatWeightForDisplay, getOptimizedImageUrl } from '@/lib/gear-utils';
import { SpecIcon } from '@/components/gear/SpecIcon';
import { TopPricesDisplay } from '@/components/wishlist/TopPricesDisplay';
import { TopRetailPricesDisplay } from '@/components/wishlist/TopRetailPricesDisplay';
import { MsrpPriceDisplay } from '@/components/wishlist/MsrpPriceDisplay';
import { MoveToInventoryButton } from '@/components/wishlist/MoveToInventoryButton';
import { CommunityAvailabilityPanel } from '@/components/wishlist/CommunityAvailabilityPanel';
import { useCategoryBreadcrumb } from '@/hooks/useCategoryBreadcrumb';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';
import { useWishlistPriceResults } from '@/hooks/price-tracking/useWishlistPriceResults';
import { useMsrpPrice } from '@/hooks/price-tracking/useMsrpPrice';

import { CategoryPlaceholder } from './CategoryPlaceholder';
import { StatusIcons } from './StatusIcons';
import { QuantityBadge } from './QuantityBadge';

// =============================================================================
// Types
// =============================================================================

interface GearCardProps {
  item: GearItem;
  viewDensity: ViewDensity;
  onClick?: () => void;
  context?: 'inventory' | 'wishlist';
  onMoveToInventory?: (itemId: string) => Promise<void>;
  onMoveComplete?: () => void;
  communityAvailability?: WishlistItemAvailability | null;
  communityAvailabilityLoading?: boolean;
  onViewCommunityItem?: (itemId: string, ownerId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function GearCard({
  item,
  viewDensity,
  onClick,
  context = 'inventory',
  onMoveToInventory,
  onMoveComplete,
  communityAvailability,
  communityAvailabilityLoading = false,
  onViewCommunityItem,
}: GearCardProps): React.ReactElement {
  const t = useTranslations('GearDetail');
  const [imageError, setImageError] = useState(false);

  const statusTranslations = {
    favourite: t('badges.favouriteTooltip'),
    forSale: t('badges.forSaleTooltip'),
    borrowable: t('badges.borrowableTooltip'),
    tradeable: t('badges.tradeableTooltip'),
    lent: t('badges.lentTooltip'),
    sold: t('badges.soldTooltip'),
  };

  const imageWidth = viewDensity === 'compact' ? 160 : viewDensity === 'detailed' ? 1200 : 800;
  const optimizedImageUrl = getOptimizedImageUrl(item, imageWidth);
  const showImage = optimizedImageUrl && !imageError;
  const isCompact = viewDensity === 'compact';
  const isDetailed = viewDensity === 'detailed';
  const isStandard = viewDensity === 'standard';

  const showAvailabilityMarkers = context === 'inventory';
  const isWishlistContext = context === 'wishlist';
  const showCommunityAvailability = isWishlistContext && (isStandard || isDetailed);

  const { priceResults, isLoading: priceResultsLoading } = useWishlistPriceResults(
    isWishlistContext ? item.id : ''
  );

  const { msrp, isLoading: msrpLoading } = useMsrpPrice(
    isWishlistContext ? item.name : null,
    isWishlistContext ? item.brand : null,
    isWishlistContext
  );

  const { breadcrumb, productTypeLabel } = useCategoryBreadcrumb(item.productTypeId);
  const categories = useCategoriesStore((state) => state.categories);
  const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
  const weightDisplay = formatWeightForDisplay(item.weightGrams);

  // =========================================================================
  // US1: Compact view - horizontal layout
  // =========================================================================
  if (isCompact) {
    return (
      <Card
        className={cn(
          'group relative overflow-hidden cursor-pointer',
          'flex flex-row items-center h-20',
          'border-stone-200 dark:border-stone-700 shadow-sm',
          'transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600'
        )}
        onClick={onClick}
      >
        <div className="h-20 w-20 flex-shrink-0 bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 relative flex items-center justify-center border-r border-stone-100 dark:border-stone-800">
          {showImage ? (
            <Image
              src={optimizedImageUrl}
              alt={item.name}
              fill
              loading="lazy"
              className="object-contain p-1.5"
              sizes="80px"
              onError={() => setImageError(true)}
            />
          ) : (
            <CategoryPlaceholder categoryId={categoryId} size="sm" className="h-10 w-10" />
          )}
          {showAvailabilityMarkers && (
            <StatusIcons
              item={item}
              translations={statusTranslations}
              className="absolute top-1 left-1 scale-75 origin-top-left"
            />
          )}
          <QuantityBadge quantity={item.quantity} className="absolute top-1 right-1 scale-75 origin-top-right" />
        </div>

        <div className="flex flex-1 flex-col justify-center px-4 py-1.5 min-w-0">
          <div className="flex justify-between items-baseline gap-2">
            <h3 className="text-sm font-medium leading-tight line-clamp-1 text-foreground">{item.name}</h3>
            {item.weightGrams && (
              <span className="text-xs text-muted-foreground flex-shrink-0 font-mono flex items-center gap-1">
                <SpecIcon type="weight" size={12} className="opacity-60" />
                {weightDisplay}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            {item.brand && <p className="text-xs text-muted-foreground truncate max-w-[120px]">{item.brand}</p>}
            {productTypeLabel && (
              <>
                <span className="text-[10px] text-stone-300 dark:text-stone-700">*</span>
                <span className="text-xs text-muted-foreground truncate">{productTypeLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isWishlistContext && onMoveToInventory ? (
            <MoveToInventoryButton
              itemId={item.id}
              itemName={item.name}
              onMove={onMoveToInventory}
              onMoveComplete={onMoveComplete}
              variant="ghost"
              iconOnly
              className="h-8 w-8 text-muted-foreground hover:text-primary"
            />
          ) : (
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/inventory/${item.id}/edit`}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">{t('actions.edit')}</span>
              </Link>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // =========================================================================
  // US2/US3: Standard and Detailed views - vertical layout
  // =========================================================================
  return (
    <Card
      className={cn(
        'group relative overflow-hidden cursor-pointer flex flex-col',
        'border-stone-200 dark:border-stone-700 shadow-sm',
        'transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600',
        isDetailed ? 'min-h-[450px]' : 'min-h-[260px]'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'relative bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 flex items-center justify-center border-b border-stone-100 dark:border-stone-800',
          isDetailed ? 'aspect-square' : 'aspect-[3/2]'
        )}
      >
        {showImage ? (
          <Image
            src={optimizedImageUrl}
            alt={item.name}
            fill
            loading="lazy"
            className="object-contain p-4 transition-transform group-hover:scale-105 duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <CategoryPlaceholder
            categoryId={categoryId}
            size={isDetailed ? 'lg' : 'md'}
            className="h-full w-full rounded-none opacity-50"
          />
        )}

        {showAvailabilityMarkers && <StatusIcons item={item} translations={statusTranslations} className="absolute top-2 left-2" />}
        <QuantityBadge quantity={item.quantity} className="absolute top-2 right-2" />

        <div className="absolute right-2 top-10 opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
          {isWishlistContext && onMoveToInventory ? (
            <MoveToInventoryButton
              itemId={item.id}
              itemName={item.name}
              onMove={onMoveToInventory}
              onMoveComplete={onMoveComplete}
              variant="secondary"
              iconOnly
              className="h-8 w-8 shadow-sm bg-background/90 hover:bg-background"
            />
          ) : (
            <Button
              asChild
              size="icon"
              variant="secondary"
              className="h-8 w-8 shadow-sm bg-background/90 hover:bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/inventory/${item.id}/edit`}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">{t('actions.edit')}</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <CardContent className={cn('flex flex-col flex-1', isDetailed ? 'p-5' : 'p-3')}>
        <div className="flex justify-between items-start mb-1">
          {item.brand ? (
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/80 cursor-pointer hover:text-primary transition-colors">
                  {item.brand}
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-64" align="start">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">{item.brand}</h4>
                  {item.brandUrl && (
                    <a
                      href={item.brandUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('labels.visitWebsite')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
          ) : (
            <span />
          )}

          {item.weightGrams && (
            <span className={cn('text-muted-foreground font-mono flex items-center gap-1', isDetailed ? 'text-sm' : 'text-xs')}>
              <SpecIcon type="weight" size={isDetailed ? 14 : 12} className="opacity-60" />
              {weightDisplay}
            </span>
          )}
        </div>

        <h3
          className={cn(
            'font-bold text-foreground mb-2',
            isDetailed ? 'text-xl leading-snug' : 'text-sm leading-tight line-clamp-2'
          )}
        >
          {item.name}
        </h3>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {productTypeLabel && (
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80 transition-colors">
                  {productTypeLabel}
                </span>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto" align="start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {breadcrumb.map((label, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />}
                      <span className={idx === breadcrumb.length - 1 ? 'font-semibold text-foreground' : ''}>{label}</span>
                    </React.Fragment>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>

        {isStandard && isWishlistContext && (
          <>
            <MsrpPriceDisplay msrpAmount={msrp?.expectedPriceUsd ?? null} isLoading={msrpLoading} variant="badge" className="mb-2" />
            <TopPricesDisplay wishlistItemId={item.id} className="mt-auto" variant="compact" />
            <TopRetailPricesDisplay priceResults={priceResults} isLoading={priceResultsLoading} variant="compact" className="mt-auto" />
          </>
        )}

        {isDetailed && (
          <div className="mt-4 pt-4 border-t border-border space-y-4 flex-1">
            {item.description && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{t('labels.description')}</span>
                </div>
                <div className="h-24 overflow-y-auto pr-2 text-sm text-muted-foreground leading-relaxed custom-scrollbar">
                  {item.description}
                </div>
              </div>
            )}

            {item.notes && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                  <StickyNote className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{t('labels.myNotes')}</span>
                </div>
                <div className="max-h-20 overflow-y-auto pr-2 text-sm italic text-emerald-800 dark:text-emerald-300/80 bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded-md border border-emerald-100 dark:border-emerald-900/20">
                  {item.notes}
                </div>
              </div>
            )}

            {isWishlistContext && (
              <>
                <MsrpPriceDisplay msrpAmount={msrp?.expectedPriceUsd ?? null} isLoading={msrpLoading} variant="inline" className="mb-3" />
                <TopPricesDisplay wishlistItemId={item.id} className="mt-auto" variant="full" />
                <TopRetailPricesDisplay priceResults={priceResults} isLoading={priceResultsLoading} variant="full" className="mt-auto" />
              </>
            )}
          </div>
        )}
      </CardContent>

      {showCommunityAvailability && (
        <CommunityAvailabilityPanel
          availability={communityAvailability ?? null}
          isLoading={communityAvailabilityLoading}
          onViewItem={onViewCommunityItem}
          variant={isDetailed ? 'full' : 'compact'}
        />
      )}
    </Card>
  );
}
