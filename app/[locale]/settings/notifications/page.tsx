/**
 * Notifications Settings Page
 *
 * Feature: settings-update
 * Consolidated notification preferences across all channels.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingItem } from '@/components/settings/SettingItem';
import { NotificationMatrix } from '@/components/settings/NotificationMatrix';
import { QuietHoursPicker } from '@/components/settings/QuietHoursPicker';
import { useUserPreferences } from '@/hooks/settings/useUserPreferences';
import type { NotificationPreferences, QuietHoursSettings } from '@/types/settings';

export default function NotificationsSettingsPage() {
  const t = useTranslations('settings.notifications');
  const { preferences, updatePreference, isLoading } = useUserPreferences();

  const handleMatrixUpdate = (updated: NotificationPreferences) => {
    updatePreference('notificationPreferences', updated);
  };

  const handleQuietHoursUpdate = (quietHours: QuietHoursSettings) => {
    updatePreference('notificationPreferences', {
      ...preferences.notificationPreferences,
      quiet_hours: quietHours,
    });
  };

  const handleSoundChange = (sound: boolean) => {
    updatePreference('notificationPreferences', {
      ...preferences.notificationPreferences,
      sound,
    });
  };

  const handleBadgeChange = (badgeCount: boolean) => {
    updatePreference('notificationPreferences', {
      ...preferences.notificationPreferences,
      badge_count: badgeCount,
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <SettingsSection
        title={t('types.title')}
        description={t('types.description')}
      >
        <NotificationMatrix
          preferences={preferences.notificationPreferences}
          onUpdate={handleMatrixUpdate}
          disabled={isLoading}
        />
      </SettingsSection>

      {/* Quiet Hours */}
      <SettingsSection
        title={t('quietHours.title')}
        description={t('quietHours.description')}
      >
        <QuietHoursPicker
          settings={preferences.notificationPreferences.quiet_hours}
          onUpdate={handleQuietHoursUpdate}
          disabled={isLoading}
        />
      </SettingsSection>

      {/* Sound & Badge */}
      <SettingsSection
        title={t('general.title')}
        description={t('general.description')}
      >
        <SettingItem
          label={t('general.sound.label')}
          description={t('general.sound.description')}
          disabled={isLoading}
        >
          <Switch
            checked={preferences.notificationPreferences.sound}
            onCheckedChange={handleSoundChange}
            disabled={isLoading}
          />
        </SettingItem>

        <SettingItem
          label={t('general.badge.label')}
          description={t('general.badge.description')}
          disabled={isLoading}
        >
          <Switch
            checked={preferences.notificationPreferences.badge_count}
            onCheckedChange={handleBadgeChange}
            disabled={isLoading}
          />
        </SettingItem>
      </SettingsSection>
    </div>
  );
}
