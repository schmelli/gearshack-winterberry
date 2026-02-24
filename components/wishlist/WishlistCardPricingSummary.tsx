/**
 * WishlistCardPricingSummary Component
 *
 * Compact pricing summary for wishlist GearCards showing:
 * 1. Manufacturer/MSRP price with link to manufacturer
 * 2. Best regional retailer offer (Trailblazer users only)
 * 3. Best eBay offer
 *
 * This component is stateless — all data fetching and business logic
 * lives in the useWishlistCardPricingSummary hook (Feature-Sliced Light).
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, TrendingDown, Store, Package, Crown } from 'lucide-react';
import { cn, sanitizeExternalUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useWishlistCardPricingSummary } from '@/hooks/wishlist/useWishlistCardPricingSummary';
import type { EbayCondition, EbayListing } from '@/types/ebay';
import type { ResellerPriceWithDetails } from '@/types/reseller';

// =============================================================================
// Module-level stable event handler — avoids new function reference each render
// =============================================================================

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

// =============================================================================
// Types
// =============================================================================

interface WishlistCardPricingSummaryProps {
  /** Gear item ID */
  itemId: string;
  /** Item name for search queries */
  itemName: string;
  /** Brand name for search queries */
  brandName: string | null;
  /** Manufacturer price from the item (user-set) */
  manufacturerPrice: number | null;
  /** Manufacturer price currency */
  manufacturerCurrency: string | null;
  /** Product page URL on manufacturer website */
  productUrl: string | null;
  /** Brand website URL (fallback) */
  brandUrl: string | null;
  /** Product type ID for keyword derivation */
  productTypeId: string | null;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Known eBay item conditions that have translations
// =============================================================================

const KNOWN_CONDITIONS: ReadonlySet<EbayCondition> = new Set<EbayCondition>([
  'open_box',
  'refurbished',
  'used',
  'for_parts',
]);

function isKnownCondition(condition: string): condition is EbayCondition {
  return KNOWN_CONDITIONS.has(condition as EbayCondition);
}

// =============================================================================
// Component
// =============================================================================

export function WishlistCardPricingSummary({
  itemId,
  itemName,
  brandName,
  manufacturerPrice,
  manufacturerCurrency,
  productUrl,
  brandUrl,
  productTypeId,
  variant = 'compact',
  className,
}: WishlistCardPricingSummaryProps) {
  const {
    displayPrice,
    displayCurrency,
    isApproximatePrice,
    manufacturerLink,
    bestEbayListing,
    safeEbayListingUrl,
    ebayLoading,
    ebaySite,
    searchQuery,
    bestResellerOffer,
    resellerLoading,
    isTrailblazer,
    msrpLoading,
    authLoading,
    formatPrice,
  } = useWishlistCardPricingSummary({
    itemId,
    itemName,
    brandName,
    manufacturerPrice,
    manufacturerCurrency,
    productUrl,
    brandUrl,
    productTypeId,
  });

  const isCompact = variant === 'compact';

  return (
    <div className={cn('space-y-1.5', className)} onClick={stopPropagation}>
      {/* 1. Manufacturer / MSRP Price */}
      <ManufacturerPriceRow
        price={displayPrice}
        currency={displayCurrency}
        isApproximate={isApproximatePrice}
        link={manufacturerLink}
        isLoading={msrpLoading}
        isCompact={isCompact}
        formatPrice={formatPrice}
      />

      {/* 2. Best Retailer Offer (Trailblazer only) */}
      <ResellerPriceRow
        offer={bestResellerOffer}
        isLoading={resellerLoading}
        authLoading={authLoading}
        isTrailblazer={isTrailblazer}
        isCompact={isCompact}
        formatPrice={formatPrice}
      />

      {/* 3. Best eBay Offer */}
      <EbayPriceRow
        listing={bestEbayListing}
        safeListingUrl={safeEbayListingUrl}
        isLoading={ebayLoading}
        ebaySite={ebaySite}
        searchQuery={searchQuery}
        isCompact={isCompact}
      />
    </div>
  );
}

// =============================================================================
// Sub-Components (stateless, presentational)
// =============================================================================

