/**
 * PriceHistoryStub Component
 *
 * Feature: 049-wishlist-view
 * Task: T066
 *
 * A clearly marked stub component for future price history chart features.
 * Displays a mock chart visual (using div placeholders) with "coming soon"
 * messaging to indicate this is a placeholder for future functionality.
 *
 * Used in: Detailed/Large wishlist card view
 */

'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Component Props
// =============================================================================

export interface PriceHistoryStubProps {
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Mock Chart Bars Component
// =============================================================================

function MockChartBars() {
  // Pre-defined heights for mock chart bars (simulate price trend)
  const barHeights = [45, 60, 40, 70, 55, 65, 50, 75, 60, 55, 70, 65];

  return (
    <div className="flex items-end justify-between gap-1 h-12 w-full">
      {barHeights.map((height, index) => (
        <div
          key={index}
          className="flex-1 bg-muted/40 rounded-t-sm transition-all"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function PriceHistoryStub({ className }: PriceHistoryStubProps) {
  const t = useTranslations('Wishlist.priceHistory');

  return (
    <div
      className={cn(
        // Dashed border to indicate stub/placeholder
        'border-2 border-dashed border-muted rounded-lg',
        // Subtle background
        'bg-muted/10',
        // Padding
        'p-4',
        className
      )}
    >
      {/* Header with icon and title */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/30">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {t('stubTitle')}
        </span>
      </div>

      {/* Mock chart visual */}
      <MockChartBars />

      {/* Coming soon message */}
      <div className="mt-3 pt-3 border-t border-dashed border-muted">
        <p className="text-[10px] text-muted-foreground/70 text-center">
          {t('comingSoon')}
        </p>
      </div>
    </div>
  );
}
