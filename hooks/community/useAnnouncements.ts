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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  CommunityAnnouncement,
  AnnouncementDismissal,
  UseAnnouncementsReturn,
} from '@/types/community';

const DISMISSALS_STORAGE_KEY = 'gearshack_announcement_dismissals';
const DISMISSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Gets dismissed announcements from localStorage
 */
function getDismissals(): AnnouncementDismissal[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(DISMISSALS_STORAGE_KEY);
    if (!stored) return [];

    const dismissals: AnnouncementDismissal[] = JSON.parse(stored);
    const now = Date.now();

    // Filter out expired dismissals
    return dismissals.filter((d) => now - d.dismissedAt < DISMISSAL_TTL_MS);
  } catch (error) {
    console.warn('Failed to load announcement dismissals from localStorage:', error);
    return [];
  }
}

/**
 * Saves dismissed announcements to localStorage
 */
function saveDismissals(dismissals: AnnouncementDismissal[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DISMISSALS_STORAGE_KEY, JSON.stringify(dismissals));
  } catch (error) {
    console.warn('Failed to save announcement dismissals to localStorage:', error);
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
  const [dismissals, setDismissals] = useState<AnnouncementDismissal[]>([]);

  // Load dismissals from localStorage on mount
  useEffect(() => {
    setDismissals(getDismissals());
  }, []);

  /**
   * Fetches announcements from Supabase
   *
   * Note: Uses type assertion as community_announcements table is new.
   * TODO: Regenerate Supabase types with:
   * npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
   */
  const fetchAnnouncements = useCallback(async () => {
    const supabase = createClient();

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('community_announcements')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAnnouncements((data ?? []) as CommunityAnnouncement[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load announcements';
      setError(message);
      console.error('Failed to fetch announcements:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch announcements on mount if not provided
  useEffect(() => {
    if (!initialAnnouncements) {
      fetchAnnouncements();
    }
  }, [fetchAnnouncements, initialAnnouncements]);

  /**
   * Dismisses an announcement (stores in localStorage)
   */
  const dismissAnnouncement = useCallback((id: string) => {
    setDismissals((prev) => {
      // Check if already dismissed
      if (prev.some((d) => d.announcementId === id)) {
        return prev;
      }

      const updated = [...prev, { announcementId: id, dismissedAt: Date.now() }];
      saveDismissals(updated);
      return updated;
    });
  }, []);

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
