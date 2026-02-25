/**
 * PrivacySettingsForm - Privacy Settings Form Component
 *
 * Feature: 046-user-messaging-system
 * Task: T041
 *
 * Form for managing user's messaging privacy preferences.
 */

'use client';

import { Loader2, Eye, MessageCircle, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivacySettings } from '@/hooks/messaging/usePrivacySettings';
import { useTranslations } from 'next-intl';
import type { MessagingPrivacy } from '@/types/messaging';

/**
 * Privacy settings form component.
 */
export function PrivacySettingsForm() {
  const t = useTranslations('Settings');
  const { settings, isLoading, isSaving, error, updateSetting } = usePrivacySettings();

  if (isLoading) {
    return <PrivacySettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Who Can Message Me */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('privacy.whoCanMessage')}</CardTitle>
          </div>
          <CardDescription>
            {t('privacy.whoCanMessageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.messaging_privacy}
            onValueChange={(value) =>
              updateSetting('messaging_privacy', value as MessagingPrivacy)
            }
            disabled={isSaving}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('privacy.selectWhoCanMessage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">{t('privacy.everyone')}</SelectItem>
              <SelectItem value="friends_only">{t('privacy.friendsOnly')}</SelectItem>
              <SelectItem value="nobody">{t('privacy.nobodyDisableDMs')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {settings.messaging_privacy === 'everyone' && t('privacy.everyoneCanMessageHint')}
            {settings.messaging_privacy === 'friends_only' && t('privacy.friendsOnlyCanMessageHint')}
            {settings.messaging_privacy === 'nobody' && t('privacy.nobodyCanMessageHint')}
          </p>
        </CardContent>
      </Card>

      {/* Search Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('privacy.searchVisibility')}</CardTitle>
          </div>
          <CardDescription>
            {t('privacy.searchVisibilityDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="discoverable">{t('privacy.appearInSearch')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('privacy.appearInSearchHint')}
              </p>
            </div>
            <Switch
              id="discoverable"
              checked={settings.discoverable}
              onCheckedChange={(checked) => updateSetting('discoverable', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Online Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('privacy.onlineStatus')}</CardTitle>
          </div>
          <CardDescription>
            {t('privacy.onlineStatusDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="online-status-privacy">{t('privacy.whoCanSeeOnlineStatus')}</Label>
            <Select
              value={settings.online_status_privacy}
              onValueChange={(value) =>
                updateSetting('online_status_privacy', value as MessagingPrivacy)
              }
              disabled={isSaving}
            >
              <SelectTrigger id="online-status-privacy" className="w-full">
                <SelectValue placeholder={t('privacy.selectWhoCanSeeStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">{t('privacy.everyone')}</SelectItem>
                <SelectItem value="friends_only">{t('privacy.friendsOnly')}</SelectItem>
                <SelectItem value="nobody">{t('privacy.nobody')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.online_status_privacy === 'everyone' && t('privacy.everyoneCanSeeOnlineHint')}
              {settings.online_status_privacy === 'friends_only' && t('privacy.friendsOnlyCanSeeOnlineHint')}
              {settings.online_status_privacy === 'nobody' && t('privacy.nobodyCanSeeOnlineHint')}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="read-receipts">{t('privacy.readReceipts')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('privacy.readReceiptsHint')}
              </p>
            </div>
            <Switch
              id="read-receipts"
              checked={settings.read_receipts_enabled}
              onCheckedChange={(checked) => updateSetting('read_receipts_enabled', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Saving indicator */}
      {isSaving && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('privacy.saving')}
        </div>
      )}
    </div>
  );
}

function PrivacySettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
