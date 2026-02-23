/**
 * WishlistCardPricingSummary Component
 *
 * Compact pricing summary for wishlist GearCards showing:
 * 1. Manufacturer/MSRP price with link to manufacturer
 * 2. Best regional retailer offer (Trailblazer users only)
 * 3. Best eBay offer
 *
 * Data sources are the same as the detail view (GearDetailWishlistPricing)
 * but display only the best offer from each source in a compact format.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ExternalLink, TrendingDown, Store, Package, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeExternalUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useEbaySearch } from '@/hooks/price-tracking/useEbaySearch';
import { useResellerPrices } from '@/hooks/price-tracking/useResellerPrices';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getEbaySiteForLocale } from '@/lib/constants/ebay-sites';

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
  /** MSRP amount from catalog lookup */
  msrpAmount: number | null;
  /** Whether MSRP is loading */
  msrpLoading: boolean;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper: Format price
// =============================================================================

function useFormatPrice() {
  const locale = useLocale();

  return (amount: number, currency: string = 'EUR') => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };
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
  msrpAmount,
  msrpLoading,
  variant = 'compact',
  className,
}: WishlistCardPricingSummaryProps) {
  const t = useTranslations('WishlistCardPricing');
  const locale = useLocale();
  const formatPrice = useFormatPrice();
  const { profile } = useAuthContext();
  const categories = useCategoriesStore((state) => state.categories);

  // Derive product type keywords for eBay filtering
  const productTypeKeywords = useMemo(() => {
    if (!productTypeId || !categories.length) return [];
    const category = categories.find(c => c.id === productTypeId);
    if (category) {
      const categoryName = category.i18n?.en || category.label || '';
      return categoryName.split(/\s+/).filter((k: string) => k.length > 2);
    }
    return [];
  }, [productTypeId, categories]);

  // Determine display price: prefer manufacturer price, fallback to MSRP
  const displayPrice = manufacturerPrice ?? msrpAmount;
  const displayCurrency = manufacturerCurrency ?? 'USD';

  // Safe URLs for manufacturer link
  const safeProductUrl = sanitizeExternalUrl(productUrl);
  const safeBrandUrl = sanitizeExternalUrl(brandUrl);
  const manufacturerLink = safeProductUrl || safeBrandUrl;

  // eBay search (limit=1 for best offer only)
  const {
    listings: ebayListings,
    isLoading: ebayLoading,
    ebaySite,
    search: ebaySearch,
  } = useEbaySearch({
    brand: brandName || undefined,
    productTypeKeywords,
    msrp: (manufacturerPrice ?? msrpAmount) || undefined,
    limit: 1,
  });

  const searchQuery = brandName ? `${brandName} ${itemName}` : itemName;
  const localeEbaySite = getEbaySiteForLocale(locale);

  // Trigger eBay search
  useEffect(() => {
    if (itemName) {
      ebaySearch(searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemName, brandName]);

  const bestEbayListing = ebayListings.length > 0 ? ebayListings[0] : null;

  // Reseller prices (Trailblazer gated inside the hook)
  const countryCode = profile?.rawProfile?.preferred_locale?.split('-')[1]?.toUpperCase() || 'DE';
  const userLocation = useMemo(() => {
    if (profile?.rawProfile?.latitude && profile?.rawProfile?.longitude) {
      return { latitude: profile.rawProfile.latitude, longitude: profile.rawProfile.longitude };
    }
    return null;
  }, [profile?.rawProfile?.latitude, profile?.rawProfile?.longitude]);

  const {
    allPrices: resellerPrices,
    isLoading: resellerLoading,
    isTrailblazer,
  } = useResellerPrices({
    gearItemId: itemId,
    query: searchQuery,
    countryCode,
    userLocation,
    autoFetch: true,
  });

  const bestResellerOffer = resellerPrices.length > 0 ? resellerPrices[0] : null;

  const isCompact = variant === 'compact';

  return (
    <div className={cn('space-y-1.5', className)} onClick={(e) => e.stopPropagation()}>
      {/* 1. Manufacturer / MSRP Price */}
      <ManufacturerPriceRow
        price={displayPrice}
        currency={displayCurrency}
        link={manufacturerLink}
        isLoading={msrpLoading}
        isCompact={isCompact}
        formatPrice={formatPrice}
      />

      {/* 2. Best Retailer Offer (Trailblazer only) */}
      <ResellerPriceRow
        offer={bestResellerOffer}
        isLoading={resellerLoading}
        isTrailblazer={isTrailblazer}
        isCompact={isCompact}
        formatPrice={formatPrice}
      />

      {/* 3. Best eBay Offer */}
      <EbayPriceRow
        listing={bestEbayListing}
        isLoading={ebayLoading}
        ebaySite={ebaySite || localeEbaySite.site}
        searchQuery={searchQuery}
        isCompact={isCompact}
        formatPrice={formatPrice}
      />
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

function ManufacturerPriceRow({
  price,
  currency,
  link,
  isLoading,
  isCompact,
  formatPrice,
}: {
  price: number | null;
  currency: string;
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
        {formatPrice(price, currency)}
      </span>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
          title={t('viewOnManufacturer')}
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
  isTrailblazer,
  isCompact,
  formatPrice,
}: {
  offer: import('@/types/reseller').ResellerPriceWithDetails | null;
  isLoading: boolean;
  isTrailblazer: boolean;
  isCompact: boolean;
  formatPrice: (amount: number, currency?: string) => string;
}) {
  const t = useTranslations('WishlistCardPricing');

  // Non-Trailblazer: show upgrade hint
  if (!isTrailblazer && !isLoading) {
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Store className={cn('flex-shrink-0 text-muted-foreground', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <Skeleton className="h-3.5 w-24" />
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
        >
          <ExternalLink className={cn(isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </a>
      )}
    </div>
  );
}

function EbayPriceRow({
  listing,
  isLoading,
  ebaySite,
  searchQuery,
  isCompact,
  formatPrice,
}: {
  listing: import('@/types/ebay').EbayListing | null;
  isLoading: boolean;
  ebaySite: string;
  searchQuery: string;
  isCompact: boolean;
  formatPrice: (amount: number, currency?: string) => string;
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

  if (!listing) {
    // Show "View on eBay" link even when no listing found
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Package className={cn('flex-shrink-0 text-muted-foreground/50', isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        <a
          href={`https://www.${ebaySite}/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}`}
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
      {listing.condition && listing.condition !== 'new' && (
        <span className={cn('text-muted-foreground/70 flex-shrink-0', isCompact ? 'text-[9px]' : 'text-[10px]')}>
          ({t(`conditions.${listing.condition}`)})
        </span>
      )}
      <a
        href={listing.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
        title={t('viewOnEbay')}
      >
        <ExternalLink className={cn(isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      </a>
    </div>
  );
}
