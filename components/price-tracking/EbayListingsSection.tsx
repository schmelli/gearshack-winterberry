/**
 * EbayListingsSection Component
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Display eBay listings for wishlist items
 *
 * Constitution: UI components MUST be stateless (logic in hooks)
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ExternalLink, Package, Gavel, Tag, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEbaySearch } from '@/hooks/price-tracking/useEbaySearch';
import { EbayListingPopup } from './EbayListingPopup';
import { EbayFeedbackButton } from './EbayFeedbackButton';
import type { EbayListing, EbayListingType, EbayCondition } from '@/types/ebay';

// =============================================================================
// Types
// =============================================================================

interface EbayListingsSectionProps {
  /** Item name for search query */
  itemName: string;
  /** Brand name for filtering */
  brandName?: string | null;
  /** Product type keywords for filtering */
  productTypeKeywords?: string[];
  /** MSRP for knockoff detection */
  msrp?: number | null;
  /** Maximum listings to show (default: 3) */
  maxListings?: number;
  /** Optional gear item ID for feedback context */
  gearItemId?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function ListingTypeBadge({ type }: { type: EbayListingType }) {
  const t = useTranslations('EbayListings');

  const config: Record<EbayListingType, { icon: typeof Gavel; label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    auction: { icon: Gavel, label: t('types.auction'), variant: 'default' },
    buy_it_now: { icon: Tag, label: t('types.buyItNow'), variant: 'secondary' },
    best_offer: { icon: Package, label: t('types.bestOffer'), variant: 'outline' },
  };

  const { icon: Icon, label, variant } = config[type];

  return (
    <Badge variant={variant} className="text-xs">
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function ConditionBadge({ condition }: { condition: EbayCondition }) {
  const t = useTranslations('EbayListings');

  const labels: Record<EbayCondition, string> = {
    new: t('conditions.new'),
    open_box: t('conditions.openBox'),
    refurbished: t('conditions.refurbished'),
    used: t('conditions.used'),
    for_parts: t('conditions.forParts'),
  };

  const colors: Record<EbayCondition, string> = {
    new: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    open_box: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    refurbished: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    used: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    for_parts: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[condition]}`}>
      {labels[condition]}
    </span>
  );
}

function ListingCard({
  listing,
  onViewDetails,
  searchQuery,
  gearItemId,
  brandName,
  itemName,
}: {
  listing: EbayListing;
  onViewDetails: (listing: EbayListing) => void;
  searchQuery: string;
  gearItemId?: string;
  brandName?: string;
  itemName?: string;
}) {
  const t = useTranslations('EbayListings');

  return (
    <div
      className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onViewDetails(listing)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onViewDetails(listing);
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
        {listing.thumbnailUrl ? (
          <Image
            src={listing.thumbnailUrl}
            alt={listing.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + Feedback Button */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2 mb-1">{listing.title}</h4>
          <EbayFeedbackButton
            listing={listing}
            searchQuery={searchQuery}
            gearItemId={gearItemId}
            brandName={brandName}
            itemName={itemName}
          />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <ListingTypeBadge type={listing.listingType} />
          <ConditionBadge condition={listing.condition} />
        </div>

        {/* Price + Shipping */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">{listing.priceFormatted}</span>
          {listing.shippingCost !== null && (
            <span className="text-xs text-muted-foreground">
              {listing.shippingCost === 0
                ? t('freeShipping')
                : `+ ${listing.shippingCost.toFixed(2)} ${listing.currency} ${t('shipping')}`}
            </span>
          )}
        </div>

        {/* Auction info */}
        {listing.listingType === 'auction' && listing.bidCount !== undefined && (
          <div className="text-xs text-muted-foreground mt-1">
            {t('bids', { count: listing.bidCount })}
            {listing.timeLeft && ` • ${listing.timeLeft}`}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3">
          <Skeleton className="w-20 h-20 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function EbayListingsSection({
  itemName,
  brandName,
  productTypeKeywords,
  msrp,
  maxListings = 3,
  gearItemId,
}: EbayListingsSectionProps) {
  const t = useTranslations('EbayListings');

  const {
    listings,
    isLoading,
    error,
    ebaySite,
    search,
  } = useEbaySearch({
    brand: brandName || undefined,
    productTypeKeywords,
    msrp: msrp || undefined,
    limit: maxListings,
  });

  // Selected listing for popup
  const [selectedListing, setSelectedListing] = useState<EbayListing | null>(null);

  // Track the search query for feedback context
  const searchQuery = brandName ? `${brandName} ${itemName}` : itemName;

  // Build search query and fetch on mount (with stable dependency)
  useEffect(() => {
    if (itemName) {
      search(searchQuery);
    }
    // Only re-run when item or brand changes, not on every search callback change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemName, brandName]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('title')}
            </CardTitle>
            {ebaySite && (
              <span className="text-xs text-muted-foreground">{ebaySite}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Loading state */}
          {isLoading && <LoadingSkeleton />}

          {/* Error state - distinguish between service unavailable vs other errors */}
          {error && !isLoading && (
            <div className="py-4">
              {error.includes('not configured') || error.includes('503') ? (
                // Service not configured - show as info message, not error
                <div className="text-center text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('noResults')}</p>
                </div>
              ) : (
                // Other errors - show as error with retry option
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && listings.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('noResults')}</p>
            </div>
          )}

          {/* Listings */}
          {!isLoading && !error && listings.length > 0 && (
            <div className="space-y-3">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onViewDetails={setSelectedListing}
                  searchQuery={searchQuery}
                  gearItemId={gearItemId}
                  brandName={brandName || undefined}
                  itemName={itemName}
                />
              ))}
            </div>
          )}

          {/* View all on eBay link - always show when not loading */}
          {!isLoading && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              asChild
            >
              <a
                href={`https://www.${ebaySite || 'ebay.de'}/sch/i.html?_nkw=${encodeURIComponent(
                  brandName ? `${brandName} ${itemName}` : itemName
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('viewAllOnEbay')}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Detail Popup */}
      {selectedListing && (
        <EbayListingPopup
          listing={selectedListing}
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </>
  );
}
