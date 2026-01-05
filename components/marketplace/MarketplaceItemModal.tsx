/**
 * Marketplace Item Detail Modal
 *
 * Feature: 056-community-hub-enhancements
 *
 * Displays detailed information about a marketplace listing.
 * Responsive: Dialog on desktop, Sheet on mobile.
 */

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { MessageCircle, User, X, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { MarketplaceListing } from '@/types/marketplace';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface MarketplaceItemModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The listing to display */
  listing: MarketplaceListing | null;
  /** Whether the viewport is mobile */
  isMobile: boolean;
  /** Callback when message seller is clicked */
  onMessageSeller: (listing: MarketplaceListing) => void;
  /** Callback when seller profile is clicked */
  onSellerClick: (sellerId: string) => void;
  /** Locale for currency formatting */
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
  } catch {
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

/**
 * Format relative date
 */
function formatListedDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return locale === 'de' ? 'Heute' : 'Today';
  } else if (diffDays === 1) {
    return locale === 'de' ? 'Gestern' : 'Yesterday';
  } else if (diffDays < 7) {
    return locale === 'de' ? `vor ${diffDays} Tagen` : `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

// ============================================================================
// Modal Content Component
// ============================================================================

interface ModalContentProps {
  listing: MarketplaceListing;
  onMessageSeller: (listing: MarketplaceListing) => void;
  onSellerClick: (sellerId: string) => void;
  onClose: () => void;
  locale: string;
}

function ModalContent({
  listing,
  onMessageSeller,
  onSellerClick,
  onClose,
  locale,
}: ModalContentProps) {
  const t = useTranslations('Marketplace');
  const formattedPrice = formatPrice(listing.pricePaid, listing.currency, locale);
  const typeBadges = getListingTypeBadges(listing);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Close button (mobile) */}
      <div className="absolute right-4 top-4 z-10 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Image section */}
      <div className="relative aspect-square w-full shrink-0 bg-muted">
        {listing.primaryImageUrl ? (
          <Image
            src={listing.primaryImageUrl}
            alt={listing.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 450px"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-6xl text-muted-foreground/50">📦</div>
          </div>
        )}

        {/* Type badges overlay */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {typeBadges.map((badge) => (
            <Badge
              key={badge}
              variant={badge === 'forSale' ? 'default' : 'secondary'}
              className={cn(
                'text-sm',
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

      {/* Content section */}
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            {listing.name}
          </h2>
          {listing.brand && (
            <p className="text-muted-foreground">{listing.brand}</p>
          )}
        </div>

        {/* Price and condition */}
        <div className="mt-4 flex items-center justify-between">
          {formattedPrice ? (
            <span className="text-2xl font-bold text-foreground">
              {formattedPrice}
            </span>
          ) : (
            <span className="text-lg text-muted-foreground">-</span>
          )}
          <Badge variant="outline" className="text-sm">
            {listing.condition}
          </Badge>
        </div>

        {/* Listed date */}
        <p className="mt-2 text-sm text-muted-foreground">
          {t('modal.listed')}: {formatListedDate(listing.listedAt, locale)}
        </p>

        {/* Divider */}
        <div className="my-4 h-px bg-border" />

        {/* Seller section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('modal.seller')}
          </h3>
          <button
            onClick={() => onSellerClick(listing.sellerId)}
            className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
          >
            <Avatar className="h-10 w-10">
              {listing.sellerAvatar && (
                <AvatarImage src={listing.sellerAvatar} alt={listing.sellerName} />
              )}
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-left font-medium text-foreground">
              {listing.sellerName}
            </span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="mt-4 space-y-2">
          <Button
            className="w-full gap-2"
            onClick={() => onMessageSeller(listing)}
          >
            <MessageCircle className="h-4 w-4" />
            {t('card.messageButton')}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => onSellerClick(listing.sellerId)}
          >
            <User className="h-4 w-4" />
            {t('card.viewProfile')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MarketplaceItemModal({
  open,
  onOpenChange,
  listing,
  isMobile,
  onMessageSeller,
  onSellerClick,
  locale = 'en',
}: MarketplaceItemModalProps) {
  if (!listing) {
    return null;
  }

  const content = (
    <ModalContent
      listing={listing}
      onMessageSeller={onMessageSeller}
      onSellerClick={onSellerClick}
      onClose={() => onOpenChange(false)}
      locale={locale}
    />
  );

  // Mobile: Full-screen sheet from bottom
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <VisuallyHidden>
            <SheetTitle>{listing.name}</SheetTitle>
          </VisuallyHidden>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Centered dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>{listing.name}</DialogTitle>
        </VisuallyHidden>
        {content}
      </DialogContent>
    </Dialog>
  );
}

export default MarketplaceItemModal;
