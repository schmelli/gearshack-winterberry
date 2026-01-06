'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, ExternalLink, StickyNote, FileText, Heart, Recycle, Tag, DollarSign, HandHeart, ArrowLeftRight, ChevronRight } from 'lucide-react';
import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { CategoryPlaceholder } from './CategoryPlaceholder';
import { formatWeightForDisplay, getOptimizedImageUrl } from '@/lib/gear-utils';
import { SpecIcon } from '@/components/gear/SpecIcon';
import { TopPricesDisplay } from '@/components/wishlist/TopPricesDisplay';
import { TopRetailPricesDisplay } from '@/components/wishlist/TopRetailPricesDisplay';
import { MsrpPriceDisplay } from '@/components/wishlist/MsrpPriceDisplay';
import { MoveToInventoryButton } from '@/components/wishlist/MoveToInventoryButton';
import { CommunityAvailabilityPanel } from '@/components/wishlist/CommunityAvailabilityPanel';
import type { WishlistItemAvailability } from '@/types/wishlist';
import { useCategoryBreadcrumb } from '@/hooks/useCategoryBreadcrumb';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';
import { useWishlistPriceResults } from '@/hooks/price-tracking/useWishlistPriceResults';
import { useMsrpPrice } from '@/hooks/price-tracking/useMsrpPrice';

// =============================================================================
// Quantity Badge Component - Feature 013
// =============================================================================

interface QuantityBadgeProps {
  /** The quantity to display */
  quantity: number;
  /** Additional CSS classes */
  className?: string;
}

function QuantityBadge({ quantity, className }: QuantityBadgeProps) {
  const t = useTranslations('Inventory');

  // Only show badge when quantity > 1
  if (quantity <= 1) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        'bg-slate-900/90 text-white dark:bg-slate-100/90 dark:text-slate-900',
        'shadow-sm',
        className
      )}
      title={`Quantity: ${quantity}`}
    >
      {t('quantityBadge', { quantity })}
    </span>
  );
}

// =============================================================================
// Status Icons Component - Feature 041
// =============================================================================

interface StatusIconsProps {
  item: GearItem;
  className?: string;
  translations: {
    favourite: string;
    forSale: string;
    borrowable: string;
    tradeable: string;
    lent: string;
    sold: string;
  };
}

