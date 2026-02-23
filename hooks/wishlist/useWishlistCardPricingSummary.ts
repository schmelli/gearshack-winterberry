/**
 * useWishlistCardPricingSummary Hook
 *
 * Feature: Wishlist GearCard pricing refactor
 * Purpose: Encapsulate all business logic for the WishlistCardPricingSummary component.
 *
 * Constitution: All business logic MUST reside in hooks.
 * UI components must be stateless — receive data only via props.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useEbaySearch } from '@/hooks/price-tracking/useEbaySearch';
import { useResellerPrices } from '@/hooks/price-tracking/useResellerPrices';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getEbaySiteForLocale, EBAY_SITES } from '@/lib/constants/ebay-sites';
import { sanitizeExternalUrl } from '@/lib/utils';
import type { EbayListing } from '@/types/ebay';
import type { ResellerPriceWithDetails } from '@/types/reseller';

// =============================================================================
// Types
// =============================================================================

export interface UseWishlistCardPricingSummaryParams {
  itemId: string;
  itemName: string;
  brandName: string | null;
  manufacturerPrice: number | null;
  manufacturerCurrency: string | null;
  productUrl: string | null;
  brandUrl: string | null;
  productTypeId: string | null;
  msrpAmount: number | null;
  msrpLoading: boolean;
}

export interface UseWishlistCardPricingSummaryReturn {
  /** Price to display — manufacturer price or MSRP fallback */
  displayPrice: number | null;
  /** Currency for displayPrice */
  displayCurrency: string;
  /** Sanitized manufacturer/brand website link, or null */
  manufacturerLink: string | null;
  /** Best eBay listing (already filtered to limit=1), or null */
  bestEbayListing: EbayListing | null;
  /** Sanitized eBay listing URL, or null if unsafe */
  safeEbayListingUrl: string | null;
  /** Whether eBay search is in progress */
  ebayLoading: boolean;
  /**
   * Validated eBay site domain (e.g. 'ebay.de').
   * Always a known value from EBAY_SITES — never arbitrary API data.
   */
  ebaySite: string;
  /** Search query used for eBay and reseller lookups */
  searchQuery: string;
  /** Best reseller offer, or null */
  bestResellerOffer: ResellerPriceWithDetails | null;
  /** Whether reseller prices are loading */
  resellerLoading: boolean;
  /** Whether the current user has Trailblazer status */
  isTrailblazer: boolean;
  /** Whether MSRP is still loading */
  msrpLoading: boolean;
}

// =============================================================================
// Validated eBay site set — used to guard API-sourced site values
// =============================================================================

const KNOWN_EBAY_SITES = new Set(Object.values(EBAY_SITES).map((s) => s.site));

// =============================================================================
// Hook
// =============================================================================

export function useWishlistCardPricingSummary({
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
}: UseWishlistCardPricingSummaryParams): UseWishlistCardPricingSummaryReturn {
  const locale = useLocale();
  const { profile } = useAuthContext();
  const categories = useCategoriesStore((state) => state.categories);

  // Derive product type keywords for eBay result filtering
  const productTypeKeywords = useMemo(() => {
    if (!productTypeId || !categories.length) return [];
    const category = categories.find((c) => c.id === productTypeId);
    if (category) {
      const categoryName = category.i18n?.en || category.label || '';
      return categoryName.split(/\s+/).filter((k: string) => k.length > 2);
    }
    return [];
  }, [productTypeId, categories]);

  // Display price: prefer manufacturer price, fall back to MSRP
  // Currency: use EUR as the default to match useFormatPrice defaults
  const displayPrice = manufacturerPrice ?? msrpAmount;
  const displayCurrency = manufacturerCurrency ?? 'EUR';

  // Sanitized manufacturer link (product page preferred, brand site fallback)
  const manufacturerLink =
    sanitizeExternalUrl(productUrl) ?? sanitizeExternalUrl(brandUrl) ?? null;

  const searchQuery = brandName ? `${brandName} ${itemName}` : itemName;
  const localeEbaySite = getEbaySiteForLocale(locale);

  // eBay search — limit=1 to fetch only the best offer per card
  const {
    listings: ebayListings,
    isLoading: ebayLoading,
    ebaySite: apiEbaySite,
    search: ebaySearch,
  } = useEbaySearch({
    brand: brandName || undefined,
    productTypeKeywords,
    msrp: (manufacturerPrice ?? msrpAmount) || undefined,
    limit: 1,
  });

  // Trigger search when the item identity changes.
  // ebaySearch is wrapped in useCallback inside useEbaySearch (stable reference),
  // so including it here is safe and resolves the stale-closure risk.
  useEffect(() => {
    if (itemName) {
      ebaySearch(searchQuery);
    }
  }, [itemName, brandName, ebaySearch, searchQuery]);

  // Validate the eBay site returned by the API against the known allow-list.
  // This prevents arbitrary API values from being interpolated into URLs.
  const ebaySite =
    apiEbaySite && KNOWN_EBAY_SITES.has(apiEbaySite)
      ? apiEbaySite
      : localeEbaySite.site;

  const bestEbayListing = ebayListings.length > 0 ? ebayListings[0] : null;

  // Sanitize the eBay listing URL from the API response
  const safeEbayListingUrl = bestEbayListing
    ? sanitizeExternalUrl(bestEbayListing.url)
    : null;

  // Country code for reseller filtering — derived from profile locale or
  // URL locale, never hardcoded to a single country.
  const countryCode =
    profile?.rawProfile?.preferred_locale?.split('-')[1]?.toUpperCase() ??
    locale.split('-')[1]?.toUpperCase() ??
    locale.split('-')[0]?.toUpperCase() ??
    'DE';

  const rawProfile = profile?.rawProfile ?? null;
  const userLocation = useMemo(() => {
    if (rawProfile?.latitude && rawProfile?.longitude) {
      return {
        latitude: rawProfile.latitude,
        longitude: rawProfile.longitude,
      };
    }
    return null;
  }, [rawProfile]);

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

  return {
    displayPrice,
    displayCurrency,
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
  };
}
