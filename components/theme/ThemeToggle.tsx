'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useThemePreference } from '@/hooks/useThemePreference';
import { useTranslations } from 'next-intl';

// Client-side mount detection using useSyncExternalStore
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}

/**
 * ThemeToggle Component
 *
 * Feature: 004-nature-vibe-polish
 * Provides a radio group for selecting between light, dark, and system theme modes.
 * Shows current theme state with appropriate icon feedback.
 */
export function ThemeToggle() {
  const t = useTranslations('Settings');
  const { theme, setTheme, resolvedTheme } = useThemePreference();
  const mounted = useIsMounted();

  if (!mounted) {
    // Return a placeholder with same dimensions to prevent layout shift
    return (
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="flex flex-col gap-3">
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  const currentTheme = theme || 'system';

  return (
    <div className="space-y-3">
      <RadioGroup
        value={currentTheme}
        onValueChange={setTheme}
        className="flex flex-col gap-3"
      >
        {/* Light Option */}
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="light" id="theme-light" />
          <Label
            htmlFor="theme-light"
            className="flex items-center gap-3 font-normal cursor-pointer flex-1"
          >
            <Sun className="h-5 w-5 text-accent" />
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{t('theme.light')}</div>
              <div className="text-xs text-muted-foreground">
                {t('theme.usingLightTheme')}
              </div>
            </div>
          </Label>
        </div>

        {/* Dark Option */}
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="dark" id="theme-dark" />
          <Label
            htmlFor="theme-dark"
            className="flex items-center gap-3 font-normal cursor-pointer flex-1"
          >
            <Moon className="h-5 w-5 text-primary" />
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{t('theme.dark')}</div>
              <div className="text-xs text-muted-foreground">
                {t('theme.usingDarkTheme')}
              </div>
            </div>
          </Label>
        </div>

        {/* System Option */}
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="system" id="theme-system" />
          <Label
            htmlFor="theme-system"
            className="flex items-center gap-3 font-normal cursor-pointer flex-1"
          >
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{t('theme.system')}</div>
              <div className="text-xs text-muted-foreground">
                {t('theme.usingSystemTheme')}
                {currentTheme === 'system' && resolvedTheme && (
                  <span className="ml-1">
                    ({resolvedTheme === 'dark' ? t('theme.dark') : t('theme.light')})
                  </span>
                )}
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
