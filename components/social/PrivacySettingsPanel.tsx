/**
 * PrivacySettingsPanel Component
 *
 * Feature: 001-social-graph
 * Tasks: T049, T050, T052
 *
 * Social privacy settings with preset cards and granular controls.
 * Changes are applied immediately (no save button required).
 *
 * Presets:
 * - Only Me: Maximum privacy
 * - Friends Only: Share with trusted friends
 * - Everyone: Open to community
 * - Custom: Granular control
 */

'use client';

import { Lock, Users, Globe, Settings, Loader2, Eye, Activity, Backpack, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSocialPrivacy, getPresetInfo } from '@/hooks/social/useSocialPrivacy';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { PrivacyPreset, SocialPrivacySettings } from '@/types/social';

// =============================================================================
// Types
// =============================================================================

interface PrivacySettingsPanelProps {
  /** Show preset cards */
  showPresets?: boolean;
  /** Show granular controls */
  showGranular?: boolean;
  /** Additional class names */
  className?: string;
}

type VisibilityLevel = 'everyone' | 'friends_only' | 'nobody';

// =============================================================================
// Preset Card Component
// =============================================================================

interface PresetCardProps {
  preset: Exclude<PrivacyPreset, 'custom'>;
  isActive: boolean;
  isLoading: boolean;
  onSelect: () => void;
}

function PresetCard({ preset, isActive, isLoading, onSelect }: PresetCardProps) {
  const t = useTranslations('Social');

  const icons = {
    only_me: Lock,
    friends_only: Users,
    everyone: Globe,
  };
  const Icon = icons[preset];

  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all',
        'hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-border',
        isLoading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isLoading && isActive ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Icon className="h-6 w-6" />
        )}
      </div>
      <div>
        <p className="font-medium">{t(`privacy.presets.${preset}`)}</p>
        <p className="text-xs text-muted-foreground">
          {t(`privacy.presets.${preset}Desc`)}
        </p>
      </div>
    </button>
  );
}

// =============================================================================
// Granular Control Component
// =============================================================================

interface GranularControlProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon: React.ReactNode;
  disabled?: boolean;
}

function GranularControl({
  label,
  description,
  value,
  onChange,
  options,
  icon,
  disabled = false,
}: GranularControlProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
          {icon}
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PrivacySettingsPanel({
  showPresets = true,
  showGranular = true,
  className,
}: PrivacySettingsPanelProps) {
  const t = useTranslations('Social');
  const { settings, isLoading, error, updateSettings, applyPreset } = useSocialPrivacy();

  // Visibility options for selects
  const visibilityOptions = [
    { value: 'everyone', label: t('privacy.values.everyone') },
    { value: 'friends_only', label: t('privacy.values.friendsOnly') },
    { value: 'nobody', label: t('privacy.values.nobody') },
  ];

  // Activity visibility options (slightly different)
  const activityOptions = [
    { value: 'everyone', label: t('privacy.values.everyone') },
    { value: 'friends_only', label: t('privacy.values.friendsOnly') },
    { value: 'nobody', label: t('privacy.values.nobody') },
  ];

  // Handle preset selection
  const handlePresetSelect = async (preset: Exclude<PrivacyPreset, 'custom'>) => {
    try {
      await applyPreset(preset);
      toast.success(t('privacy.presetApplied'));
    } catch {
      toast.error(t('privacy.presetFailed'));
    }
  };

  // Handle granular setting change
  const handleSettingChange = async <K extends keyof SocialPrivacySettings>(
    key: K,
    value: SocialPrivacySettings[K]
  ) => {
    try {
      await updateSettings({ [key]: value });
      toast.success(t('privacy.settingUpdated'));
    } catch {
      toast.error(t('privacy.settingFailed'));
    }
  };

  if (isLoading) {
    return <PrivacySettingsSkeleton />;
  }

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="py-6 text-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return null;
  }

  const isCustom = settings.privacy_preset === 'custom';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Preset Cards */}
      {showPresets && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('privacy.presets.title')}</CardTitle>
            <CardDescription>
              Choose a preset or customize individual settings below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <PresetCard
                preset="only_me"
                isActive={settings.privacy_preset === 'only_me'}
                isLoading={isLoading}
                onSelect={() => handlePresetSelect('only_me')}
              />
              <PresetCard
                preset="friends_only"
                isActive={settings.privacy_preset === 'friends_only'}
                isLoading={isLoading}
                onSelect={() => handlePresetSelect('friends_only')}
              />
              <PresetCard
                preset="everyone"
                isActive={settings.privacy_preset === 'everyone'}
                isLoading={isLoading}
                onSelect={() => handlePresetSelect('everyone')}
              />
            </div>

            {isCustom && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You have customized settings. Choose a preset to reset.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Granular Controls */}
      {showGranular && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('privacy.granular.title')}</CardTitle>
            <CardDescription>
              Fine-tune who can see your content and activity
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {/* Online Status */}
            <GranularControl
              label={t('privacy.granular.onlineStatus')}
              description={t('privacy.granular.onlineStatusDesc')}
              value={settings.online_status_privacy}
              onChange={(v) => handleSettingChange('online_status_privacy', v as VisibilityLevel)}
              options={visibilityOptions}
              icon={<Eye className="h-5 w-5" />}
            />

            {/* Activity Feed */}
            <GranularControl
              label={t('privacy.granular.activityFeed')}
              description={t('privacy.granular.activityFeedDesc')}
              value={settings.activity_feed_privacy}
              onChange={(v) => handleSettingChange('activity_feed_privacy', v as VisibilityLevel)}
              options={activityOptions}
              icon={<Activity className="h-5 w-5" />}
            />

            {/* Messaging */}
            <GranularControl
              label="Messaging"
              description="Who can start conversations with you"
              value={settings.messaging_privacy}
              onChange={(v) => handleSettingChange('messaging_privacy', v as VisibilityLevel)}
              options={visibilityOptions}
              icon={<Backpack className="h-5 w-5" />}
            />

            {/* Discoverable */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="discoverable" className="text-sm font-medium">
                    {t('privacy.granular.discoverable')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('privacy.granular.discoverableDesc')}
                  </p>
                </div>
              </div>
              <Switch
                id="discoverable"
                checked={settings.discoverable}
                onCheckedChange={(checked) => handleSettingChange('discoverable', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function PrivacySettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-border p-4"
              >
                <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 animate-pulse rounded bg-muted" />
                <div className="space-y-1">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="h-9 w-[140px] animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default PrivacySettingsPanel;
