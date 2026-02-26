/**
 * WeightHeatmapBar Component
 *
 * Feature: Shakedown Detail Enhancement - Weight Heatmap Analyzer
 *
 * Displays a horizontal heatmap bar showing weight distribution by category.
 * Includes tooltips with category details and percentage.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { CategoryWeightData } from '@/hooks/shakedowns/useWeightAnalysis';
import { cn } from '@/lib/utils';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// Types
// =============================================================================

interface WeightHeatmapBarProps {
  /** Category weight breakdown data */
  categoryBreakdown: CategoryWeightData[];
  /** Total weight for percentage calculation */
  totalWeight: number;
  /** Height of the bar in pixels (default: 32) */
  height?: number;
  /** Whether to show category labels below bar */
  showLabels?: boolean;
  /** Click handler for category segments */
  onCategoryClick?: (categoryId: string) => void;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${Math.round(grams)} g`;
}

function getCategoryColor(hue: number, intensity: number = 0.7): string {
  // HSL color with adjustable saturation based on weight percentage
  const saturation = 60 + intensity * 30; // 60-90%
  const lightness = 50 - intensity * 10; // 40-50%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// =============================================================================
// Component
// =============================================================================

export function WeightHeatmapBar({
  categoryBreakdown,
  totalWeight,
  height = 32,
  showLabels = true,
  onCategoryClick,
  className,
}: WeightHeatmapBarProps): React.ReactElement {
  const t = useTranslations('Shakedowns.weightHeatmap');

  // Calculate minimum width for visibility (at least 2% visible)
  const MIN_WIDTH_PERCENT = 2;

  // Prepare segments with adjusted widths
  const segments = useMemo(() => {
    if (categoryBreakdown.length === 0) return [];

    return categoryBreakdown.map((category) => {
      const rawPercentage = category.percentage;
      const displayPercentage = Math.max(rawPercentage, MIN_WIDTH_PERCENT);

      return {
        ...category,
        displayPercentage,
        color: getCategoryColor(category.hue, rawPercentage / 100),
      };
    });
  }, [categoryBreakdown]);

  // If no weight data, show empty state
  if (totalWeight === 0 || segments.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <div
          className="w-full rounded-lg bg-muted flex items-center justify-center"
          style={{ height }}
        >
          <span className="text-xs text-muted-foreground">{t('noData')}</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-2', className)}>
        {/* Heatmap Bar */}
        <div
          className="w-full rounded-lg overflow-hidden flex"
          style={{ height }}
        >
          {segments.map((segment, index) => (
            <Tooltip key={segment.categoryId}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onCategoryClick?.(segment.categoryId)}
                  className={cn(
                    'h-full transition-all duration-200',
                    'hover:brightness-110 hover:z-10 relative',
                    'focus:outline-none focus:ring-2 focus:ring-white focus:ring-inset',
                    onCategoryClick && 'cursor-pointer'
                  )}
                  style={{
                    width: `${segment.displayPercentage}%`,
                    backgroundColor: segment.color,
                    // Add subtle border between segments
                    borderRight: index < segments.length - 1 ? '1px solid rgba(255,255,255,0.2)' : undefined,
                  }}
                  aria-label={`${segment.categoryName}: ${segment.percentage.toFixed(1)}%`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{segment.categoryName}</p>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>{formatWeight(segment.totalWeight)} ({segment.percentage.toFixed(1)}%)</p>
                    <p>{t('itemCount', { count: segment.itemCount })}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Labels */}
        {showLabels && segments.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {segments.slice(0, 5).map((segment) => (
              <div
                key={segment.categoryId}
                className="flex items-center gap-1.5 text-xs"
              >
                <div
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-muted-foreground truncate max-w-[100px]">
                  {segment.categoryName}
                </span>
                <span className="font-medium">{segment.percentage.toFixed(0)}%</span>
              </div>
            ))}
            {segments.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{segments.length - 5} {t('moreCategories')}
              </span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default WeightHeatmapBar;
