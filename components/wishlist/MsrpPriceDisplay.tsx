/**
 * MSRP Price Display Component
 *
 * Feature: 050-price-tracking (extension for wishlist cards)
 *
 * Displays the Manufacturer's Suggested Retail Price (MSRP) from the product
 * catalog on wishlist gear cards. Shows the official/expected price as a
 * reference point for price comparison.
 */

'use client';

import { Tag } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// Types
// =============================================================================

export interface MsrpPriceDisplayProps {
  /** MSRP amount in USD (null if not available) */
  msrpAmount: number | null;
  /** Currency code (defaults to USD) */
  currency?: string;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Display variant */
  variant?: 'compact' | 'inline' | 'badge';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function MsrpPriceDisplay({
  msrpAmount,
  currency = 'USD',
  isLoading = false,
  variant = 'inline',
  className,
}: MsrpPriceDisplayProps) {
  const t = useTranslations('Wishlist');
  const locale = useLocale();

  // Format price based on locale
  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `$${amount.toFixed(0)}`;
    }
  };

  // Loading state
  if (isLoading) {
    if (variant === 'badge') {
      return <Skeleton className={cn('h-5 w-16 rounded-full', className)} />;
    }
    return <Skeleton className={cn('h-4 w-20', className)} />;
  }

  // No MSRP available
  if (msrpAmount === null) {
    return null;
  }

  // Badge variant - small pill with icon
  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
          'text-[10px] font-medium',
          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
          className
        )}
        title={t('msrp.tooltip')}
      >
        <Tag className="h-2.5 w-2.5" aria-hidden="true" />
        {t('msrp.label')}: {formatPrice(msrpAmount)}
      </span>
    );
  }

  // Compact variant - just the price with small label
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs text-muted-foreground',
          className
        )}
        title={t('msrp.tooltip')}
      >
        <Tag className="h-3 w-3 text-amber-600 dark:text-amber-500" aria-hidden="true" />
        <span className="font-medium text-amber-700 dark:text-amber-400">
          {formatPrice(msrpAmount)}
        </span>
      </div>
    );
  }

  // Inline variant (default) - label + price
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm',
        className
      )}
      title={t('msrp.tooltip')}
    >
      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Tag className="h-3 w-3 text-amber-600 dark:text-amber-500" aria-hidden="true" />
      </div>
      <span className="text-xs text-muted-foreground">{t('msrp.label')}:</span>
      <span className="font-semibold text-amber-700 dark:text-amber-400">
        {formatPrice(msrpAmount)}
      </span>
    </div>
  );
}
