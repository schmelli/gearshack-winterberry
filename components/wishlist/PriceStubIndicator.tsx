/**
 * PriceStubIndicator Component
 *
 * Feature: 049-wishlist-view
 * Task: T064
 *
 * A clearly marked stub indicator for future price monitoring features.
 * Displays with dashed border and "coming soon" messaging to indicate
 * this is a placeholder for future functionality.
 *
 * Used in: Medium wishlist card view (below community availability panel)
 */

'use client';

import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Component Props
// =============================================================================

export interface PriceStubIndicatorProps {
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function PriceStubIndicator({ className }: PriceStubIndicatorProps) {
  return (
    <div
      className={cn(
        // Dashed border to indicate stub/placeholder
        'border-2 border-dashed border-muted rounded-lg',
        // Subtle background
        'bg-muted/10',
        // Padding and layout
        'p-3 flex items-center gap-2',
        className
      )}
    >
      {/* Icon in muted style */}
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/30">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Coming soon message */}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-muted-foreground">
          Price Monitoring
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          Coming soon
        </span>
      </div>
    </div>
  );
}
