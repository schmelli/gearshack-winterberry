/**
 * GearDetailWishlistPricing Component
 *
 * Extracted from GearDetailContent.tsx
 * Renders price tracking sections for wishlist items:
 * - Manufacturer/MSRP price
 * - eBay listings
 * - Reseller prices (Trailblazer tier)
 *
 * Feature: 057
 */

'use client';

import { ManufacturerPriceSection } from '@/components/price-tracking/ManufacturerPriceSection';
import { EbayListingsSection } from '@/components/price-tracking/EbayListingsSection';
import { ResellerPricesSection } from '@/components/price-tracking/ResellerPricesSection';

// =============================================================================
// Types
// =============================================================================

interface GearDetailWishlistPricingProps {
  /** Gear item ID */
  gearItemId: string;
  /** Item name for search queries */
  itemName: string;
  /** Brand name for search queries */
  brandName?: string | null;
  /** Manufacturer price (if set on item) */
  manufacturerPrice?: number | null;
  /** Manufacturer currency code */
  manufacturerCurrency?: string | null;
  /** Product page URL */
  productUrl?: string | null;
  /** Brand website URL */
  brandUrl?: string | null;
  /** MSRP amount from price lookup */
  msrpAmount: number | null;
  /** Whether MSRP is loading */
  msrpLoading: boolean;
  /** Product type keywords for eBay filtering */
  productTypeKeywords: string[];
  /** Country code for reseller search */
  countryCode: string;
  /** User location for proximity-based results */
  userLocation: { latitude: number; longitude: number } | null;
}

// =============================================================================
// Component
// =============================================================================

export function GearDetailWishlistPricing({
  gearItemId,
  itemName,
  brandName,
  manufacturerPrice,
  manufacturerCurrency,
  productUrl,
  brandUrl,
  msrpAmount,
  msrpLoading,
  productTypeKeywords,
  countryCode,
  userLocation,
}: GearDetailWishlistPricingProps) {
  return (
    <>
      {/* Feature 057: Manufacturer Price Section */}
      <ManufacturerPriceSection
        manufacturerPrice={manufacturerPrice}
        manufacturerCurrency={manufacturerCurrency}
        productUrl={productUrl}
        brandUrl={brandUrl}
        msrpAmount={msrpAmount}
        msrpLoading={msrpLoading}
      />

      {/* Feature 057: eBay Listings Section */}
      <EbayListingsSection
        itemName={itemName}
        brandName={brandName}
        productTypeKeywords={productTypeKeywords}
        msrp={manufacturerPrice ?? msrpAmount ?? null}
        maxListings={3}
      />

      {/* Feature 057: Reseller Prices Section */}
      <ResellerPricesSection
        gearItemId={gearItemId}
        query={`${brandName ?? ''} ${itemName}`.trim()}
        countryCode={countryCode}
        userLocation={userLocation}
      />
    </>
  );
}
