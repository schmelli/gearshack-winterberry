// @ts-nocheck - Price tracking feature requires migrations to be applied
/**
 * Custom hook for alert preferences management
 * Feature: 050-price-tracking (US6)
 * Date: 2025-12-17
 */

'use client';

import { useState, useEffect } from 'react';
import type { AlertPreferences } from '@/types/price-tracking';

interface UseAlertPreferencesResult {
  preferences: AlertPreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreferences: (updates: Partial<AlertPreferences>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAlertPreferences(): UseAlertPreferencesResult {
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/alerts/preferences');

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<AlertPreferences>) => {
    try {
      setError(null);

      const response = await fetch('/api/alerts/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    refresh: loadPreferences,
  };
}
