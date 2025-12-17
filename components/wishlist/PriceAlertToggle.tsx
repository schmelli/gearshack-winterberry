/**
 * Price Alert Toggle Component (Stateless UI)
 * Feature: 050-price-tracking (US2)
 * Date: 2025-12-17
 */

'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff } from 'lucide-react';

interface PriceAlertToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function PriceAlertToggle({
  enabled,
  onToggle,
  disabled = false,
}: PriceAlertToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        {enabled ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <Label htmlFor="price-alerts" className="font-medium">
            Price Drop Alerts
          </Label>
          <p className="text-sm text-muted-foreground">
            Get notified when prices drop below the lowest recorded price
          </p>
        </div>
      </div>
      <Switch
        id="price-alerts"
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
