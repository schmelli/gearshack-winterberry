/**
 * Settings Page - Appearance
 *
 * Feature: settings-update
 * Provides appearance settings including theme, display density, and animations.
 * This is the default settings page shown when navigating to /settings.
 *
 * Community Section Restructure:
 * Added start page navigation preference.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingItem } from '@/components/settings/SettingItem';
import { SwipeActionSelector } from '@/components/settings/SwipeActionSelector';
import { useUserPreferences } from '@/hooks/settings/useUserPreferences';
import type { DisplayDensity, StartPage, SwipeActionConfig } from '@/types/settings';

export default function SettingsAppearancePage() {
  const t = useTranslations('settings.appearance');
  const { preferences, updatePreference, isLoading } = useUserPreferences();

  const handleDensityChange = (value: string) => {
    updatePreference('displayDensity', value as DisplayDensity);
  };

  const handleAnimationsChange = (checked: boolean) => {
    updatePreference('reduceAnimations', checked);
  };

  const handleWeightBreakdownChange = (checked: boolean) => {
    updatePreference('showWeightBreakdown', checked);
  };

  const handleStartPageChange = (value: string) => {
    updatePreference('startPage', value as StartPage);
  };

  const handleSwipeActionsChange = (config: SwipeActionConfig) => {
    updatePreference('swipeActions', config);
  };

  return (
    <div className="space-y-6">
      {/* Theme Section */}
      <SettingsSection title={t('theme.title')} description={t('theme.description')}>
        <ThemeToggle />
      </SettingsSection>

      {/* Display Section */}
      <SettingsSection title={t('display.title')} description={t('display.description')}>
        {/* Display Density */}
        <div className="space-y-3">
          <Label>{t('display.density.label')}</Label>
          <RadioGroup
            value={preferences.displayDensity}
            onValueChange={handleDensityChange}
            className="flex gap-4"
            disabled={isLoading}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="comfortable" id="comfortable" />
              <Label htmlFor="comfortable" className="font-normal cursor-pointer">
                {t('display.density.comfortable')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="compact" id="compact" />
              <Label htmlFor="compact" className="font-normal cursor-pointer">
                {t('display.density.compact')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Reduce Animations */}
        <SettingItem
          label={t('display.reduceAnimations.label')}
          description={t('display.reduceAnimations.description')}
          disabled={isLoading}
        >
          <Switch
            checked={preferences.reduceAnimations}
            onCheckedChange={handleAnimationsChange}
            disabled={isLoading}
          />
        </SettingItem>

        {/* Show Weight Breakdown */}
        <SettingItem
          label={t('display.weightBreakdown.label')}
          description={t('display.weightBreakdown.description')}
          disabled={isLoading}
        >
          <Switch
            checked={preferences.showWeightBreakdown}
            onCheckedChange={handleWeightBreakdownChange}
            disabled={isLoading}
          />
        </SettingItem>
      </SettingsSection>

      {/* Swipe Actions Section */}
      <SettingsSection
        title={t('swipeActions.title')}
        description={t('swipeActions.description')}
      >
        <SwipeActionSelector
          config={preferences.swipeActions}
          onConfigChange={handleSwipeActionsChange}
          disabled={isLoading}
        />
      </SettingsSection>

      {/* Navigation Section - Community Section Restructure */}
      <SettingsSection title={t('navigation.title')} description={t('navigation.description')}>
        {/* Start Page */}
        <div className="space-y-3">
          <Label>{t('navigation.startPage.label')}</Label>
          <p className="text-sm text-muted-foreground">{t('navigation.startPage.description')}</p>
          <RadioGroup
            value={preferences.startPage}
            onValueChange={handleStartPageChange}
            className="flex flex-col gap-3"
            disabled={isLoading}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="inventory" id="start-inventory" />
              <Label htmlFor="start-inventory" className="font-normal cursor-pointer">
                {t('navigation.startPage.inventory')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="loadouts" id="start-loadouts" />
              <Label htmlFor="start-loadouts" className="font-normal cursor-pointer">
                {t('navigation.startPage.loadouts')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="community" id="start-community" />
              <Label htmlFor="start-community" className="font-normal cursor-pointer">
                {t('navigation.startPage.community')}
              </Label>
            </div>
          </RadioGroup>
        </div>
      </SettingsSection>
    </div>
  );
}
