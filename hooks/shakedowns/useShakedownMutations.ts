'use client';

/**
 * useShakedownMutations Hook
 *
 * Feature: 001-community-shakedowns
 * Provides mutation functions for shakedowns with optimistic update helpers.
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { generateShareToken } from '@/lib/shakedown-utils';
import type {
  Shakedown,
  ShakedownWithAuthor,
  CreateShakedownInput,
  UpdateShakedownInput,
  ShakedownPrivacy,
} from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface MutationState {
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isCompleting: boolean;
  isReopening: boolean;
  error: string | null;
}

type MutationResult<T> = { data: T; error: null } | { data: null; error: string };

interface ShakedownRow {
  id: string;
  owner_id: string;
  loadout_id: string;
  trip_name: string;
  trip_start_date: string;
  trip_end_date: string;
  experience_level: string;
  concerns: string | null;
  privacy: string;
  share_token: string | null;
  status: string;
  feedback_count: number;
  helpful_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
}

export interface UseShakedownMutationsReturn {
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isCompleting: boolean;
  isReopening: boolean;
  error: string | null;
  createShakedown: (input: CreateShakedownInput) => Promise<MutationResult<Shakedown>>;
  updateShakedown: (id: string, input: UpdateShakedownInput) => Promise<MutationResult<Shakedown>>;
  deleteShakedown: (id: string) => Promise<MutationResult<boolean>>;
  completeShakedown: (id: string, helpfulFeedbackIds?: string[]) => Promise<MutationResult<Shakedown>>;
  reopenShakedown: (id: string) => Promise<MutationResult<Shakedown>>;
  clearError: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

function transformDbToShakedown(row: ShakedownRow): Shakedown {
  return {
    id: row.id,
    ownerId: row.owner_id,
    loadoutId: row.loadout_id,
    tripName: row.trip_name,
    tripStartDate: row.trip_start_date,
    tripEndDate: row.trip_end_date,
    experienceLevel: row.experience_level as Shakedown['experienceLevel'],
    concerns: row.concerns,
    privacy: row.privacy as ShakedownPrivacy,
    shareToken: row.share_token,
    status: row.status as Shakedown['status'],
    feedbackCount: row.feedback_count,
    helpfulCount: row.helpful_count,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
  };
}

function getErrorMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  return createClient();
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useShakedownMutations(): UseShakedownMutationsReturn {
  const { user } = useAuthContext();
  const [state, setState] = useState<MutationState>({
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isCompleting: false,
    isReopening: false,
    error: null,
  });

  const setLoading = (key: keyof Omit<MutationState, 'error'>, value: boolean) => {
    setState((prev) => ({ ...prev, [key]: value, error: value ? null : prev.error }));
  };

  const setError = (key: keyof Omit<MutationState, 'error'>, error: string) => {
    setState((prev) => ({ ...prev, [key]: false, error }));
  };

  const createShakedown = useCallback(async (input: CreateShakedownInput): Promise<MutationResult<Shakedown>> => {
    const userId = user?.uid;
    if (!userId) return { data: null, error: 'Must be logged in to create a shakedown' };

    setLoading('isCreating', true);
    try {
      const privacy = input.privacy ?? 'public';
      const { data, error } = await getSupabase()
        .from('shakedowns')
        .insert({
          owner_id: userId,
          loadout_id: input.loadoutId,
          trip_name: input.tripName,
          trip_start_date: input.tripStartDate,
          trip_end_date: input.tripEndDate,
          experience_level: input.experienceLevel,
          concerns: input.concerns ?? null,
          privacy,
          share_token: privacy === 'public' ? generateShareToken() : null,
          status: 'open',
          feedback_count: 0,
          helpful_count: 0,
          is_hidden: false,
        })
        .select()
        .single();

      if (error) { setError('isCreating', error.message); return { data: null, error: error.message }; }
      setState((prev) => ({ ...prev, isCreating: false }));
      return { data: transformDbToShakedown(data as ShakedownRow), error: null };
    } catch (err) {
      const msg = getErrorMsg(err, 'Failed to create shakedown');
      setError('isCreating', msg);
      return { data: null, error: msg };
    }
  }, [user]);

  const updateShakedown = useCallback(async (id: string, input: UpdateShakedownInput): Promise<MutationResult<Shakedown>> => {
    const userId = user?.uid;
    if (!userId) return { data: null, error: 'Must be logged in to update a shakedown' };

    setLoading('isUpdating', true);
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.tripName !== undefined) updateData.trip_name = input.tripName;
      if (input.tripStartDate !== undefined) updateData.trip_start_date = input.tripStartDate;
      if (input.tripEndDate !== undefined) updateData.trip_end_date = input.tripEndDate;
      if (input.experienceLevel !== undefined) updateData.experience_level = input.experienceLevel;
      if (input.concerns !== undefined) updateData.concerns = input.concerns;
      if (input.privacy !== undefined) {
        updateData.privacy = input.privacy;
        updateData.share_token = input.privacy === 'public' ? generateShareToken() : null;
      }

      const { data, error } = await getSupabase()
        .from('shakedowns')
        .update(updateData)
        .eq('id', id)
        .eq('owner_id', userId)
        .select()
        .single();

      if (error) { setError('isUpdating', error.message); return { data: null, error: error.message }; }
      if (!data) { setError('isUpdating', 'Shakedown not found or no permission'); return { data: null, error: 'Shakedown not found or no permission' }; }
      setState((prev) => ({ ...prev, isUpdating: false }));
      return { data: transformDbToShakedown(data as ShakedownRow), error: null };
    } catch (err) {
      const msg = getErrorMsg(err, 'Failed to update shakedown');
      setError('isUpdating', msg);
      return { data: null, error: msg };
    }
  }, [user]);

  const deleteShakedown = useCallback(async (id: string): Promise<MutationResult<boolean>> => {
    const userId = user?.uid;
    if (!userId) return { data: null, error: 'Must be logged in to delete a shakedown' };

    setLoading('isDeleting', true);
    try {
      const { error } = await getSupabase()
        .from('shakedowns')
        .update({ is_hidden: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', userId);

      if (error) { setError('isDeleting', error.message); return { data: null, error: error.message }; }
      setState((prev) => ({ ...prev, isDeleting: false }));
      return { data: true, error: null };
    } catch (err) {
      const msg = getErrorMsg(err, 'Failed to delete shakedown');
      setError('isDeleting', msg);
      return { data: null, error: msg };
    }
  }, [user]);

  const completeShakedown = useCallback(async (id: string, helpfulFeedbackIds?: string[]): Promise<MutationResult<Shakedown>> => {
    const userId = user?.uid;
    if (!userId) return { data: null, error: 'Must be logged in to complete a shakedown' };

    setLoading('isCompleting', true);
    try {
      const now = new Date().toISOString();
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('shakedowns')
        .update({ status: 'completed', completed_at: now, updated_at: now })
        .eq('id', id)
        .eq('owner_id', userId)
        .neq('status', 'archived')
        .select()
        .single();

      if (error) { setError('isCompleting', error.message); return { data: null, error: error.message }; }
      if (!data) { setError('isCompleting', 'Shakedown not found or archived'); return { data: null, error: 'Shakedown not found or archived' }; }

      if (helpfulFeedbackIds?.length) {
        // Run feedback and count updates in parallel for better performance
        await Promise.all([
          supabase.from('shakedown_feedback').update({ is_helpful: true, updated_at: now }).in('id', helpfulFeedbackIds).eq('shakedown_id', id),
          supabase.from('shakedowns').update({ helpful_count: helpfulFeedbackIds.length }).eq('id', id),
        ]);
      }

      setState((prev) => ({ ...prev, isCompleting: false }));
      return { data: transformDbToShakedown(data as ShakedownRow), error: null };
    } catch (err) {
      const msg = getErrorMsg(err, 'Failed to complete shakedown');
      setError('isCompleting', msg);
      return { data: null, error: msg };
    }
  }, [user]);

  const reopenShakedown = useCallback(async (id: string): Promise<MutationResult<Shakedown>> => {
    const userId = user?.uid;
    if (!userId) return { data: null, error: 'Must be logged in to reopen a shakedown' };

    setLoading('isReopening', true);
    try {
      const now = new Date().toISOString();
      const supabase = getSupabase();

      const { data: current } = await supabase.from('shakedowns').select('status').eq('id', id).eq('owner_id', userId).single();
      if (current?.status === 'archived') { setError('isReopening', 'Archived shakedowns cannot be reopened'); return { data: null, error: 'Archived shakedowns cannot be reopened' }; }
      if (current?.status === 'open') { setError('isReopening', 'Shakedown is already open'); return { data: null, error: 'Shakedown is already open' }; }

      const { data, error } = await supabase
        .from('shakedowns')
        .update({ status: 'open', completed_at: null, updated_at: now })
        .eq('id', id)
        .eq('owner_id', userId)
        .eq('status', 'completed')
        .select()
        .single();

      if (error) { setError('isReopening', error.message); return { data: null, error: error.message }; }
      if (!data) { setError('isReopening', 'Shakedown not found or cannot be reopened'); return { data: null, error: 'Shakedown not found or cannot be reopened' }; }

      setState((prev) => ({ ...prev, isReopening: false }));
      return { data: transformDbToShakedown(data as ShakedownRow), error: null };
    } catch (err) {
      const msg = getErrorMsg(err, 'Failed to reopen shakedown');
      setError('isReopening', msg);
      return { data: null, error: msg };
    }
  }, [user]);

  const clearError = useCallback(() => setState((prev) => ({ ...prev, error: null })), []);

  return {
    isCreating: state.isCreating,
    isUpdating: state.isUpdating,
    isDeleting: state.isDeleting,
    isCompleting: state.isCompleting,
    isReopening: state.isReopening,
    error: state.error,
    createShakedown,
    updateShakedown,
    deleteShakedown,
    completeShakedown,
    reopenShakedown,
    clearError,
  };
}

// =============================================================================
// Optimistic Update Helpers
// =============================================================================

export function createOptimisticShakedown(
  input: CreateShakedownInput,
  userId: string,
  userName: string,
  userAvatar: string | null,
  loadoutName: string,
  totalWeightGrams: number,
  itemCount: number
): ShakedownWithAuthor {
  const now = new Date().toISOString();
  const privacy = input.privacy ?? 'public';
  return {
    id: `temp-${Date.now()}`,
    ownerId: userId,
    loadoutId: input.loadoutId,
    tripName: input.tripName,
    tripStartDate: input.tripStartDate,
    tripEndDate: input.tripEndDate,
    experienceLevel: input.experienceLevel,
    concerns: input.concerns ?? null,
    privacy,
    shareToken: privacy === 'public' ? 'pending' : null,
    status: 'open',
    feedbackCount: 0,
    helpfulCount: 0,
    isHidden: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
    authorName: userName,
    authorAvatar: userAvatar,
    loadoutName,
    totalWeightGrams,
    itemCount,
  };
}

export function replaceOptimisticShakedown(
  shakedowns: ShakedownWithAuthor[],
  tempId: string,
  realShakedown: ShakedownWithAuthor
): ShakedownWithAuthor[] {
  return shakedowns.map((s) => (s.id === tempId ? realShakedown : s));
}

export function removeOptimisticShakedown(
  shakedowns: ShakedownWithAuthor[],
  tempId: string
): ShakedownWithAuthor[] {
  return shakedowns.filter((s) => s.id !== tempId);
}

export default useShakedownMutations;
