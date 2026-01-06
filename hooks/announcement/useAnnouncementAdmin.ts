/**
 * Announcement Admin Hook
 *
 * Feature: Community Hub Enhancement
 *
 * Admin CRUD operations for community announcements.
 * Similar to banner admin but for dismissible announcements.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  CommunityAnnouncement,
  CommunityAnnouncementWithStatus,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@/types/community';
import { computeAnnouncementStatus } from '@/types/community';

// ============================================================================
// Types
// ============================================================================

type LoadingState = 'idle' | 'loading' | 'submitting' | 'deleting' | 'error';

interface UseAnnouncementAdminReturn {
  announcements: CommunityAnnouncementWithStatus[];
  loadingState: LoadingState;
  error: string | null;

  // Actions
  loadAnnouncements: () => Promise<void>;
  createNewAnnouncement: (
    input: CreateAnnouncementInput
  ) => Promise<CommunityAnnouncement>;
  updateExistingAnnouncement: (
    id: string,
    input: UpdateAnnouncementInput
  ) => Promise<CommunityAnnouncement>;
  deleteExistingAnnouncement: (id: string) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAnnouncementAdmin(): UseAnnouncementAdminReturn {
  const supabase = useMemo(() => createClient(), []);

  const [announcements, setAnnouncements] = useState<
    CommunityAnnouncementWithStatus[]
  >([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [error, setError] = useState<string | null>(null);

  /**
   * Transform announcements to include computed status
   */
  const transformWithStatus = useCallback(
    (
      rawAnnouncements: CommunityAnnouncement[]
    ): CommunityAnnouncementWithStatus[] => {
      return rawAnnouncements.map((announcement) => ({
        ...announcement,
        status: computeAnnouncementStatus(announcement),
      }));
    },
    []
  );

  /**
   * Load all announcements for admin (includes inactive/expired)
   */
  const loadAnnouncements = useCallback(async () => {
    setLoadingState('loading');
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('community_announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAnnouncements(
        transformWithStatus(data as CommunityAnnouncement[])
      );
      setLoadingState('idle');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load announcements';
      setError(message);
      setLoadingState('error');
    }
  }, [supabase, transformWithStatus]);

  /**
   * Create a new announcement
   */
  const createNewAnnouncement = useCallback(
    async (input: CreateAnnouncementInput): Promise<CommunityAnnouncement> => {
      setLoadingState('submitting');
      setError(null);

      try {
        const { data, error: insertError } = await supabase
          .from('community_announcements')
          .insert({
            title: input.title,
            message: input.message,
            type: input.type,
            priority: input.priority,
            link_url: input.link_url,
            link_text: input.link_text,
            starts_at: input.starts_at,
            ends_at: input.ends_at,
            is_active: input.is_active,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const newAnnouncement = data as CommunityAnnouncement;

        // Add to local state with status
        setAnnouncements((prev) => [
          ...transformWithStatus([newAnnouncement]),
          ...prev,
        ]);

        setLoadingState('idle');
        return newAnnouncement;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create announcement';
        setError(message);
        setLoadingState('error');
        throw err;
      }
    },
    [supabase, transformWithStatus]
  );

  /**
   * Update an existing announcement
   */
  const updateExistingAnnouncement = useCallback(
    async (
      id: string,
      input: UpdateAnnouncementInput
    ): Promise<CommunityAnnouncement> => {
      setLoadingState('submitting');
      setError(null);

      try {
        const { data, error: updateError } = await supabase
          .from('community_announcements')
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        const updatedAnnouncement = data as CommunityAnnouncement;

        // Update local state
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...updatedAnnouncement,
                  status: computeAnnouncementStatus(updatedAnnouncement),
                }
              : a
          )
        );

        setLoadingState('idle');
        return updatedAnnouncement;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update announcement';
        setError(message);
        setLoadingState('error');
        throw err;
      }
    },
    [supabase]
  );

  /**
   * Delete an announcement
   */
  const deleteExistingAnnouncement = useCallback(
    async (id: string): Promise<void> => {
      setLoadingState('deleting');
      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from('community_announcements')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        // Remove from local state
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));

        setLoadingState('idle');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete announcement';
        setError(message);
        setLoadingState('error');
        throw err;
      }
    },
    [supabase]
  );

  // Load announcements on mount
  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return {
    announcements,
    loadingState,
    error,
    loadAnnouncements,
    createNewAnnouncement,
    updateExistingAnnouncement,
    deleteExistingAnnouncement,
  };
}
