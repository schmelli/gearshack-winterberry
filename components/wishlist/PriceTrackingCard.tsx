/**
 * Price Tracking Card Component (Stateless UI)
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingDown } from 'lucide-react';
import type { PriceTracking } from '@/types/price-tracking';

interface PriceTrackingCardProps {
  tracking: PriceTracking | null;
  isLoading: boolean;
  onEnableTracking: () => void;
  onDisableTracking: () => void;
  onToggleAlerts: (enabled: boolean) => void;
  onSearchPrices: () => void;
}

export function PriceTrackingCard({
  tracking,
  isLoading,
  onEnableTracking,
  onDisableTracking,
  onToggleAlerts,
  onSearchPrices,
}: PriceTrackingCardProps) {
  const t = useTranslations('Wishlist.priceTracking.card');
  const tMain = useTranslations('Wishlist.priceTracking');
  const locale = useLocale();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!tracking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            {t('titleDisabled')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
          <Button onClick={onEnableTracking} className="w-full">
            {t('trackPrices')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          {t('titleEnabled')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="alerts-toggle" className="text-sm">
            {t('priceDropAlerts')}
          </Label>
          <Switch
            id="alerts-toggle"
            checked={tracking.alerts_enabled}
            onCheckedChange={onToggleAlerts}
          />
        </div>

        {tracking.last_checked_at && (
          <p className="text-xs text-muted-foreground">
            {tMain('lastChecked', {
              time: new Date(tracking.last_checked_at).toLocaleString(
                locale === 'de' ? 'de-DE' : 'en-US',
                {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }
              ),
            })}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={onSearchPrices} className="flex-1">
            {t('searchPricesNow')}
          </Button>
          <Button onClick={onDisableTracking} variant="outline">
            {t('disable')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
