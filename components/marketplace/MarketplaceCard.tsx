/**
 * Marketplace Listing Card
 *
 * Feature: 056-community-hub-enhancements
 * Task: T020
 *
 * Displays a single marketplace listing with image, details,
 * seller info, and message button.
 */

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { MessageCircle, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MarketplaceListing } from '@/types/marketplace';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface MarketplaceCardProps {
  listing: MarketplaceListing;
  onMessageSeller: (listing: MarketplaceListing) => void;
  onSellerClick: (sellerId: string) => void;
  onCardClick?: (listing: MarketplaceListing) => void;
  locale?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format price with locale-aware currency formatting
 */
function formatPrice(
  price: number | null,
  currency: string | null,
  locale = 'en'
): string | null {
  if (price === null) return null;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  } catch (error) {
    // Log error for debugging but gracefully fallback
    console.warn(`Failed to format price ${price} with currency ${currency}:`, error);
    // Fallback for invalid currency codes
    return `${currency || '$'}${price.toFixed(2)}`;
  }
}

/**
 * Get listing type badges to display
 */
function getListingTypeBadges(listing: MarketplaceListing): string[] {
  const badges: string[] = [];
  if (listing.isForSale) badges.push('forSale');
  if (listing.canBeTraded) badges.push('forTrade');
  if (listing.canBeBorrowed) badges.push('forBorrow');
  return badges;
}

// ============================================================================
// Component
// ============================================================================

export function MarketplaceCard({
  listing,
  onMessageSeller,
  onSellerClick,
  onCardClick,
  locale = 'en',
}: MarketplaceCardProps) {
  const t = useTranslations('Marketplace');

  const formattedPrice = formatPrice(listing.pricePaid, listing.currency, locale);
  const typeBadges = getListingTypeBadges(listing);

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
      onClick={() => onCardClick?.(listing)}
    >
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {listing.primaryImageUrl ? (
          <Image
            src={listing.primaryImageUrl}
            alt={listing.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-4xl text-muted-foreground/50">📦</div>
          </div>
        )}

        {/* Type badges overlay */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {typeBadges.map((badge) => (
            <Badge
              key={badge}
              variant={badge === 'forSale' ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                badge === 'forSale' && 'bg-green-600 hover:bg-green-700',
                badge === 'forTrade' && 'bg-blue-600 hover:bg-blue-700 text-white',
                badge === 'forBorrow' && 'bg-amber-600 hover:bg-amber-700 text-white'
              )}
            >
              {t(`card.${badge}`)}
            </Badge>
          ))}
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        {/* Name */}
        <h3 className="line-clamp-1 font-semibold text-foreground">
          {listing.name}
        </h3>

        {/* Brand */}
        {listing.brand && (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {listing.brand}
          </p>
        )}

        {/* Price and condition row */}
        <div className="flex items-center justify-between">
          {formattedPrice ? (
            <span className="font-semibold text-foreground">
              {formattedPrice}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
          <Badge variant="outline" className="text-xs">
            {listing.condition}
          </Badge>
        </div>

        {/* Seller info */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSellerClick(listing.sellerId);
          }}
          className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted"
        >
          <Avatar className="h-7 w-7">
            {listing.sellerAvatar && (
              <AvatarImage src={listing.sellerAvatar} alt={listing.sellerName} />
            )}
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="line-clamp-1 text-sm text-muted-foreground">
            {listing.sellerName}
          </span>
        </button>

        {/* Message button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onMessageSeller(listing);
          }}
        >
          <MessageCircle className="h-4 w-4" />
          {t('card.messageButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
