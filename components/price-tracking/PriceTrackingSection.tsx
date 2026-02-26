/**
 * Price Tracking Section Component
 * Feature: 050-price-tracking
 *
 * Main section for gear detail modal showing:
 * - Enable/disable price tracking toggle
 * - Current prices from various sources
 * - Price history chart
 * - Alert settings
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bell,
  BellOff,
  Loader2,
  RefreshCw,
  TrendingDown,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePriceTracking } from '@/hooks/price-tracking/usePriceTracking';
import { usePriceSearch } from '@/hooks/price-tracking/usePriceSearch';
import { usePriceHistory } from '@/hooks/price-tracking/usePriceHistory';
import { PriceResultCard } from './PriceResultCard';
import { PriceHistoryChart } from './PriceHistoryChart';
import { cn } from '@/lib/utils';
import type { GearItem } from '@/types/gear';

interface PriceTrackingSectionProps {
  item: GearItem;
  className?: string;
}

export function PriceTrackingSection({
  item,
  className,
}: PriceTrackingSectionProps) {
  const t = useTranslations('PriceTracking');
  const [isExpanded, setIsExpanded] = useState(false);

  // Hooks for price tracking functionality
  const {
    tracking,
    isLoading: trackingLoading,
    error: trackingError,
    enableTracking,
    disableTracking,
    toggleAlerts,
  } = usePriceTracking(item.id);

  const {
    results,
    status: searchStatus,
    error: searchError,
    searchPrices,
  } = usePriceSearch();

  const {
    history,
    isLoading: historyLoading,
    error: historyError,
  } = usePriceHistory(tracking?.id ?? '');

  // Handle enable/disable tracking
  const handleToggleTracking = useCallback(async () => {
    try {
      if (tracking?.enabled) {
        await disableTracking();
      } else {
        await enableTracking(true);
        // Trigger initial price search
        await searchPrices({
          gear_item_id: item.id,
          item_name: `${item.brand ?? ''} ${item.name}`.trim(),
        });
      }
    } catch (err) {
      console.error('Failed to toggle tracking:', err);
    }
  }, [tracking, enableTracking, disableTracking, searchPrices, item]);

  // Handle alerts toggle
  const handleToggleAlerts = useCallback(async (enabled: boolean) => {
    try {
      await toggleAlerts(enabled);
    } catch (err) {
      console.error('Failed to toggle alerts:', err);
    }
  }, [toggleAlerts]);

  // Handle manual price refresh
  const handleRefreshPrices = useCallback(async () => {
    try {
      await searchPrices({
        gear_item_id: item.id,
        item_name: `${item.brand ?? ''} ${item.name}`.trim(),
      });
    } catch (err) {
      console.error('Failed to refresh prices:', err);
    }
  }, [searchPrices, item]);

  // Find lowest price
  const lowestPriceResult = results?.results?.reduce(
    (min, result) =>
      result.total_price < (min?.total_price ?? Infinity) ? result : min,
    results.results[0]
  );

  // Loading state
  if (trackingLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('title')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="price-tracking"
            checked={tracking?.enabled ?? false}
            onCheckedChange={handleToggleTracking}
          />
          <Label htmlFor="price-tracking" className="text-xs text-muted-foreground">
            {tracking?.enabled ? t('enabled') : t('disabled')}
          </Label>
        </div>
      </div>

      {/* Error state */}
      {trackingError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {trackingError.message || t('loadingError')}
          </AlertDescription>
        </Alert>
      )}

      {/* Tracking enabled content */}
      {tracking?.enabled && (
        <div className="space-y-4">
          {/* Alert settings */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              {tracking.alerts_enabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">{t('priceDropAlerts')}</span>
            </div>
            <Switch
              checked={tracking.alerts_enabled}
              onCheckedChange={handleToggleAlerts}
            />
          </div>

          {/* Current prices section */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                  <Search className="h-4 w-4" />
                  {t('currentPrices')}
                  {results?.results && results.results.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {t('found', { count: results.results.length })}
                    </span>
                  )}
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshPrices}
                disabled={searchStatus === 'loading'}
                className="h-8 w-8"
                aria-label={t('aria.refreshPrices')}
              >
                {searchStatus === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            <CollapsibleContent className="space-y-2 mt-2">
              {/* Search error */}
              {searchError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {searchError.message || t('searchError')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Partial results warning */}
              {results?.status === 'partial' && results.failed_sources.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('someSourcesUnavailable', { sources: results.failed_sources.map(s => s.source_name).join(', ') })}
                  </AlertDescription>
                </Alert>
              )}

              {/* Loading state */}
              {searchStatus === 'loading' && (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              )}

              {/* Price results */}
              {results?.results && results.results.length > 0 && (
                <div className="space-y-2">
                  {results.results.slice(0, 5).map((result) => (
                    <PriceResultCard
                      key={result.id}
                      result={result}
                      isLowestPrice={result.id === lowestPriceResult?.id}
                    />
                  ))}
                  {results.results.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      {t('moreResults', { count: results.results.length - 5 })}
                    </p>
                  )}
                </div>
              )}

              {/* No results */}
              {searchStatus === 'success' && (!results?.results || results.results.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('noResults')}
                </p>
              )}

              {/* Fuzzy matches */}
              {results?.fuzzy_matches && results.fuzzy_matches.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('similarProducts')}
                  </p>
                  <div className="space-y-1">
                    {results.fuzzy_matches.slice(0, 3).map((match, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs p-2 rounded bg-muted/30"
                      >
                        <span className="truncate flex-1">{match.product_name}</span>
                        <span className="text-muted-foreground ml-2">
                          {match.similarity > 0.8 ? t('highMatch') : t('lowMatch')} {t('match')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Price history chart */}
          {tracking.id && (
            <PriceHistoryChart
              history={history}
              isLoading={historyLoading}
              error={historyError?.message}
              currency={item.currency ?? 'USD'}
            />
          )}
        </div>
      )}

      {/* Tracking disabled state */}
      {!tracking?.enabled && (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <TrendingDown className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('enableTracking')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('getAlerts')}
          </p>
        </div>
      )}
    </div>
  );
}
