'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useThemePreference } from '@/hooks/useThemePreference';

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
 * Provides a toggle switch for switching between light and dark modes.
 * Shows current theme state with appropriate icon feedback.
 */
export function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useThemePreference();
  const mounted = useIsMounted();

  if (!mounted) {
    // Return a placeholder with same dimensions to prevent layout shift
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5" />
          <div className="space-y-0.5">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-6 w-11 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isDarkMode ? (
          <Moon className="h-5 w-5 text-primary" />
        ) : (
          <Sun className="h-5 w-5 text-accent" />
        )}
        <div className="space-y-0.5">
          <Label htmlFor="dark-mode" className="text-sm font-medium">
            Dark Mode
          </Label>
          <p className="text-xs text-muted-foreground">
            {isDarkMode ? 'Using dark theme' : 'Using light theme'}
          </p>
        </div>
      </div>
      <Switch
        id="dark-mode"
        checked={isDarkMode}
        onCheckedChange={toggleTheme}
        aria-label="Toggle dark mode"
      />
    </div>
  );
}
