/**
 * ResellerPricesSection Component
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Display best reseller prices for a wishlist item (Trailblazer only)
 *
 * Constitution: UI components must be stateless - all logic in hooks
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { ExternalLink, MapPin, Store, Globe, RefreshCw, Crown, Bell, BellOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useResellerPrices } from '@/hooks/price-tracking/useResellerPrices';
import { usePriceTracking } from '@/hooks/price-tracking/usePriceTracking';
import type { ResellerPriceWithDetails } from '@/types/reseller';

// =============================================================================
// Types
// =============================================================================

interface ResellerPricesSectionProps {
  /** Gear item ID */
  gearItemId: string;
  /** Search query (brand + product name) */
  query: string;
  /** User's country code */
  countryCode?: string;
  /** User's location for local shop sorting */
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

// =============================================================================
// Sub-Components
// =============================================================================

function ResellerPriceCard({ price }: { price: ResellerPriceWithDetails }) {
  const t = useTranslations('ResellerPrices');
  const locale = useLocale();
  const reseller = price.reseller;
  const isLocal = reseller.resellerType === 'local' || reseller.resellerType === 'chain';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Reseller Logo or Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {reseller.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={reseller.logoUrl}
                alt={reseller.name}
                className="w-full h-full object-contain"
              />
            ) : isLocal ? (
              <Store className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Globe className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* Reseller Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{reseller.name}</h4>
              <Badge variant={isLocal ? 'secondary' : 'outline'} className="text-xs">
                {isLocal ? t('typeLocal') : t('typeOnline')}
              </Badge>
              {reseller.status === 'partner' && (
                <Badge variant="default" className="text-xs bg-amber-500">
                  {t('partner')}
                </Badge>
              )}
            </div>

            {/* Location/Distance for local shops */}
            {isLocal && price.distanceFormatted && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <MapPin className="h-3 w-3" />
                <span>{price.distanceFormatted}</span>
                {reseller.addressCity && (
                  <span className="ml-1">• {reseller.addressCity}</span>
                )}
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-primary">
                {new Intl.NumberFormat(locale, {
                  style: 'currency',
                  currency: price.priceCurrency || 'EUR',
                }).format(price.priceAmount)}
              </span>
              {price.inStock === false && (
                <Badge variant="destructive" className="text-xs">
                  {t('outOfStock')}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={() => window.open(price.productUrl || reseller.websiteUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            {t('visitShop')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NotTrailblazerMessage() {
  const t = useTranslations('ResellerPrices');

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{t('trailblazerRequired')}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('trailblazerDescription')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PriceMonitoringButton({ gearItemId }: { gearItemId: string }) {
  const t = useTranslations('ResellerPrices');

  const {
    tracking,
    isLoading,
    enableTracking,
    disableTracking,
    toggleAlerts,
  } = usePriceTracking(gearItemId);

  const isEnabled = tracking?.enabled ?? false;
  const alertsEnabled = tracking?.alerts_enabled ?? false;

  const handleToggleTracking = async () => {
    try {
      if (isEnabled) {
        await disableTracking();
        toast.success(t('priceMonitoring.disabled'));
      } else {
        await enableTracking(true);
        toast.success(t('priceMonitoring.enabled'));
      }
    } catch (error) {
      console.error('Failed to toggle price monitoring:', error);
      toast.error('Failed to update price monitoring settings');
    }
  };

  const handleToggleAlerts = async (enabled: boolean) => {
    try {
      await toggleAlerts(enabled);
      toast.success(enabled ? 'Notifications enabled' : 'Notifications disabled');
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      toast.error('Failed to update notification settings');
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
        <Bell className="h-4 w-4 animate-pulse" />
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {isEnabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t('priceMonitoring.tooltip')}</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{t('priceMonitoring.title')}</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-monitoring" className="text-sm">
                  {t('priceMonitoring.enable')}
                </Label>
                <Switch
                  id="enable-monitoring"
                  checked={isEnabled}
                  onCheckedChange={handleToggleTracking}
                />
              </div>
            </div>

            {isEnabled && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notify-alerts" className="text-sm">
                    Enable Notifications
                  </Label>
                  <Switch
                    id="notify-alerts"
                    checked={alertsEnabled}
                    onCheckedChange={handleToggleAlerts}
                  />
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ResellerPricesSection({
  gearItemId,
  query,
  countryCode = 'DE',
  userLocation,
}: ResellerPricesSectionProps) {
  const t = useTranslations('ResellerPrices');

  const {
    localPrices,
    onlinePrices,
    isLoading,
    error,
    fromCache,
    isTrailblazer,
    refresh,
  } = useResellerPrices({
    gearItemId,
    query,
    countryCode,
    userLocation,
    autoFetch: true,
  });

  // Not a Trailblazer - show upgrade prompt
  if (!isTrailblazer && !isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Store className="h-4 w-4" />
            {t('title')}
          </h3>
          <PriceMonitoringButton gearItemId={gearItemId} />
        </div>
        <NotTrailblazerMessage />
      </section>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Store className="h-4 w-4" />
            {t('title')}
          </h3>
          <PriceMonitoringButton gearItemId={gearItemId} />
        </div>
        <LoadingSkeleton />
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Store className="h-4 w-4" />
            {t('title')}
          </h3>
          <PriceMonitoringButton gearItemId={gearItemId} />
        </div>
        <Card className="border-destructive/50">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // No results
  const hasResults = localPrices.length > 0 || onlinePrices.length > 0;
  if (!hasResults) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Store className="h-4 w-4" />
            {t('title')}
          </h3>
          <PriceMonitoringButton gearItemId={gearItemId} />
        </div>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('noResults')}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Results
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Store className="h-4 w-4" />
          {t('title')}
          {fromCache && (
            <Badge variant="outline" className="text-xs font-normal">
              {t('cached')}
            </Badge>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <PriceMonitoringButton gearItemId={gearItemId} />
          <Button variant="ghost" size="sm" onClick={refresh} className="h-7">
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {/* Local Shops (up to 2) */}
        {localPrices.map((price) => (
          <ResellerPriceCard key={price.id} price={price} />
        ))}

        {/* Online Shops (up to 1) */}
        {onlinePrices.map((price) => (
          <ResellerPriceCard key={price.id} price={price} />
        ))}
      </div>
    </section>
  );
}
