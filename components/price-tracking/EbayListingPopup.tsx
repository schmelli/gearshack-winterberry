/**
 * EbayListingPopup Component
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Display full details of an eBay listing in a dialog
 *
 * Constitution: UI components MUST be stateless (logic in hooks)
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  ExternalLink,
  Package,
  Gavel,
  Tag,
  MapPin,
  User,
  Star,
  Truck,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { EbayListing, EbayListingType, EbayCondition } from '@/types/ebay';

// =============================================================================
// Types
// =============================================================================

interface EbayListingPopupProps {
  /** The listing to display */
  listing: EbayListing;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
}

// =============================================================================
// Helper Components
// =============================================================================

function ListingTypeBadge({ type }: { type: EbayListingType }) {
  const t = useTranslations('EbayListings');

  const config: Record<EbayListingType, { icon: typeof Gavel; label: string; className: string }> = {
    auction: {
      icon: Gavel,
      label: t('types.auction'),
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    },
    buy_it_now: {
      icon: Tag,
      label: t('types.buyItNow'),
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    best_offer: {
      icon: Package,
      label: t('types.bestOffer'),
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
  };

  const { icon: Icon, label, className } = config[type];

  return (
    <Badge className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function ConditionDisplay({ condition }: { condition: EbayCondition }) {
  const t = useTranslations('EbayListings');

  const labels: Record<EbayCondition, string> = {
    new: t('conditions.new'),
    open_box: t('conditions.openBox'),
    refurbished: t('conditions.refurbished'),
    used: t('conditions.used'),
    for_parts: t('conditions.forParts'),
  };

  const colors: Record<EbayCondition, string> = {
    new: 'text-green-600 dark:text-green-400',
    open_box: 'text-blue-600 dark:text-blue-400',
    refurbished: 'text-amber-600 dark:text-amber-400',
    used: 'text-gray-600 dark:text-gray-400',
    for_parts: 'text-red-600 dark:text-red-400',
  };

  return (
    <span className={`font-medium ${colors[condition]}`}>
      {labels[condition]}
    </span>
  );
}

function SellerInfo({ seller }: { seller: NonNullable<EbayListing['seller']> }) {
  const t = useTranslations('EbayListings');
  const tCommon = useTranslations('Common');

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-full bg-primary/10">
        <User className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{seller.username ?? tCommon('seller.unknown')}</span>
          {seller.badge && (
            <Badge variant="outline" className="text-xs">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {seller.badge === 'top_rated' ? tCommon('seller.topRatedBadge') : seller.badge}
            </Badge>
          )}
        </div>
        {seller.feedbackPercent !== null && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{seller.feedbackPercent}% {t('seller.positive')}</span>
            {seller.feedbackCount !== null && (
              <span>({seller.feedbackCount.toLocaleString()} {t('seller.ratings')})</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function EbayListingPopup({
  listing,
  isOpen,
  onClose,
}: EbayListingPopupProps) {
  const t = useTranslations('EbayListings');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{t('popup.title')}</DialogTitle>
        </DialogHeader>

        {/* Image */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted mb-4">
          {listing.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.thumbnailUrl}
              alt={listing.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold leading-tight mb-3">{listing.title}</h2>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <ListingTypeBadge type={listing.listingType} />
        </div>

        {/* Price Section */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-bold text-primary">{listing.priceFormatted}</span>
            {listing.listingType === 'auction' && listing.bidCount !== undefined && (
              <span className="text-sm text-muted-foreground">
                {t('bids', { count: listing.bidCount })}
              </span>
            )}
          </div>

          {/* Shipping info */}
          <div className="flex items-center gap-2 text-sm">
            <Truck className="w-4 h-4 text-muted-foreground" />
            {listing.shippingCost === null ? (
              <span className="text-muted-foreground">{t('shippingNotSpecified')}</span>
            ) : listing.shippingCost === 0 ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                {t('freeShipping')}
              </span>
            ) : (
              <span>
                + {listing.shippingCost.toFixed(2)} {listing.currency} {t('shipping')}
              </span>
            )}
          </div>

          {/* Time left for auctions */}
          {listing.listingType === 'auction' && listing.timeLeft && (
            <div className="flex items-center gap-2 text-sm mt-2 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
              {listing.timeLeft}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Details */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('popup.condition')}</span>
            <ConditionDisplay condition={listing.condition} />
          </div>

          {listing.location && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('popup.location')}</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {listing.location}
              </span>
            </div>
          )}
        </div>

        {/* Seller */}
        {listing.seller && (
          <>
            <Separator className="my-4" />
            <h3 className="text-sm font-medium mb-2">{t('popup.seller')}</h3>
            <SellerInfo seller={listing.seller} />
          </>
        )}

        <Separator className="my-4" />

        {/* CTA Button */}
        <Button className="w-full" asChild>
          <a href={listing.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('popup.viewOnEbay')}
          </a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
