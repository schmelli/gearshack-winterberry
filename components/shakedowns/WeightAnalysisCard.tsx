/**
 * WeightAnalysisCard Component
 *
 * Feature: Shakedown Detail Enhancement - Weight Heatmap Analyzer
 *
 * Comprehensive weight analysis card combining heatmap, stats, and category breakdown.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Scale,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Package,
} from 'lucide-react';

import type { ShakedownGearItem } from '@/hooks/shakedowns/useShakedown';
import type { LoadoutItemState } from '@/types/loadout';
import { useWeightAnalysis } from '@/hooks/shakedowns/useWeightAnalysis';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { WeightHeatmapBar } from './WeightHeatmapBar';
import { CategoryWeightBreakdown } from './CategoryWeightBreakdown';

// =============================================================================
// Types
// =============================================================================

interface WeightAnalysisCardProps {
  /** Gear items to analyze */
  gearItems: ShakedownGearItem[];
  /** Item states from loadout */
  itemStates?: LoadoutItemState[];
  /** Community average base weight for comparison (grams) */
  communityAverageBaseWeight?: number;
  /** Click handler for items */
  onItemClick?: (itemId: string) => void;
  /** Additional className */
  className?: string;
  /** Default expanded state */
  defaultExpanded?: boolean;
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

// =============================================================================
// Component
// =============================================================================

export function WeightAnalysisCard({
  gearItems,
  itemStates = [],
  communityAverageBaseWeight,
  onItemClick,
  className,
  defaultExpanded = false,
}: WeightAnalysisCardProps): React.ReactElement {
  const t = useTranslations('Shakedowns.weightHeatmap');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const {
    totalWeight,
    baseWeight,
    wornWeight,
    consumableWeight,
    categoryBreakdown,
    outliers,
    hasOutliers,
    averageItemWeight,
    heaviestItem,
    lightestItem,
    communityComparison,
  } = useWeightAnalysis({
    gearItems,
    itemStates,
    communityAverageBaseWeight,
  });

  if (gearItems.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="size-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="size-5" />
              {t('title')}
              {hasOutliers && (
                <Badge variant="destructive" className="gap-1">
                  <Flame className="size-3" />
                  {outliers.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </div>

          {/* Community Comparison Badge */}
          {communityComparison && (
            <Badge
              variant={communityComparison.isAboveAverage ? 'secondary' : 'default'}
              className="gap-1"
            >
              {communityComparison.isAboveAverage ? (
                <TrendingUp className="size-3" />
              ) : communityComparison.percentageDifference < -5 ? (
                <TrendingDown className="size-3" />
              ) : (
                <Minus className="size-3" />
              )}
              {Math.abs(communityComparison.percentageDifference) < 5
                ? t('comparison.onTarget')
                : communityComparison.isAboveAverage
                ? t('comparison.aboveAverage', {
                    percentage: Math.abs(communityComparison.percentageDifference).toFixed(0),
                  })
                : t('comparison.belowAverage', {
                    percentage: Math.abs(communityComparison.percentageDifference).toFixed(0),
                  })}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Heatmap Bar */}
        <WeightHeatmapBar
          categoryBreakdown={categoryBreakdown}
          totalWeight={totalWeight}
          onCategoryClick={(categoryId) => {
            // Optionally scroll to or highlight category in breakdown
            setIsExpanded(true);
          }}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label={t('stats.totalWeight')}
            value={formatWeight(totalWeight)}
            highlight
          />
          <StatCard
            label={t('stats.baseWeight')}
            value={formatWeight(baseWeight)}
          />
          <StatCard
            label={t('stats.wornWeight')}
            value={formatWeight(wornWeight)}
          />
          <StatCard
            label={t('stats.consumableWeight')}
            value={formatWeight(consumableWeight)}
          />
        </div>

        {/* Weight Hogs Alert */}
        {hasOutliers && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <div className="flex items-start gap-3">
              <Flame className="size-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">
                  {t('outliers.title')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('outliers.description')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {outliers.slice(0, 3).map((outlier) => (
                    <Badge
                      key={outlier.item.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => onItemClick?.(outlier.item.id)}
                    >
                      {outlier.item.name} ({outlier.percentage.toFixed(0)}%)
                    </Badge>
                  ))}
                  {outliers.length > 3 && (
                    <Badge variant="outline">+{outliers.length - 3}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Expandable Category Breakdown */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between"
            >
              <span className="text-sm font-medium">
                {t('title')} ({t('categoryCount', { count: categoryBreakdown.length })})
              </span>
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <CategoryWeightBreakdown
              categoryBreakdown={categoryBreakdown}
              outliers={outliers}
              totalWeight={totalWeight}
              onItemClick={onItemClick}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

interface StatCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatCard({ label, value, highlight }: StatCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg p-3 text-center',
        highlight ? 'bg-primary/10' : 'bg-muted/50'
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-semibold', highlight ? 'text-primary' : '')}>{value}</p>
    </div>
  );
}

export default WeightAnalysisCard;
