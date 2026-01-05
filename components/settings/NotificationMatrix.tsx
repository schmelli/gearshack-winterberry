/**
 * Notification Matrix Component
 *
 * Feature: settings-update
 * Matrix of notification preferences across channels.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Smartphone } from 'lucide-react';
import type { NotificationPreferences } from '@/types/settings';

interface NotificationMatrixProps {
  preferences: NotificationPreferences;
  onUpdate: (prefs: NotificationPreferences) => void;
  disabled?: boolean;
}

interface NotificationCategory {
  key: string;
  labelKey: string;
  channels: {
    push?: boolean;
    email?: boolean;
    inApp?: boolean;
  };
}

const categories: NotificationCategory[] = [
  {
    key: 'price_alerts',
    labelKey: 'priceAlerts',
    channels: { push: true, email: true, inApp: true },
  },
  {
    key: 'friend_activity',
    labelKey: 'friendActivity',
    channels: { push: true, email: false, inApp: true },
  },
  {
    key: 'messages',
    labelKey: 'messages',
    channels: { push: true, email: true, inApp: true },
  },
  {
    key: 'community_updates',
    labelKey: 'communityUpdates',
    channels: { push: false, email: true, inApp: true },
  },
  {
    key: 'product_updates',
    labelKey: 'productUpdates',
    channels: { push: false, email: true, inApp: false },
  },
  {
    key: 'marketing',
    labelKey: 'marketing',
    channels: { push: false, email: true, inApp: false },
  },
];

export function NotificationMatrix({
  preferences,
  onUpdate,
  disabled = false,
}: NotificationMatrixProps) {
  const t = useTranslations('settings.notifications.matrix');

  const handleToggle = (
    category: string,
    channel: 'push' | 'email' | 'in_app',
    checked: boolean
  ) => {
    const updated = { ...preferences };

    if (channel === 'push' && category in updated.push) {
      updated.push = {
        ...updated.push,
        [category]: checked,
      };
    } else if (channel === 'email' && category in updated.email) {
      updated.email = {
        ...updated.email,
        [category]: checked,
      };
    } else if (channel === 'in_app' && category in updated.in_app) {
      updated.in_app = {
        ...updated.in_app,
        [category]: checked,
      };
    }

    onUpdate(updated);
  };

  const getValue = (category: string, channel: 'push' | 'email' | 'in_app'): boolean => {
    if (channel === 'push') {
      return (preferences.push as unknown as Record<string, boolean>)[category] ?? false;
    } else if (channel === 'email') {
      return (preferences.email as unknown as Record<string, boolean>)[category] ?? false;
    } else {
      return (preferences.in_app as unknown as Record<string, boolean>)[category] ?? false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="grid grid-cols-[1fr_60px_60px_60px] items-center gap-4 pb-2 border-b">
        <div />
        <div className="flex flex-col items-center gap-1">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('push')}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('email')}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('inApp')}</span>
        </div>
      </div>

      {/* Category Rows */}
      {categories.map((cat) => (
        <div
          key={cat.key}
          className="grid grid-cols-[1fr_60px_60px_60px] items-center gap-4"
        >
          <Label className="font-normal">{t(`categories.${cat.labelKey}`)}</Label>

          {/* Push */}
          <div className="flex justify-center">
            {cat.channels.push ? (
              <Switch
                checked={getValue(cat.key, 'push')}
                onCheckedChange={(checked) => handleToggle(cat.key, 'push', checked)}
                disabled={disabled}
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>

          {/* Email */}
          <div className="flex justify-center">
            {cat.channels.email ? (
              <Switch
                checked={getValue(cat.key, 'email')}
                onCheckedChange={(checked) => handleToggle(cat.key, 'email', checked)}
                disabled={disabled}
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>

          {/* In-App */}
          <div className="flex justify-center">
            {cat.channels.inApp ? (
              <Switch
                checked={getValue(cat.key, 'in_app')}
                onCheckedChange={(checked) => handleToggle(cat.key, 'in_app', checked)}
                disabled={disabled}
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
