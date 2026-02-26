/**
 * OfferCard Component
 *
 * Feature: 053-merchant-integration
 * Task: T058
 *
 * Card display for user offers showing merchant, product, price,
 * discount percentage, and expiration countdown.
 */

'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Store, Clock, Tag, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { UserOffer, OfferStatus } from '@/types/merchant-offer';
import { getExpiresIn } from '@/types/merchant-offer';

// =============================================================================
// Types
// =============================================================================

export interface OfferCardProps {
  offer: UserOffer;
  /** Click handler */
  onClick: () => void;
  /** Additional class names */
  className?: string;
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

function getStatusConfig(status: Exclude<OfferStatus, 'converted'>): {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: typeof Clock;
  colorClass: string;
} {
  switch (status) {
    case 'pending':
      return { variant: 'default', icon: Clock, colorClass: 'text-blue-500' };
    case 'viewed':
      return { variant: 'secondary', icon: Clock, colorClass: 'text-amber-500' };
    case 'accepted':
      return { variant: 'default', icon: CheckCircle, colorClass: 'text-green-500' };
    case 'declined':
      return { variant: 'outline', icon: XCircle, colorClass: 'text-gray-500' };
    case 'expired':
      return { variant: 'destructive', icon: AlertCircle, colorClass: 'text-red-500' };
  }
}

// =============================================================================
// Component
// =============================================================================

export const OfferCard = memo(function OfferCard({
  offer,
  onClick,
  className,
}: OfferCardProps) {
  const t = useTranslations('UserOffers');
  const statusConfig = getStatusConfig(offer.status);
  const StatusIcon = statusConfig.icon;
  const expiresIn = getExpiresIn(offer.expiresAt);
  const isExpired = offer.status === 'expired' || expiresIn === 'Expired';
  const isActionable = ['pending', 'viewed'].includes(offer.status) && !isExpired;

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-all',
        isActionable && 'hover:shadow-md hover:-translate-y-0.5',
        !isActionable && 'opacity-75',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      onClick={onClick}
      tabIndex={0}
      role="article"
      aria-label={`Offer from ${offer.merchant.businessName} for ${offer.productName}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
            {offer.productImageUrl ? (
              <Image
                src={offer.productImageUrl}
                alt={offer.productName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Merchant */}
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={offer.merchant.logoUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  <Store className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {offer.merchant.businessName}
              </span>
            </div>

            {/* Product Name */}
            <h3 className="font-medium text-sm truncate mb-1">{offer.productName}</h3>
            {offer.productBrand && (
              <p className="text-xs text-muted-foreground truncate">{offer.productBrand}</p>
            )}

            {/* Pricing */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground text-sm line-through">
                {formatPrice(offer.regularPrice)}
              </span>
              <span className="font-semibold text-primary">
                {formatPrice(offer.offerPrice)}
              </span>
              <Badge variant="secondary" className="text-xs">
                -{offer.discountPercent}%
              </Badge>
            </div>
          </div>

          {/* Status & Arrow */}
          <div className="flex flex-col items-end justify-between shrink-0">
            <Badge variant={statusConfig.variant} className="flex items-center gap-1">
              <StatusIcon className={cn('h-3 w-3', statusConfig.colorClass)} />
              <span className="text-xs">{t(`status.${offer.status}`)}</span>
            </Badge>

            {isActionable && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{expiresIn}</span>
              </div>
            )}

            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
