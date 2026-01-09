/**
 * Alert Preferences Form Component (Stateless UI)
 * Feature: 050-price-tracking (US6)
 * Date: 2025-12-17
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Mail, TrendingDown, MapPin, Users, Sparkles, Moon } from 'lucide-react';
import type { AlertPreferences } from '@/types/price-tracking';

interface AlertPreferencesFormProps {
  preferences: AlertPreferences | null;
  isLoading: boolean;
  error: Error | null;
  onUpdate: (updates: Partial<AlertPreferences>) => Promise<void>;
}

export function AlertPreferencesForm({
  preferences,
  isLoading,
  error,
  onUpdate,
}: AlertPreferencesFormProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading preferences...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load preferences: {error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!preferences) {
    return null;
  }

  const handleToggle = async (field: keyof AlertPreferences, value: boolean) => {
    try {
      await onUpdate({ [field]: value });
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive price alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push-enabled" className="text-base font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive instant alerts in your browser
                </p>
              </div>
            </div>
            <Switch
              id="push-enabled"
              checked={preferences.push_enabled}
              onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-enabled" className="text-base font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via email
                </p>
              </div>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Types</CardTitle>
          <CardDescription>
            Control which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-green-600" />
              <div>
                <Label htmlFor="price-drop-enabled" className="text-base font-medium">
                  Price Drops
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when prices decrease
                </p>
              </div>
            </div>
            <Switch
              id="price-drop-enabled"
              checked={preferences.price_drop_enabled}
              onCheckedChange={(checked) => handleToggle('price_drop_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <Label htmlFor="local-shop-enabled" className="text-base font-medium">
                  Local Shop Availability
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alert when items are available nearby
                </p>
              </div>
            </div>
            <Switch
              id="local-shop-enabled"
              checked={preferences.local_shop_enabled}
              onCheckedChange={(checked) => handleToggle('local_shop_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <Label htmlFor="community-enabled" className="text-base font-medium">
                  Community Availability
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alert when community members have the item
                </p>
              </div>
            </div>
            <Switch
              id="community-enabled"
              checked={preferences.community_enabled}
              onCheckedChange={(checked) => handleToggle('community_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <div>
                <Label htmlFor="personal-offer-enabled" className="text-base font-medium">
                  Personal Offers
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get exclusive deals from partner retailers
                </p>
              </div>
            </div>
            <Switch
              id="personal-offer-enabled"
              checked={preferences.personal_offer_enabled}
              onCheckedChange={(checked) => handleToggle('personal_offer_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours (Future Enhancement) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Coming soon: Set hours when you don&apos;t want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature will allow you to configure quiet hours (e.g., 10 PM - 7 AM) when
            notifications will be held until the next day.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
