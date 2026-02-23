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

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useEbaySearch } from '@/hooks/price-tracking/useEbaySearch';
import { useResellerPrices } from '@/hooks/price-tracking/useResellerPrices';
import { useMsrpPrice } from '@/hooks/price-tracking/useMsrpPrice';
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
  /** Whether auth/profile is still loading — used to prevent premature Trailblazer hint */
  authLoading: boolean;
  /** Locale-aware price formatter */
  formatPrice: (amount: number, currency?: string) => string;
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
}: UseWishlistCardPricingSummaryParams): UseWishlistCardPricingSummaryReturn {
  const locale = useLocale();
  const { profile, loading: authLoading } = useAuthContext();
  const categories = useCategoriesStore((state) => state.categories);

  // Fetch MSRP internally — encapsulates useMsrpPrice so the component and
  // GearCard do not need to prop-drill loading state.
  const { msrp, isLoading: msrpLoading } = useMsrpPrice(itemName, brandName);
  const msrpAmount = msrp?.expectedPriceUsd ?? null;

  // Locale-aware price formatter returned as part of hook result so the
  // component file remains free of hook logic.
  const formatPrice = useCallback(
    (amount: number, currency: string = 'EUR') => {
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
    },
    [locale]
  );

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

  // Display price: prefer manufacturer price, fall back to MSRP.
  // Currency follows the source — manufacturer price uses its own currency
  // (defaulting to EUR), MSRP is always stored as USD.
  const displayPrice = manufacturerPrice ?? msrpAmount;
  const displayCurrency =
    manufacturerPrice !== null
      ? (manufacturerCurrency ?? 'EUR')
      : msrpAmount !== null
        ? 'USD'
        : 'EUR';

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

  // Debounced eBay search — prevents N simultaneous API calls when a card list
  // re-renders rapidly (e.g. during filter interactions).
  // ebaySearch is wrapped in useCallback inside useEbaySearch (stable ref).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (itemName) {
      debounceRef.current = setTimeout(() => {
        ebaySearch(searchQuery);
      }, 300);
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, ebaySearch]);

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

  // Country code for reseller filtering — derived from profile locale or URL locale.
  // The language subtag fallback (e.g. locale.split('-')[0] → 'en' → 'EN') was
  // removed because it is not a valid ISO 3166-1 country code and would silently
  // return no results for English-locale users.
  const countryCode =
    profile?.rawProfile?.preferred_locale?.split('-')[1]?.toUpperCase() ??
    locale.split('-')[1]?.toUpperCase() ??
    'DE';

  // Memoize userLocation on stable primitives to avoid recalculating when
  // the profile object reference changes but coordinates haven't.
  const profileLat = profile?.rawProfile?.latitude;
  const profileLng = profile?.rawProfile?.longitude;
  const userLocation = useMemo(() => {
    if (profileLat && profileLng) {
      return { latitude: profileLat, longitude: profileLng };
    }
    return null;
  }, [profileLat, profileLng]);

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
    authLoading,
    formatPrice,
  };
}
