/**
 * TopPricesDisplay Component
 *
 * Feature: 142 - Price Display on Wishlist Cards
 *
 * Displays the top 3 best prices from merchant offers for a wishlist item.
 * Shows merchant name, offer price, and discount percentage.
 * Gracefully handles loading states and no offers available.
 */

'use client';

import { DollarSign, TrendingDown } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { useWishlistItemOffers } from '@/hooks/offers/useWishlistItemOffers';

// =============================================================================
// Component Props
// =============================================================================

export interface TopPricesDisplayProps {
  /** Wishlist item ID to fetch offers for */
  wishlistItemId: string | null | undefined;
  /** Additional CSS classes */
  className?: string;
  /** Display variant */
  variant?: 'compact' | 'full';
}

// =============================================================================
// Component
// =============================================================================

export function TopPricesDisplay({
  wishlistItemId,
  className,
  variant = 'full',
}: TopPricesDisplayProps) {
  const t = useTranslations('TopPrices');
  const locale = useLocale();
  const { offers, isLoading } = useWishlistItemOffers(wishlistItemId, true);

  // Locale-aware currency formatter
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Don't render anything if no wishlist item ID
  if (!wishlistItemId) return null;

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'border border-border rounded-lg bg-muted/5 p-3',
          className
        )}
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/30">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground animate-pulse" aria-hidden="true" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {t('loading')}
          </span>
        </div>
      </div>
    );
  }

  // No offers available
  if (offers.length === 0) {
    return (
      <div
        className={cn(
          'border border-dashed border-muted rounded-lg bg-muted/5 p-3',
          className
        )}
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/30">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </div>
          <span className="text-xs text-muted-foreground">
            {t('noOffers')}
          </span>
        </div>
      </div>
    );
  }

  // Display offers
  return (
    <div
      className={cn(
        'border border-emerald-200 dark:border-emerald-800 rounded-lg',
        'bg-emerald-50/50 dark:bg-emerald-950/20 p-3',
        className
      )}
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/20">
          <TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
        </div>
        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          {t('header')}
        </span>
      </div>

      {/* Offer List */}
      <ul className="space-y-1.5" role="list">
        {offers.map((offer, index) => (
          <li
            key={offer.id}
            className={cn(
              'flex items-center justify-between gap-2 px-2 py-1.5 rounded',
              'bg-white/50 dark:bg-stone-900/30',
              index === 0 && 'ring-1 ring-emerald-400/50 dark:ring-emerald-600/50'
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {index === 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500" aria-label="Best offer">
                  {t('bestBadge')}
                </span>
              )}
              <span className="text-xs text-foreground/80 truncate">
                {offer.merchantName}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {offer.discountPercent > 0 && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500" aria-label={`${offer.discountPercent}% discount`}>
                  -{offer.discountPercent}%
                </span>
              )}
              <span className="text-sm font-bold text-foreground">
                {formatPrice(offer.offerPrice)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Footer hint */}
      {variant === 'full' && (
        <div className="mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
          <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 text-center">
            {t('clickToView')}
          </p>
        </div>
      )}
    </div>
  );
}
