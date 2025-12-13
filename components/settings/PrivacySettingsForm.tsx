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
import type { MessagingPrivacy } from '@/types/messaging';

/**
 * Privacy settings form component.
 */
export function PrivacySettingsForm() {
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
            <CardTitle className="text-base">Who Can Message Me</CardTitle>
          </div>
          <CardDescription>
            Control who can start new conversations with you
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
              <SelectValue placeholder="Select who can message you" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">Everyone</SelectItem>
              <SelectItem value="friends_only">Friends Only</SelectItem>
              <SelectItem value="nobody">Nobody (Disable DMs)</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {settings.messaging_privacy === 'everyone' &&
              'Anyone on GearShack can start a conversation with you.'}
            {settings.messaging_privacy === 'friends_only' &&
              'Only people you have added as friends can message you.'}
            {settings.messaging_privacy === 'nobody' &&
              'Nobody can start new conversations with you. Existing conversations will still work.'}
          </p>
        </CardContent>
      </Card>

      {/* Search Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Search Visibility</CardTitle>
          </div>
          <CardDescription>
            Control whether others can find you in search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="discoverable">Appear in Search Results</Label>
              <p className="text-xs text-muted-foreground">
                When disabled, other users won&apos;t find you when searching
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
            <CardTitle className="text-base">Online Status</CardTitle>
          </div>
          <CardDescription>
            Control your online presence visibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-online">Show Online Status</Label>
              <p className="text-xs text-muted-foreground">
                Others can see when you&apos;re online
              </p>
            </div>
            <Switch
              id="show-online"
              checked={settings.show_online_status}
              onCheckedChange={(checked) => updateSetting('show_online_status', checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="read-receipts">Read Receipts</Label>
              <p className="text-xs text-muted-foreground">
                Let others know when you&apos;ve read their messages
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
          Saving...
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
