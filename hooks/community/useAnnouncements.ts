/**
 * useAnnouncements Hook
 *
 * Feature: Community Hub Enhancement
 *
 * Manages community announcements:
 * - Fetches active announcements from Supabase
 * - Tracks dismissed announcements in localStorage
 * - Provides dismiss/undismiss functionality
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import {
  ANNOUNCEMENTS_DISMISSALS_STORAGE_KEY,
  ANNOUNCEMENT_DISMISSAL_TTL_MS,
} from '@/lib/constants/community';
import type {
  CommunityAnnouncement,
  AnnouncementDismissal,
  UseAnnouncementsReturn,
} from '@/types/community';

// In-memory fallback for dismissed announcements when localStorage is unavailable
let inMemoryDismissals: AnnouncementDismissal[] = [];

/**
 * Gets dismissed announcements from localStorage with in-memory fallback
 */
function getDismissals(): AnnouncementDismissal[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(ANNOUNCEMENTS_DISMISSALS_STORAGE_KEY);
    if (!stored) {
      // Return in-memory dismissals if localStorage is empty but memory has data
      return inMemoryDismissals.length > 0 ? inMemoryDismissals : [];
    }

    const dismissals: AnnouncementDismissal[] = JSON.parse(stored);
    const now = Date.now();

    // Filter out expired dismissals
    const filtered = dismissals.filter((d) => now - d.dismissedAt < ANNOUNCEMENT_DISMISSAL_TTL_MS);

    // Sync to in-memory fallback
    inMemoryDismissals = filtered;

    return filtered;
  } catch (error) {
    console.warn('Failed to load announcement dismissals from localStorage, using in-memory fallback:', error);
    // TODO: Consider tracking these warnings in error monitoring service (e.g., Sentry)
    // to identify localStorage quota issues or browser restrictions

    // Return in-memory fallback
    const now = Date.now();
    return inMemoryDismissals.filter((d) => now - d.dismissedAt < ANNOUNCEMENT_DISMISSAL_TTL_MS);
  }
}

/**
 * Saves dismissed announcements to localStorage with in-memory fallback
 */
function saveDismissals(dismissals: AnnouncementDismissal[]): void {
  if (typeof window === 'undefined') return;

  // Always update in-memory fallback
  inMemoryDismissals = dismissals;

  try {
    localStorage.setItem(ANNOUNCEMENTS_DISMISSALS_STORAGE_KEY, JSON.stringify(dismissals));
  } catch (error) {
    console.warn('Failed to save announcement dismissals to localStorage, using in-memory fallback only:', error);
    // TODO: Consider tracking these warnings in error monitoring service (e.g., Sentry)
    // to identify localStorage quota issues or browser restrictions
    // Note: In-memory fallback will persist for the current session only
  }
}

export function useAnnouncements(
  initialAnnouncements?: CommunityAnnouncement[]
): UseAnnouncementsReturn {
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>(
    initialAnnouncements ?? []
  );
  const [isLoading, setIsLoading] = useState(!initialAnnouncements);
  const [error, setError] = useState<string | null>(null);
  const [dismissals, setDismissals] = useState<AnnouncementDismissal[]>(() => getDismissals());

  // Use ref to track if fetch is in progress to prevent race conditions
  const fetchInProgressRef = useRef(false);

  /**
   * Fetches announcements from Supabase
   * Uses proper Supabase types from Database schema
   */
  const fetchAnnouncements = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      return;
    }

    fetchInProgressRef.current = true;
    const supabase = createClient();
    const now = new Date().toISOString();

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('community_announcements')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', now)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .returns<CommunityAnnouncement[]>();

      if (fetchError) throw fetchError;

      setAnnouncements(data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load announcements';
      setError(message);
      console.error('Failed to fetch announcements:', err);
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, []);

  // Fetch announcements on mount if not provided
  useEffect(() => {
    if (!initialAnnouncements) {
      fetchAnnouncements();
    }
  }, [initialAnnouncements, fetchAnnouncements]);

  /**
   * Dismisses an announcement (stores in localStorage)
   */
  const dismissAnnouncement = useCallback(
    (id: string) => {
      // Validate announcement exists
      if (!announcements.some((a) => a.id === id)) {
        console.warn('Attempted to dismiss non-existent announcement:', id);
        return;
      }

      setDismissals((prev) => {
        // Check if already dismissed
        if (prev.some((d) => d.announcementId === id)) {
          return prev;
        }

        const updated = [...prev, { announcementId: id, dismissedAt: Date.now() }];
        saveDismissals(updated);
        return updated;
      });
    },
    [announcements]
  );

  /**
   * Checks if an announcement is dismissed
   */
  const isDismissed = useCallback(
    (id: string): boolean => {
      return dismissals.some((d) => d.announcementId === id);
    },
    [dismissals]
  );

  /**
   * Refreshes announcements
   */
  const refresh = useCallback(async () => {
    await fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Filter out dismissed announcements
  const visibleAnnouncements = useMemo(
    () => announcements.filter((a) => !isDismissed(a.id)),
    [announcements, isDismissed]
  );

  return {
    announcements: visibleAnnouncements,
    isLoading,
    error,
    dismissAnnouncement,
    isDismissed,
    refresh,
  };
}

export default useAnnouncements;
