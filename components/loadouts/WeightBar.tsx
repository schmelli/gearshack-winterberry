/**
 * WeightBar Component
 *
 * Feature: 005-loadout-management
 * FR-017: Display a sticky weight bar that remains visible during scroll
 * FR-018: Update total weight in real-time as items change
 * FR-019: Color-code the weight bar based on total weight thresholds
 * FR-020: Format weight display in grams with thousands separator
 */

'use client';

import { Scale, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeightDisplay } from '@/components/ui/weight-display';
import {
  getWeightCategory,
  getWeightCategoryBgColor,
} from '@/lib/loadout-utils';

// =============================================================================
// Types
// =============================================================================

interface WeightBarProps {
  totalWeight: number;
  itemCount: number;
}

// =============================================================================
// Component
// =============================================================================

export function WeightBar({ totalWeight, itemCount }: WeightBarProps) {
  const weightCategory = getWeightCategory(totalWeight);
  const bgColorClass = getWeightCategoryBgColor(weightCategory);

  // Get category label for accessibility
  const categoryLabel =
    weightCategory === 'ultralight'
      ? 'Ultralight'
      : weightCategory === 'moderate'
        ? 'Moderate'
        : 'Heavy';

  return (
    <div
      className={cn(
        'sticky bottom-0 z-40 border-t transition-colors',
        bgColorClass
      )}
    >
      <div className="container flex items-center justify-between py-3">
        {/* Left: Item Count */}
        <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground">
          <Package className="h-4 w-4" />
          <span>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Right: Total Weight */}
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary-foreground" />
          <span className="text-xl font-bold text-primary-foreground">
            <WeightDisplay value={totalWeight} showToggle />
          </span>
          <span className="rounded bg-primary-foreground/20 px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {categoryLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
