/**
 * WishlistInsightsPanel Component
 *
 * Feature: 053-merchant-integration
 * Task: T047
 *
 * Displays aggregate wishlist demand insights for merchants.
 * Shows product cards with user counts and proximity breakdowns.
 */

'use client';

import { memo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Users, MapPin, TrendingUp, Filter, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { WishlistInsight } from '@/types/merchant-offer';
import type { InsightFilters } from '@/hooks/merchant/useWishlistInsights';

// =============================================================================
// Types
// =============================================================================

export interface WishlistInsightsPanelProps {
  /** List of insights */
  insights: WishlistInsight[];
  /** Loading state */
  isLoading: boolean;
  /** Current filters */
  filters: InsightFilters;
  /** Total user count */
  totalUserCount: number;
  /** Update filters callback */
  onFiltersChange: (filters: Partial<InsightFilters>) => void;
  /** Select insight callback */
  onSelectInsight: (catalogItemId: string) => void;
  /** Refresh callback */
  onRefresh: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const RADIUS_OPTIONS = [
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
  { value: 25000, label: '25 km' },
  { value: 50000, label: '50 km' },
  { value: 100000, label: '100 km' },
];

function _getProximityColor(bucket: string): string {
  switch (bucket) {
    case '5km':
      return 'bg-green-500';
    case '10km':
      return 'bg-green-400';
    case '25km':
      return 'bg-yellow-500';
    case '50km':
      return 'bg-orange-400';
    default:
      return 'bg-gray-400';
  }
}

// =============================================================================
// Subcomponents
// =============================================================================

const InsightCard = memo(function InsightCard({
  insight,
  onClick,
}: {
  insight: WishlistInsight;
  onClick: () => void;
}) {
  const t = useTranslations('MerchantInsights');
  const totalBreakdown =
    insight.proximityBreakdown.within5km +
    insight.proximityBreakdown.within10km +
    insight.proximityBreakdown.within25km +
    insight.proximityBreakdown.within50km +
    insight.proximityBreakdown.beyond50km;

  // Guard against division by zero - use safe divisor
  const safeDivisor = totalBreakdown > 0 ? totalBreakdown : 1;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{insight.catalogItemName}</h3>
            {insight.catalogItemBrand && (
              <p className="text-xs text-muted-foreground truncate">
                {insight.catalogItemBrand}
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold">{insight.userCount}</span>
            <span className="text-muted-foreground">{t('users')}</span>
          </div>
          {insight.recentAddCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{insight.recentAddCount} {t('thisWeek')}
            </Badge>
          )}
        </div>

        {/* Proximity Breakdown Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('proximityBreakdown')}</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            {insight.proximityBreakdown.within5km > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{
                  width: `${(insight.proximityBreakdown.within5km / safeDivisor) * 100}%`,
                }}
                title={`5km: ${insight.proximityBreakdown.within5km}`}
              />
            )}
            {insight.proximityBreakdown.within10km > 0 && (
              <div
                className="bg-green-400 transition-all"
                style={{
                  width: `${(insight.proximityBreakdown.within10km / safeDivisor) * 100}%`,
                }}
                title={`10km: ${insight.proximityBreakdown.within10km}`}
              />
            )}
            {insight.proximityBreakdown.within25km > 0 && (
              <div
                className="bg-yellow-500 transition-all"
                style={{
                  width: `${(insight.proximityBreakdown.within25km / safeDivisor) * 100}%`,
                }}
                title={`25km: ${insight.proximityBreakdown.within25km}`}
              />
            )}
            {insight.proximityBreakdown.within50km > 0 && (
              <div
                className="bg-orange-400 transition-all"
                style={{
                  width: `${(insight.proximityBreakdown.within50km / safeDivisor) * 100}%`,
                }}
                title={`50km: ${insight.proximityBreakdown.within50km}`}
              />
            )}
            {insight.proximityBreakdown.beyond50km > 0 && (
              <div
                className="bg-gray-400 transition-all"
                style={{
                  width: `${(insight.proximityBreakdown.beyond50km / safeDivisor) * 100}%`,
                }}
                title={`100km+: ${insight.proximityBreakdown.beyond50km}`}
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              5km
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              25km
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              100km+
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const InsightCardSkeleton = memo(function InsightCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </CardContent>
    </Card>
  );
});

// =============================================================================
// Component
// =============================================================================

export const WishlistInsightsPanel = memo(function WishlistInsightsPanel({
  insights,
  isLoading,
  filters,
  totalUserCount,
  onFiltersChange,
  onSelectInsight,
  onRefresh,
  className,
}: WishlistInsightsPanelProps) {
  const t = useTranslations('MerchantInsights');

  const handleRadiusChange = useCallback(
    (value: string) => {
      const parsed = parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        onFiltersChange({ radiusMeters: parsed });
      }
    },
    [onFiltersChange]
  );

  const handleMinUsersChange = useCallback(
    (value: number[]) => {
      onFiltersChange({ minUsers: value[0] });
    },
    [onFiltersChange]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('subtitle', { count: totalUserCount })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          {t('refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Radius Filter */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filters.radiusMeters.toString()}
                onValueChange={handleRadiusChange}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Users Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground shrink-0">
                {t('minUsers')}:
              </span>
              <Slider
                value={[filters.minUsers]}
                onValueChange={handleMinUsersChange}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-6 text-center">{filters.minUsers}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <InsightCardSkeleton key={i} />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{t('noInsights')}</h3>
            <p className="text-sm text-muted-foreground">{t('noInsightsDescription')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <InsightCard
              key={insight.catalogItemId}
              insight={insight}
              onClick={() => onSelectInsight(insight.catalogItemId)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
