/**
 * WishlistOffersPanel Component
 *
 * Feature: Community Hub Enhancement
 *
 * Compact panel showing:
 * - Active offers on user's wishlist items
 * - Merchant info, product name, discount
 * - Quick link to full offers page
 */

'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Tag, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUserOffers } from '@/hooks/offers/useUserOffers';
import type { WishlistOffersPanelProps } from '@/types/community';
import type { UserOffer } from '@/types/merchant-offer';

/**
 * Formats expiration time
 */
function formatExpiry(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs < 0) return 'Expired';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h left`;

  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

// =============================================================================
// Offer Item
// =============================================================================

interface OfferItemProps {
  offer: UserOffer;
}

function OfferItem({ offer }: OfferItemProps) {
  const isNew = offer.status === 'pending';

  return (
    <Link
      href={`/offers/${offer.id}`}
      className="flex items-center gap-3 py-2 rounded-md hover:bg-muted/50 transition-colors -mx-2 px-2"
    >
      {/* Merchant Logo */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        {offer.merchant.logoUrl ? (
          <AvatarImage src={offer.merchant.logoUrl} alt={offer.merchant.businessName} />
        ) : null}
        <AvatarFallback className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
          {offer.merchant.businessName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Offer Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {offer.productBrand ? `${offer.productBrand} ` : ''}
            {offer.productName}
          </p>
          {isNew && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
              New
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {offer.merchant.businessName}
        </p>
      </div>

      {/* Discount & Expiry */}
      <div className="flex flex-col items-end flex-shrink-0">
        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          -{offer.discountPercent}%
        </Badge>
        <span className="text-[10px] text-muted-foreground mt-1">
          {formatExpiry(offer.expiresAt)}
        </span>
      </div>
    </Link>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  const t = useTranslations('Community');

  return (
    <div className="py-4 text-center">
      <Tag className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">
        {t('panels.offers.noOffers')}
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {t('panels.offers.addToWishlist')}
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function WishlistOffersPanel({ className, limit = 3 }: WishlistOffersPanelProps) {
  const t = useTranslations('Community');
  const { offers, unreadCount, isLoading } = useUserOffers();

  const displayedOffers = offers.slice(0, limit);
  const hasMore = offers.length > limit;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('panels.offers.title')}
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1 text-xs px-1.5 py-0">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {!isLoading && offers.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {displayedOffers.map((offer) => (
              <OfferItem key={offer.id} offer={offer} />
            ))}

            {/* View All Link */}
            <Link
              href="/offers"
              className={cn(
                'flex items-center justify-between py-2 px-3 -mx-3 rounded-md mt-2',
                'text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors'
              )}
            >
              <span>
                {hasMore
                  ? t('panels.offers.viewAll', { count: offers.length })
                  : t('panels.offers.manageOffers')}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default WishlistOffersPanel;
