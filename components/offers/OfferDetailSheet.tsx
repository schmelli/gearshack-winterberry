/**
 * OfferDetailSheet Component
 *
 * Feature: 053-merchant-integration
 * Task: T059
 *
 * Sheet/drawer showing full offer details including product info,
 * pricing breakdown, merchant info, and nearest store location.
 */

'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Store,
  Clock,
  Tag,
  MapPin,
  MessageSquare,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { OfferResponseActions } from './OfferResponseActions';
import type { UserOfferDetail, OfferStatus } from '@/types/merchant-offer';

// =============================================================================
// Types
// =============================================================================

export interface OfferDetailSheetProps {
  /** Offer detail data */
  offer: UserOfferDetail | null;
  /** Open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Accept handler */
  onAccept: () => Promise<boolean>;
  /** Decline handler */
  onDecline: () => Promise<boolean>;
  /** Block merchant handler */
  onBlockMerchant: (reason?: string) => Promise<boolean>;
  /** Report handler */
  onReport: (reason: string, details?: string) => Promise<boolean>;
  /** Processing state */
  isProcessing: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusColor(status: Exclude<OfferStatus, 'converted'>): string {
  switch (status) {
    case 'pending':
      return 'bg-blue-100 text-blue-800';
    case 'viewed':
      return 'bg-amber-100 text-amber-800';
    case 'accepted':
      return 'bg-green-100 text-green-800';
    case 'declined':
      return 'bg-gray-100 text-gray-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
  }
}

// =============================================================================
// Component
// =============================================================================

export const OfferDetailSheet = memo(function OfferDetailSheet({
  offer,
  open,
  onClose,
  onAccept,
  onDecline,
  onBlockMerchant,
  onReport,
  isProcessing,
}: OfferDetailSheetProps) {
  const t = useTranslations('UserOffers');

  if (!offer) return null;

  const isActionable = ['pending', 'viewed'].includes(offer.status);
  const savings = offer.regularPrice - offer.offerPrice;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{t('offerDetails')}</SheetTitle>
          <SheetDescription>
            {t('fromMerchant', { merchant: offer.merchant.businessName })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Product Image */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            {offer.productImageUrl ? (
              <img
                src={offer.productImageUrl}
                alt={offer.productName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Status Badge */}
            <Badge
              className={cn(
                'absolute top-3 right-3',
                getStatusColor(offer.status)
              )}
            >
              {t(`status.${offer.status}`)}
            </Badge>

            {/* Wishlist indicator */}
            {offer.wishlistItemId && (
              <Badge
                variant="secondary"
                className="absolute top-3 left-3 flex items-center gap-1"
              >
                <Heart className="h-3 w-3 fill-current" />
                {t('fromWishlist')}
              </Badge>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h2 className="text-xl font-semibold">{offer.productName}</h2>
            {offer.productBrand && (
              <p className="text-muted-foreground">{offer.productBrand}</p>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('regularPrice')}</span>
              <span className="line-through">{formatPrice(offer.regularPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('discount')}</span>
              <span className="text-green-600 font-medium">
                -{offer.discountPercent}% ({formatPrice(savings)})
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">{t('offerPrice')}</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(offer.offerPrice)}
              </span>
            </div>
          </div>

          {/* Expiration */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {offer.expiresIn === 'Expired'
                ? t('expired')
                : t('expiresIn', { time: offer.expiresIn })}
            </span>
            <span className="text-muted-foreground">
              ({formatDate(offer.expiresAt)})
            </span>
          </div>

          {/* Personal Message */}
          {offer.message && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                {t('personalMessage')}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {offer.message}
              </p>
            </div>
          )}

          <Separator />

          {/* Merchant Info */}
          <div>
            <h3 className="font-medium mb-3">{t('aboutMerchant')}</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={offer.merchant.logoUrl ?? undefined} />
                <AvatarFallback>
                  <Store className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{offer.merchant.businessName}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {offer.merchant.businessType === 'local'
                    ? t('localStore')
                    : offer.merchant.businessType === 'chain'
                      ? t('chainStore')
                      : t('onlineStore')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Nearest Location - T088: Handle online-only merchants */}
          {offer.merchant.businessType === 'online' ? (
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">{t('shipsNationwide')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('onlineDeliveryNote')}
                </p>
              </div>
            </div>
          ) : offer.nearestLocation && (
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">{offer.nearestLocation.name}</p>
                <p className="text-xs text-muted-foreground">
                  {offer.nearestLocation.address}
                </p>
                {offer.nearestLocation.distanceKm > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('distanceAway', { km: offer.nearestLocation.distanceKm.toFixed(1) })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {isActionable && (
            <OfferResponseActions
              offerId={offer.id}
              merchantId={offer.merchant.id}
              merchantName={offer.merchant.businessName}
              onAccept={onAccept}
              onDecline={onDecline}
              onBlockMerchant={onBlockMerchant}
              onReport={onReport}
              isProcessing={isProcessing}
            />
          )}

          {/* Non-actionable state message */}
          {!isActionable && (
            <div className="p-4 rounded-lg bg-muted text-center text-sm text-muted-foreground">
              {offer.status === 'accepted' && t('acceptedMessage', { merchant: offer.merchant.businessName })}
              {offer.status === 'declined' && t('declinedMessage')}
              {offer.status === 'expired' && t('expiredMessage')}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
