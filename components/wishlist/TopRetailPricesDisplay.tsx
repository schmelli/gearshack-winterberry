/**
 * TopRetailPricesDisplay Component
 *
 * Feature: 050-price-tracking (extension for Issue #142)
 *
 * Displays the top 3 best prices from price research sources
 * (Google Shopping, eBay, general retailers) on wishlist gear cards.
 *
 * Stateless component - receives price data via props following Feature-Sliced Light architecture.
 */

'use client';

import { ExternalLink, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PriceResult } from '@/types/price-tracking';

// =============================================================================
// Component Props
// =============================================================================

export interface TopRetailPricesDisplayProps {
  /** Price results to display (max 3) */
  priceResults: PriceResult[];
  /** Whether price data is currently loading */
  isLoading?: boolean;
  /** Display variant - compact for standard cards, full for detailed cards */
  variant?: 'compact' | 'full';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get source icon/label based on source type
 */
function getSourceBadge(sourceType: PriceResult['source_type']): {
  label: string;
  colorClass: string;
} {
  switch (sourceType) {
    case 'ebay':
      return { label: 'eBay', colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    case 'google_shopping':
      return { label: 'Google', colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'retailer':
      return { label: 'Retailer', colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'local_shop':
      return { label: 'Local', colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
    default:
      return { label: 'Other', colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' };
  }
}

/**
 * SECURITY: Validate URL is safe to use in href (prevents javascript: XSS)
 */
function isValidHttpUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Format price with currency
 */
function formatPrice(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency is invalid
    return `$${amount.toFixed(2)}`;
  }
}

// =============================================================================
// Component
// =============================================================================

export function TopRetailPricesDisplay({
  priceResults,
  isLoading = false,
  variant = 'compact',
  className,
}: TopRetailPricesDisplayProps) {
  const isCompact = variant === 'compact';

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50/50 dark:bg-stone-900/20',
          isCompact ? 'p-2' : 'p-3',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-stone-200 dark:bg-stone-700 animate-pulse">
            <TrendingDown className="h-3 w-3 text-stone-400" />
          </div>
          <span className="text-xs text-muted-foreground">Loading prices...</span>
        </div>
      </div>
    );
  }

  // No results state
  if (priceResults.length === 0) {
    return (
      <div
        className={cn(
          'border border-dashed border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50/30 dark:bg-stone-900/10',
          isCompact ? 'p-2' : 'p-3',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-stone-200/50 dark:bg-stone-700/50">
            <TrendingDown className="h-3 w-3 text-stone-400" />
          </div>
          <span className="text-xs text-muted-foreground">No price data available yet</span>
        </div>
      </div>
    );
  }

  // Get the best (lowest) price for comparison
  const bestPrice = priceResults[0]?.total_price || 0;

  return (
    <div
      className={cn(
        'border border-emerald-200 dark:border-emerald-800/50 rounded-lg',
        'bg-emerald-50/50 dark:bg-emerald-950/20',
        isCompact ? 'p-2.5' : 'p-3',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20">
          <TrendingDown className="h-3 w-3 text-emerald-600 dark:text-emerald-500" />
        </div>
        <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-400">
          Best Retail Prices
        </span>
      </div>

      {/* Price List */}
      <div className="space-y-1.5">
        {priceResults.map((result, index) => {
          const sourceBadge = getSourceBadge(result.source_type);
          const isBestPrice = index === 0;
          const savingsPercent =
            index > 0 && bestPrice > 0
              ? Math.round(((result.total_price - bestPrice) / bestPrice) * 100)
              : 0;

          return (
            <div
              key={result.id}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md',
                'bg-white dark:bg-stone-900/40',
                isCompact ? 'p-1.5' : 'p-2',
                'border',
                isBestPrice
                  ? 'border-emerald-500/30 dark:border-emerald-600/30'
                  : 'border-stone-200 dark:border-stone-700'
              )}
            >
              {/* Left: Source and name */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {/* Source badge */}
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded',
                      sourceBadge.colorClass
                    )}
                  >
                    {sourceBadge.label}
                  </span>

                  {/* BEST badge */}
                  {isBestPrice && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                      BEST
                    </span>
                  )}
                </div>

                {/* Source name */}
                {!isCompact && result.source_name && (
                  <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {result.source_name}
                  </span>
                )}
              </div>

              {/* Right: Price */}
              <div className="flex flex-col items-end">
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    isCompact ? 'text-xs' : 'text-sm',
                    isBestPrice
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-foreground'
                  )}
                >
                  {formatPrice(result.total_price, result.price_currency)}
                </span>

                {/* Show percentage difference for non-best prices */}
                {!isBestPrice && savingsPercent > 0 && !isCompact && (
                  <span className="text-[9px] text-muted-foreground">
                    +{savingsPercent}%
                  </span>
                )}
              </div>

              {/* Link icon (if URL available and valid) */}
              {/* SECURITY: Validate URL to prevent XSS via javascript: protocol */}
              {result.source_url && isValidHttpUrl(result.source_url) && !isCompact && (
                <a
                  href={result.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center h-6 w-6 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                  title="View offer"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