function ManufacturerPriceRow({
  price,
  currency,
  isApproximate,
  link,
  isLoading,
  isCompact,
  formatPrice,
}: {
  price: number | null;
  currency: string;
  /** True when price was converted from USD → EUR (show "~" prefix) */
  isApproximate: boolean;
  link: string | null;
  isLoading: boolean;
  isCompact: boolean;
  formatPrice: (amount: number, currency?: string) => string;
}) {
  const t = useTranslations('WishlistCardPricing');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <TrendingDown className={cn('flex-shrink-0 text-muted-foreground', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <Skeleton className="h-3.5 w-20" />
      </div>
    );
  }

  if (price === null) return null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <TrendingDown className={cn('flex-shrink-0 text-amber-600 dark:text-amber-500', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      <span className={cn('text-muted-foreground truncate', isCompact ? 'text-[10px]' : 'text-xs')}>
        {t('msrp')}
      </span>
      <span className={cn('font-semibold text-amber-700 dark:text-amber-400 flex-shrink-0', isCompact ? 'text-xs' : 'text-sm')}>
        {isApproximate && <span className="opacity-70 mr-0.5">~</span>}{formatPrice(price, currency)}
      </span>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
          title={t('viewOnManufacturer')}
          aria-label={t('viewOnManufacturer')}
        >
          <ExternalLink className={cn(isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </a>
      )}
    </div>
  );
}

function ResellerPriceRow({
  offer,
  isLoading,
  authLoading,
  isTrailblazer,
  isCompact,
  formatPrice,
}: {
  offer: ResellerPriceWithDetails | null;
  isLoading: boolean;
  /** Whether auth/profile is still resolving — prevents premature Trailblazer hint flash */
  authLoading: boolean;
  isTrailblazer: boolean;
  isCompact: boolean;
  formatPrice: (amount: number, currency?: string) => string;
}) {
  const t = useTranslations('WishlistCardPricing');

  // Show skeleton while reseller data or auth is loading.
  // Checking auth loading here prevents showing the upgrade hint during the
  // brief window before the user profile has settled.
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center gap-2">
        <Store className={cn('flex-shrink-0 text-muted-foreground', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <Skeleton className="h-3.5 w-24" />
      </div>
    );
  }

  // Non-Trailblazer: show upgrade hint (only rendered after loading completes)
  if (!isTrailblazer) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Store className={cn('flex-shrink-0 text-muted-foreground/50', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <span className={cn('text-muted-foreground/60 truncate italic', isCompact ? 'text-[10px]' : 'text-xs')}>
          {t('retailerTrailblazerHint')}
        </span>
        <Crown className={cn('flex-shrink-0 text-amber-500', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      </div>
    );
  }

  if (!offer) return null;

  const safeUrl = sanitizeExternalUrl(offer.productUrl || offer.reseller.websiteUrl);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Store className={cn('flex-shrink-0 text-emerald-600 dark:text-emerald-500', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      <span className={cn('text-muted-foreground truncate', isCompact ? 'text-[10px]' : 'text-xs')}>
        {offer.reseller.name}
      </span>
      <span className={cn('font-semibold text-emerald-700 dark:text-emerald-400 flex-shrink-0', isCompact ? 'text-xs' : 'text-sm')}>
        {formatPrice(offer.priceAmount, offer.priceCurrency)}
      </span>
      {safeUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
          title={t('visitShop')}
          aria-label={t('visitShop')}
        >
          <ExternalLink className={cn(isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </a>
      )}
    </div>
  );
}

function EbayPriceRow({
  listing,
  safeListingUrl,
  isLoading,
  ebaySite,
  searchQuery,
  isCompact,
}: {
  listing: EbayListing | null;
  /** Pre-sanitized listing URL from the hook, or null if unsafe */
  safeListingUrl: string | null;
  isLoading: boolean;
  ebaySite: string;
  searchQuery: string;
  isCompact: boolean;
}) {
  const t = useTranslations('WishlistCardPricing');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Package className={cn('flex-shrink-0 text-muted-foreground', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <Skeleton className="h-3.5 w-24" />
      </div>
    );
  }

  // ebaySite is always a validated, known value — safe to interpolate
  const fallbackSearchUrl = `https://www.${ebaySite}/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}`;

  if (!listing) {
    // Show "Search on eBay" link even when no specific listing was found
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Package className={cn('flex-shrink-0 text-muted-foreground/50', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <a
          href={fallbackSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('text-muted-foreground hover:text-primary transition-colors truncate', isCompact ? 'text-[10px]' : 'text-xs')}
        >
          {t('searchOnEbay')}
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Package className={cn('flex-shrink-0 text-blue-600 dark:text-blue-500', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      <span className={cn('text-muted-foreground truncate', isCompact ? 'text-[10px]' : 'text-xs')}>
        {t('ebayFrom')}
      </span>
      <span className={cn('font-semibold text-blue-700 dark:text-blue-400 flex-shrink-0', isCompact ? 'text-xs' : 'text-sm')}>
        {listing.priceFormatted}
      </span>
      {listing.condition && listing.condition !== 'new' && isKnownCondition(listing.condition) && (
        <span className={cn('text-muted-foreground/70 flex-shrink-0', isCompact ? 'text-[9px]' : 'text-[10px]')}>
          ({t(`conditions.${listing.condition}`)})
        </span>
      )}
      {safeListingUrl ? (
        <a
          href={safeListingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
          title={t('viewOnEbay')}
          aria-label={t('viewOnEbay')}
        >
          <ExternalLink className={cn(isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </a>
      ) : (
        <a
          href={fallbackSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
          title={t('searchOnEbay')}
          aria-label={t('searchOnEbay')}
        >
          <ExternalLink className={cn(isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </a>
      )}
    </div>
  );
}
