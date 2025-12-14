/**
 * usePrivacySettings - Privacy Settings Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T039
 *
 * Manages user's messaging privacy preferences.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { MessagingPrivacy } from '@/types/messaging';

export interface PrivacySettings {
  /** Who can message this user */
  messaging_privacy: MessagingPrivacy;
  /** Whether user appears in search results */
  discoverable: boolean;
  /** Who can see online status (enum matching database schema) */
  online_status_privacy: MessagingPrivacy;
  /** Whether to send read receipts */
  read_receipts_enabled: boolean;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  messaging_privacy: 'everyone',
  discoverable: true,
  online_status_privacy: 'everyone',
  read_receipts_enabled: true,
};

interface UsePrivacySettingsReturn {
  /** Current privacy settings */
  settings: PrivacySettings;
  /** Whether settings are loading */
  isLoading: boolean;
  /** Whether settings are being saved */
  isSaving: boolean;
  /** Error message if any */
  error: string | null;
  /** Update a single setting */
  updateSetting: <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => Promise<boolean>;
  /** Update all settings at once */
  updateSettings: (settings: Partial<PrivacySettings>) => Promise<boolean>;
  /** Refresh settings from server */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing user's messaging privacy settings.
 */
export function usePrivacySettings(): UsePrivacySettingsReturn {
  const { user } = useSupabaseAuth();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current settings
  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('messaging_privacy, discoverable, online_status_privacy, read_receipts_enabled')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // If columns don't exist yet, use defaults
        if (fetchError.code === 'PGRST116' || fetchError.message?.includes('column')) {
          setSettings(DEFAULT_SETTINGS);
        } else {
          throw fetchError;
        }
      } else if (data) {
        setSettings({
          messaging_privacy: (data.messaging_privacy as MessagingPrivacy) ?? 'everyone',
          discoverable: data.discoverable ?? true,
          online_status_privacy: (data.online_status_privacy as MessagingPrivacy) ?? 'everyone',
          read_receipts_enabled: data.read_receipts_enabled ?? true,
        });
      }
    } catch (err) {
      console.error('[usePrivacySettings] Failed to fetch settings:', err);
      setError('Failed to load privacy settings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load settings on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update a single setting
  const updateSetting = useCallback(
    async <K extends keyof PrivacySettings>(
      key: K,
      value: PrivacySettings[K]
    ): Promise<boolean> => {
      if (!user?.id) return false;

      // Optimistic update
      const previousSettings = settings;
      setSettings((prev) => ({ ...prev, [key]: value }));

      try {
        setIsSaving(true);
        setError(null);
        const supabase = createClient();

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ [key]: value, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        return true;
      } catch (err) {
        // Revert on error
        setSettings(previousSettings);
        console.error('[usePrivacySettings] Failed to update setting:', err);
        setError('Failed to save setting');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id, settings]
  );

  // Update multiple settings at once
  const updateSettings = useCallback(
    async (newSettings: Partial<PrivacySettings>): Promise<boolean> => {
      if (!user?.id) return false;

      // Optimistic update
      const previousSettings = settings;
      setSettings((prev) => ({ ...prev, ...newSettings }));

      try {
        setIsSaving(true);
        setError(null);
        const supabase = createClient();

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ ...newSettings, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        return true;
      } catch (err) {
        // Revert on error
        setSettings(previousSettings);
        console.error('[usePrivacySettings] Failed to update settings:', err);
        setError('Failed to save settings');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id, settings]
  );

  return {
    settings,
    isLoading,
    isSaving,
    error,
    updateSetting,
    updateSettings,
    refresh,
  };
}
