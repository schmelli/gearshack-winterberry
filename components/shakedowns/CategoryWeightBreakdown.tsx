/**
 * CategoryWeightBreakdown Component
 *
 * Feature: Shakedown Detail Enhancement - Weight Heatmap Analyzer
 *
 * Displays an expandable accordion breakdown of weight by category.
 * Includes individual item weights and outlier badges.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, AlertTriangle, Package, Scale, Flame } from 'lucide-react';

import type { CategoryWeightData, WeightOutlier } from '@/hooks/shakedowns/useWeightAnalysis';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// Types
// =============================================================================

interface CategoryWeightBreakdownProps {
  /** Category breakdown data */
  categoryBreakdown: CategoryWeightData[];
  /** Weight outliers */
  outliers: WeightOutlier[];
  /** Total weight for context */
  totalWeight: number;
  /** Click handler for items */
  onItemClick?: (itemId: string) => void;
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

function getCategoryColor(hue: number): string {
  return `hsl(${hue}, 70%, 45%)`;
}

function getOutlierBadgeVariant(severity: 'moderate' | 'significant' | 'extreme'): 'secondary' | 'destructive' | 'default' {
  switch (severity) {
    case 'extreme':
      return 'destructive';
    case 'significant':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// =============================================================================
// Component
// =============================================================================

export function CategoryWeightBreakdown({
  categoryBreakdown,
  outliers,
  totalWeight,
  onItemClick,
  className,
}: CategoryWeightBreakdownProps): React.ReactElement {
  const t = useTranslations('Shakedowns.weightHeatmap');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Create outlier lookup for quick badge display
  const outlierMap = new Map<string, WeightOutlier>();
  outliers.forEach((o) => outlierMap.set(o.item.id, o));

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  if (categoryBreakdown.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Package className="size-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('noCategories')}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-2', className)}>
        {categoryBreakdown.map((category) => {
          const isExpanded = expandedCategories.has(category.categoryId);
          const categoryOutliers = category.items.filter((item) => outlierMap.has(item.id));

          return (
            <Collapsible
              key={category.categoryId}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category.categoryId)}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border',
                    'transition-colors hover:bg-muted/50',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    isExpanded && 'bg-muted/30'
                  )}
                >
                  {/* Category color indicator */}
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(category.hue) }}
                  />

                  {/* Category name and count */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{category.categoryName}</span>
                      {categoryOutliers.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <Flame className="size-3" />
                              {categoryOutliers.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t('weightHogs', { count: categoryOutliers.length })}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={category.percentage}
                        className="h-1.5 flex-1"
                        style={{
                          ['--progress-background' as string]: getCategoryColor(category.hue),
                        } as React.CSSProperties}
                      />
                      <span className="text-xs text-muted-foreground shrink-0">
                        {category.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Weight and count */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{formatWeight(category.totalWeight)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('items', { count: category.itemCount })}
                    </p>
                  </div>

                  {/* Expand icon */}
                  <ChevronDown
                    className={cn(
                      'size-4 text-muted-foreground transition-transform shrink-0',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="pt-1 pb-2 px-3 space-y-1">
                  {category.items.map((item) => {
                    const outlier = outlierMap.get(item.id);
                    const itemPercentage = totalWeight > 0
                      ? ((item.weightGrams || 0) / totalWeight) * 100
                      : 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onItemClick?.(item.id)}
                        className={cn(
                          'w-full flex items-center gap-2 p-2 rounded-md',
                          'transition-colors hover:bg-muted/50',
                          'focus:outline-none focus:ring-1 focus:ring-primary',
                          outlier && 'bg-destructive/5 border border-destructive/20'
                        )}
                      >
                        {/* Item name */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm truncate">{item.name}</p>
                          {item.brand && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.brand}
                            </p>
                          )}
                        </div>

                        {/* Outlier badge */}
                        {outlier && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={getOutlierBadgeVariant(outlier.severity)}
                                className="gap-1 text-xs shrink-0"
                              >
                                <Flame className="size-3" />
                                {t(`severity.${outlier.severity}`)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('outlierTooltip', { percentage: outlier.percentage.toFixed(1) })}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Weight */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">
                            {item.weightGrams !== null ? formatWeight(item.weightGrams) : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {itemPercentage.toFixed(1)}%
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export default CategoryWeightBreakdown;
