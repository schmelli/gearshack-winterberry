/**
 * Price Tracking Card Component (Stateless UI)
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

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
            Price Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable price tracking to discover prices from online retailers, eBay, and local outdoor shops.
          </p>
          <Button onClick={onEnableTracking} className="w-full">
            Track Prices
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
          Price Tracking Enabled
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="alerts-toggle" className="text-sm">
            Price drop alerts
          </Label>
          <Switch
            id="alerts-toggle"
            checked={tracking.alerts_enabled}
            onCheckedChange={onToggleAlerts}
          />
        </div>

        {tracking.last_checked_at && (
          <p className="text-xs text-muted-foreground">
            Last checked:{' '}
            {new Date(tracking.last_checked_at).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={onSearchPrices} className="flex-1">
            Search Prices Now
          </Button>
          <Button onClick={onDisableTracking} variant="outline">
            Disable
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
