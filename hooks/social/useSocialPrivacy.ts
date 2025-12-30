/**
 * useSocialPrivacy Hook
 *
 * Feature: 001-social-graph
 * Task: T048
 *
 * Manages social privacy settings:
 * - Privacy presets (Only Me, Friends Only, Everyone)
 * - Granular per-category controls
 * - Immediate effect on change (no save button)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import {
  fetchSocialPrivacySettings,
  updateSocialPrivacySettings,
  applyPrivacyPreset,
} from '@/lib/supabase/social-queries';
import type { UseSocialPrivacyReturn, SocialPrivacySettings, PrivacyPreset } from '@/types/social';

export function useSocialPrivacy(): UseSocialPrivacyReturn {
  const { user } = useAuthContext();
  const [settings, setSettings] = useState<SocialPrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads privacy settings.
   */
  const loadSettings = useCallback(async () => {
    if (!user?.uid) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSocialPrivacySettings(user.uid);
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load privacy settings';
      setError(message);
      console.error('Error loading privacy settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  /**
   * Updates specific privacy settings.
   * Immediate effect - updates are applied right away.
   */
  const updateSettings = useCallback(
    async (updates: Partial<SocialPrivacySettings>): Promise<void> => {
      if (!user?.uid || !settings) return;

      // Optimistic update
      const previousSettings = { ...settings };
      setSettings((prev) => (prev ? { ...prev, ...updates } : null));

      // If updating granular settings, switch preset to custom
      if (updates.messaging_privacy || updates.online_status_privacy || updates.activity_feed_privacy) {
        updates.privacy_preset = 'custom';
      }

      try {
        await updateSocialPrivacySettings(user.uid, updates);
      } catch (err) {
        // Rollback on error
        setSettings(previousSettings);
        const message = err instanceof Error ? err.message : 'Failed to update privacy settings';
        setError(message);
        throw err;
      }
    },
    [user?.uid, settings]
  );

  /**
   * Applies a privacy preset (Only Me, Friends Only, Everyone).
   * This updates multiple settings at once.
   */
  const setPreset = useCallback(
    async (preset: Exclude<PrivacyPreset, 'custom'>): Promise<void> => {
      if (!user?.uid) return;

      // Optimistic update with preset values
      const presetSettings: Record<Exclude<PrivacyPreset, 'custom'>, SocialPrivacySettings> = {
        only_me: {
          privacy_preset: 'only_me',
          messaging_privacy: 'nobody',
          online_status_privacy: 'nobody',
          activity_feed_privacy: 'nobody',
          discoverable: false,
        },
        friends_only: {
          privacy_preset: 'friends_only',
          messaging_privacy: 'friends_only',
          online_status_privacy: 'friends_only',
          activity_feed_privacy: 'friends_only',
          discoverable: true,
        },
        everyone: {
          privacy_preset: 'everyone',
          messaging_privacy: 'everyone',
          online_status_privacy: 'everyone',
          activity_feed_privacy: 'friends_only',
          discoverable: true,
        },
      };

      const previousSettings = settings ? { ...settings } : null;
      setSettings(presetSettings[preset]);

      try {
        await applyPrivacyPreset(user.uid, preset);
      } catch (err) {
        // Rollback on error
        setSettings(previousSettings);
        const message = err instanceof Error ? err.message : 'Failed to apply privacy preset';
        setError(message);
        throw err;
      }
    },
    [user?.uid, settings]
  );

  // Initial load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    applyPreset: setPreset,
  };
}

// =============================================================================
// PRESET HELPERS
// =============================================================================

/**
 * Gets display info for a privacy preset.
 */
export function getPresetInfo(preset: PrivacyPreset): {
  label: string;
  description: string;
  icon: string;
} {
  switch (preset) {
    case 'only_me':
      return {
        label: 'Only Me',
        description: 'Maximum privacy - hide everything from others',
        icon: 'Lock',
      };
    case 'friends_only':
      return {
        label: 'Friends Only',
        description: 'Only friends can see your activity and contact you',
        icon: 'Users',
      };
    case 'everyone':
      return {
        label: 'Everyone',
        description: 'Be discoverable and visible to all users',
        icon: 'Globe',
      };
    case 'custom':
      return {
        label: 'Custom',
        description: 'You have customized individual privacy settings',
        icon: 'Settings',
      };
    default:
      return {
        label: 'Unknown',
        description: '',
        icon: 'HelpCircle',
      };
  }
}

export default useSocialPrivacy;