function StatusIcons({ item, className, translations }: StatusIconsProps) {
  const icons: React.ReactNode[] = [];

  // Heart icon for favourites
  if (item.isFavourite) {
    icons.push(
      <div
        key="favourite"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500/90 shadow-sm"
        title={translations.favourite}
      >
        <Heart className="h-3.5 w-3.5 text-white fill-white" />
      </div>
    );
  }

  // Dollar sign for items for sale
  if (item.isForSale) {
    icons.push(
      <div
        key="for-sale"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-green-600/90 shadow-sm"
        title={translations.forSale}
      >
        <DollarSign className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  // Hand heart icon for items that can be borrowed
  if (item.canBeBorrowed) {
    icons.push(
      <div
        key="borrowable"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/90 shadow-sm"
        title={translations.borrowable}
      >
        <HandHeart className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  // Arrow swap icon for items that can be traded
  if (item.canBeTraded) {
    icons.push(
      <div
        key="tradeable"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-500/90 shadow-sm"
        title={translations.tradeable}
      >
        <ArrowLeftRight className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  // Recycle icon for lent items
  if (item.status === 'lent') {
    icons.push(
      <div
        key="lent"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/90 shadow-sm"
        title={translations.lent}
      >
        <Recycle className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  // Tag icon for sold items
  if (item.status === 'sold') {
    icons.push(
      <div
        key="sold"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/90 shadow-sm"
        title={translations.sold}
      >
        <Tag className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  if (icons.length === 0) return null;

  return (
    <div className={cn("flex gap-1 flex-wrap", className)}>
      {icons}
    </div>
  );
}

// =============================================================================
// Types
// =============================================================================

interface GearCardProps {
  /** The gear item to display */
  item: GearItem;
  /** Current view density mode */
  viewDensity: ViewDensity;
  /** Optional click handler for card body */
  onClick?: () => void;
  /** Context determines which features are shown (Feature 049: wishlist hides availability markers) */
  context?: 'inventory' | 'wishlist';
  /** Feature 049 US3: Callback to move wishlist item to inventory */
  onMoveToInventory?: (itemId: string) => Promise<void>;
  /** Feature 049 US3: Callback after successful move (for navigation) */
  onMoveComplete?: () => void;
  /** Feature 049 US2: Community availability data for wishlist items (T045) */
  communityAvailability?: WishlistItemAvailability | null;
  /** Feature 049 US2: Whether community availability is loading (T045) */
  communityAvailabilityLoading?: boolean;
  /** Feature 049 US2: Callback to view a community item in detail modal (T041) */
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
}: GearCardProps) {
  const t = useTranslations('GearDetail');
  const [imageError, setImageError] = useState(false);

  // Prepare translations for StatusIcons
  const statusTranslations = {
    favourite: t('badges.favouriteTooltip'),
    forSale: t('badges.forSaleTooltip'),
    borrowable: t('badges.borrowableTooltip'),
    tradeable: t('badges.tradeableTooltip'),
    lent: t('badges.lentTooltip'),
    sold: t('badges.soldTooltip'),
  };

  // Feature 019: Use optimized image with Cloudinary transformations
  // Different widths for different view densities
  const imageWidth = viewDensity === 'compact' ? 160 : viewDensity === 'detailed' ? 1200 : 800;
  const optimizedImageUrl = getOptimizedImageUrl(item, imageWidth);
  const showImage = optimizedImageUrl && !imageError;
  const isCompact = viewDensity === 'compact';
  const isDetailed = viewDensity === 'detailed';
  const isStandard = viewDensity === 'standard';

  // Feature 049: Hide availability markers in wishlist context
  const showAvailabilityMarkers = context === 'inventory';
  // Feature 049: Show price stubs in wishlist context
  const isWishlistContext = context === 'wishlist';
  // Feature 049 US2 T045: Show community availability panel in wishlist context (medium/detailed views only)
  const showCommunityAvailability = isWishlistContext && (isStandard || isDetailed);

  // Issue #142: Fetch retail prices for wishlist items
  const { priceResults, isLoading: priceResultsLoading } = useWishlistPriceResults(
    isWishlistContext ? item.id : ''
  );

  // Fetch MSRP (Manufacturer's Suggested Retail Price) for wishlist items
  const { msrp, isLoading: msrpLoading } = useMsrpPrice(
    isWishlistContext ? item.name : null,
    isWishlistContext ? item.brand : null,
    isWishlistContext
  );

  // Cascading Category Refactor (Phase 4): Use breadcrumb hook instead of prop
  const { breadcrumb, productTypeLabel } = useCategoryBreadcrumb(item.productTypeId);

  // Derive categoryId (level 1) from productTypeId (level 3) for CategoryPlaceholder
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
          'flex flex-row items-center h-20', // Reduced height slightly
          'border-stone-200 dark:border-stone-700 shadow-sm',
          'transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600'
        )}
        onClick={onClick}
      >
        {/* Image Section */}
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
            <CategoryPlaceholder
              categoryId={categoryId}
              size="sm"
              className="h-10 w-10"
            />
          )}
          {/* Status Icons (Overlay top-left) - Feature 041, Hidden in wishlist context (Feature 049) */}
          {showAvailabilityMarkers && <StatusIcons item={item} translations={statusTranslations} className="absolute top-1 left-1 scale-75 origin-top-left" />}
          {/* Quantity Badge (Overlay top-right) - Feature 013 */}
          <QuantityBadge quantity={item.quantity} className="absolute top-1 right-1 scale-75 origin-top-right" />
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col justify-center px-4 py-1.5 min-w-0">
          <div className="flex justify-between items-baseline gap-2">
            <h3 className="text-sm font-medium leading-tight line-clamp-1 text-foreground">
              {item.name}
            </h3>
            {item.weightGrams && (
              <span className="text-xs text-muted-foreground flex-shrink-0 font-mono flex items-center gap-1">
                <SpecIcon type="weight" size={12} className="opacity-60" />
                {weightDisplay}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-0.5">
            {item.brand && (
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {item.brand}
              </p>
            )}
            {productTypeLabel && (
              <>
                <span className="text-[10px] text-stone-300 dark:text-stone-700">•</span>
                <span className="text-xs text-muted-foreground truncate">
                  {productTypeLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Button Overlay - Feature 049 US3: Show Move button in wishlist context */}
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
                <span className="sr-only">Edit</span>
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
        'group relative overflow-hidden cursor-pointer',
        'flex flex-col',
        'border-stone-200 dark:border-stone-700 shadow-sm',
        'transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600',
        // Standard ist jetzt kompakter, Detailed wächst mit
        isDetailed ? 'min-h-[450px]' : 'min-h-[260px]'
      )}
      onClick={onClick}
    >
      {/* Image Section */}
      <div
        className={cn(
          'relative bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 flex items-center justify-center border-b border-stone-100 dark:border-stone-800',
          // Standard: 3/2 (flacher/breiter) | Detailed: 1/1 (großes Quadrat)
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

        {/* Status Icons (Overlay top-left) - Feature 041, Hidden in wishlist context (Feature 049) */}
        {showAvailabilityMarkers && <StatusIcons item={item} translations={statusTranslations} className="absolute top-2 left-2" />}

        {/* Quantity Badge (Overlay top-right) - Feature 013 */}
        <QuantityBadge quantity={item.quantity} className="absolute top-2 right-2" />

        {/* Action Button (Overlay top-right, appears below quantity badge on hover) - Feature 049 US3: Show Move button in wishlist context */}
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
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <CardContent className={cn("flex flex-col flex-1", isDetailed ? "p-5" : "p-3")}>
        
        {/* Header: Brand & Weight */}
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
            <span /> // Spacer
          )}
          
          {item.weightGrams && (
            <span className={cn(
              "text-muted-foreground font-mono flex items-center gap-1",
              isDetailed ? "text-sm" : "text-xs"
            )}>
              <SpecIcon type="weight" size={isDetailed ? 14 : 12} className="opacity-60" />
              {weightDisplay}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn(
            'font-bold text-foreground mb-2',
            isDetailed ? 'text-xl leading-snug' : 'text-sm leading-tight line-clamp-2'
          )}
        >
          {item.name}
        </h3>

        {/* Category & Details Line - Cascading Category Refactor (Phase 4): Breadcrumb on hover */}
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
                      <span className={idx === breadcrumb.length - 1 ? "font-semibold text-foreground" : ""}>
                        {label}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>

        {/* MSRP Display for standard (medium) wishlist view */}
        {isStandard && isWishlistContext && (
          <MsrpPriceDisplay
            msrpAmount={msrp?.expectedPriceUsd ?? null}
            isLoading={msrpLoading}
            variant="badge"
            className="mb-2"
          />
        )}
        {/* Feature 142: Top Prices Display for standard (medium) wishlist view */}
        {isStandard && isWishlistContext && (
          <TopPricesDisplay wishlistItemId={item.id} className="mt-auto" variant="compact" />
        )}
        {/* Feature 049 T065 + Issue #142: Display retail prices for standard (medium) wishlist view */}
        {isStandard && isWishlistContext && (
          <TopRetailPricesDisplay
            priceResults={priceResults}
            isLoading={priceResultsLoading}
            variant="compact"
            className="mt-auto"
          />
        )}

        {/* DETAILED VIEW: Description & Notes */}
        {isDetailed && (
          <div className="mt-4 pt-4 border-t border-border space-y-4 flex-1">
            
            {/* Description Section */}
            {item.description && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{t('labels.description')}</span>
                </div>
                {/* Fallback div if ScrollArea is missing, but prefer ScrollArea */}
                <div className="h-24 overflow-y-auto pr-2 text-sm text-muted-foreground leading-relaxed custom-scrollbar">
                   {item.description}
                </div>
              </div>
            )}

            {/* Notes Section */}
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

            {/* MSRP Display for detailed (large) wishlist view */}
            {isWishlistContext && (
              <MsrpPriceDisplay
                msrpAmount={msrp?.expectedPriceUsd ?? null}
                isLoading={msrpLoading}
                variant="inline"
                className="mb-3"
              />
            )}
            {/* Feature 142: Top Prices Display for detailed (large) wishlist view */}
            {isWishlistContext && (
              <TopPricesDisplay wishlistItemId={item.id} className="mt-auto" variant="full" />
            )}
            {/* Feature 049 T067 + Issue #142: Display retail prices for detailed (large) wishlist view */}
            {isWishlistContext && (
              <TopRetailPricesDisplay
                priceResults={priceResults}
                isLoading={priceResultsLoading}
                variant="full"
                className="mt-auto"
              />
            )}
          </div>
        )}
      </CardContent>

      {/* Feature 049 US2 T045: Community Availability Panel for wishlist items (standard/detailed views) */}
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