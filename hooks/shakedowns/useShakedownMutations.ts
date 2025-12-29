'use client';

/**
 * useShakedownMutations Hook
 *
 * Feature: 001-community-shakedowns
 * Tasks: T017, T050
 *
 * Provides mutation functions for shakedowns:
 * - createShakedown: Create a new shakedown request
 * - updateShakedown: Update an existing shakedown
 * - deleteShakedown: Soft-delete a shakedown (marks as hidden)
 * - completeShakedown: Mark a shakedown as completed, optionally batch-marking feedback as helpful
 * - reopenShakedown: Reopen a completed shakedown to accept new feedback
 *
 * Follows the callback-based pattern from bulletin mutations
 * with optimistic update helpers for UI responsiveness.
 *
 * NOTE: The 'shakedowns' table types will be available after the DB migration
 * is applied and types are regenerated with `npx supabase gen types typescript`.
 * Until then, we use type assertions to work around the missing types.
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

interface CreateResult {
  shakedown: Shakedown | null;
  error: string | null;
}

interface UpdateResult {
  shakedown: Shakedown | null;
  error: string | null;
}

interface DeleteResult {
  success: boolean;
  error: string | null;
}

interface CompleteResult {
  shakedown: Shakedown | null;
  error: string | null;
}

interface ReopenResult {
  shakedown: Shakedown | null;
  error: string | null;
}

export interface UseShakedownMutationsReturn {
  // State
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isCompleting: boolean;
  isReopening: boolean;
  error: string | null;

  // Mutations
  createShakedown: (input: CreateShakedownInput) => Promise<CreateResult>;
  updateShakedown: (id: string, input: UpdateShakedownInput) => Promise<UpdateResult>;
  deleteShakedown: (id: string) => Promise<DeleteResult>;
  completeShakedown: (id: string, helpfulFeedbackIds?: string[]) => Promise<CompleteResult>;
  reopenShakedown: (id: string) => Promise<ReopenResult>;

  // Helpers
  clearError: () => void;
}

// =============================================================================
// Database row type (snake_case)
// =============================================================================

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

// =============================================================================
// Transform helper
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

// =============================================================================
// Hook Implementation
// =============================================================================

export function useShakedownMutations(): UseShakedownMutationsReturn {
  const { user } = useAuthContext();
  const supabase = createClient();

  const [state, setState] = useState<MutationState>({
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isCompleting: false,
    isReopening: false,
    error: null,
  });

  /**
   * Creates a new shakedown request
   * Generates a share token for public shakedowns
   */
  const createShakedown = useCallback(
    async (input: CreateShakedownInput): Promise<CreateResult> => {
      const userId = user?.uid;
      if (!userId) {
        return { shakedown: null, error: 'Must be logged in to create a shakedown' };
      }

      setState((prev) => ({ ...prev, isCreating: true, error: null }));

      try {
        // Determine privacy and generate share token if public
        const privacy = input.privacy ?? 'public';
        const shareToken = privacy === 'public' ? generateShareToken() : null;

        const insertData = {
          owner_id: userId,
          loadout_id: input.loadoutId,
          trip_name: input.tripName,
          trip_start_date: input.tripStartDate,
          trip_end_date: input.tripEndDate,
          experience_level: input.experienceLevel,
          concerns: input.concerns ?? null,
          privacy,
          share_token: shareToken,
          status: 'open',
          feedback_count: 0,
          helpful_count: 0,
          is_hidden: false,
        };

        // TODO: Remove type assertions after regenerating Supabase types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: insertError } = await (supabase as any)
          .from('shakedowns')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          const errorMessage = insertError.message || 'Failed to create shakedown';
          setState((prev) => ({ ...prev, isCreating: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        const shakedown = transformDbToShakedown(data as ShakedownRow);
        setState((prev) => ({ ...prev, isCreating: false }));
        return { shakedown, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create shakedown';
        setState((prev) => ({ ...prev, isCreating: false, error: errorMessage }));
        return { shakedown: null, error: errorMessage };
      }
    },
    [user, supabase]
  );

  /**
   * Updates an existing shakedown
   * Only the owner can update their shakedown
   * Generates/clears share token based on privacy change
   */
  const updateShakedown = useCallback(
    async (id: string, input: UpdateShakedownInput): Promise<UpdateResult> => {
      const userId = user?.uid;
      if (!userId) {
        return { shakedown: null, error: 'Must be logged in to update a shakedown' };
      }

      setState((prev) => ({ ...prev, isUpdating: true, error: null }));

      try {
        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};

        if (input.tripName !== undefined) {
          updateData.trip_name = input.tripName;
        }
        if (input.tripStartDate !== undefined) {
          updateData.trip_start_date = input.tripStartDate;
        }
        if (input.tripEndDate !== undefined) {
          updateData.trip_end_date = input.tripEndDate;
        }
        if (input.experienceLevel !== undefined) {
          updateData.experience_level = input.experienceLevel;
        }
        if (input.concerns !== undefined) {
          updateData.concerns = input.concerns;
        }
        if (input.privacy !== undefined) {
          updateData.privacy = input.privacy;
          // Handle share token based on privacy change
          if (input.privacy === 'public') {
            // Generate new token if changing to public
            updateData.share_token = generateShareToken();
          } else {
            // Clear token if changing to non-public
            updateData.share_token = null;
          }
        }

        // Always update the updated_at timestamp
        updateData.updated_at = new Date().toISOString();

        // TODO: Remove type assertions after regenerating Supabase types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: updateError } = await (supabase as any)
          .from('shakedowns')
          .update(updateData)
          .eq('id', id)
          .eq('owner_id', userId) // Ensure only owner can update
          .select()
          .single();

        if (updateError) {
          const errorMessage = updateError.message || 'Failed to update shakedown';
          setState((prev) => ({ ...prev, isUpdating: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        if (!data) {
          const errorMessage = 'Shakedown not found or you do not have permission to update it';
          setState((prev) => ({ ...prev, isUpdating: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        const shakedown = transformDbToShakedown(data as ShakedownRow);
        setState((prev) => ({ ...prev, isUpdating: false }));
        return { shakedown, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update shakedown';
        setState((prev) => ({ ...prev, isUpdating: false, error: errorMessage }));
        return { shakedown: null, error: errorMessage };
      }
    },
    [user, supabase]
  );

  /**
   * Soft-deletes a shakedown by setting is_hidden to true
   * Only the owner can delete their shakedown
   */
  const deleteShakedown = useCallback(
    async (id: string): Promise<DeleteResult> => {
      const userId = user?.uid;
      if (!userId) {
        return { success: false, error: 'Must be logged in to delete a shakedown' };
      }

      setState((prev) => ({ ...prev, isDeleting: true, error: null }));

      try {
        // TODO: Remove type assertions after regenerating Supabase types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deleteError } = await (supabase as any)
          .from('shakedowns')
          .update({
            is_hidden: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('owner_id', userId); // Ensure only owner can delete

        if (deleteError) {
          const errorMessage = deleteError.message || 'Failed to delete shakedown';
          setState((prev) => ({ ...prev, isDeleting: false, error: errorMessage }));
          return { success: false, error: errorMessage };
        }

        setState((prev) => ({ ...prev, isDeleting: false }));
        return { success: true, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete shakedown';
        setState((prev) => ({ ...prev, isDeleting: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },
    [user, supabase]
  );

  /**
   * Completes a shakedown and optionally marks feedback as helpful
   * Only the owner can complete their shakedown
   * Sets status to 'completed' and records completed_at timestamp
   */
  const completeShakedown = useCallback(
    async (id: string, helpfulFeedbackIds?: string[]): Promise<CompleteResult> => {
      const userId = user?.uid;
      if (!userId) {
        return { shakedown: null, error: 'Must be logged in to complete a shakedown' };
      }

      setState((prev) => ({ ...prev, isCompleting: true, error: null }));

      try {
        const now = new Date().toISOString();

        // Update shakedown status to completed
        // TODO: Remove type assertions after regenerating Supabase types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: completeError } = await (supabase as any)
          .from('shakedowns')
          .update({
            status: 'completed',
            completed_at: now,
            updated_at: now,
          })
          .eq('id', id)
          .eq('owner_id', userId) // Ensure only owner can complete
          .neq('status', 'archived') // Cannot complete archived shakedowns
          .select()
          .single();

        if (completeError) {
          const errorMessage = completeError.message || 'Failed to complete shakedown';
          setState((prev) => ({ ...prev, isCompleting: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        if (!data) {
          const errorMessage = 'Shakedown not found, already archived, or you do not have permission';
          setState((prev) => ({ ...prev, isCompleting: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        // Batch mark feedback as helpful if provided
        if (helpfulFeedbackIds && helpfulFeedbackIds.length > 0) {
          // TODO: Remove type assertions after regenerating Supabase types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('shakedown_feedback')
            .update({ is_helpful: true, updated_at: now })
            .in('id', helpfulFeedbackIds)
            .eq('shakedown_id', id);

          // Update helpful_count on the shakedown
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('shakedowns')
            .update({ helpful_count: helpfulFeedbackIds.length })
            .eq('id', id);
        }

        const shakedown = transformDbToShakedown(data as ShakedownRow);
        setState((prev) => ({ ...prev, isCompleting: false }));
        return { shakedown, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to complete shakedown';
        setState((prev) => ({ ...prev, isCompleting: false, error: errorMessage }));
        return { shakedown: null, error: errorMessage };
      }
    },
    [user, supabase]
  );

  /**
   * Reopens a completed shakedown to accept new feedback
   * Only the owner can reopen their shakedown
   * Only allowed for 'completed' status (not 'archived')
   */
  const reopenShakedown = useCallback(
    async (id: string): Promise<ReopenResult> => {
      const userId = user?.uid;
      if (!userId) {
        return { shakedown: null, error: 'Must be logged in to reopen a shakedown' };
      }

      setState((prev) => ({ ...prev, isReopening: true, error: null }));

      try {
        const now = new Date().toISOString();

        // First check current status to provide appropriate error
        // TODO: Remove type assertions after regenerating Supabase types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: current } = await (supabase as any)
          .from('shakedowns')
          .select('status')
          .eq('id', id)
          .eq('owner_id', userId)
          .single();

        if (current?.status === 'archived') {
          const errorMessage = 'Archived shakedowns cannot be reopened';
          setState((prev) => ({ ...prev, isReopening: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        if (current?.status === 'open') {
          const errorMessage = 'Shakedown is already open';
          setState((prev) => ({ ...prev, isReopening: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        // Update shakedown status back to open
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: reopenError } = await (supabase as any)
          .from('shakedowns')
          .update({
            status: 'open',
            completed_at: null, // Clear completion timestamp
            updated_at: now,
          })
          .eq('id', id)
          .eq('owner_id', userId) // Ensure only owner can reopen
          .eq('status', 'completed') // Only reopen completed shakedowns
          .select()
          .single();

        if (reopenError) {
          const errorMessage = reopenError.message || 'Failed to reopen shakedown';
          setState((prev) => ({ ...prev, isReopening: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        if (!data) {
          const errorMessage = 'Shakedown not found or cannot be reopened';
          setState((prev) => ({ ...prev, isReopening: false, error: errorMessage }));
          return { shakedown: null, error: errorMessage };
        }

        const shakedown = transformDbToShakedown(data as ShakedownRow);
        setState((prev) => ({ ...prev, isReopening: false }));
        return { shakedown, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reopen shakedown';
        setState((prev) => ({ ...prev, isReopening: false, error: errorMessage }));
        return { shakedown: null, error: errorMessage };
      }
    },
    [user, supabase]
  );

  /**
   * Clears the current error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    isCreating: state.isCreating,
    isUpdating: state.isUpdating,
    isDeleting: state.isDeleting,
    isCompleting: state.isCompleting,
    isReopening: state.isReopening,
    error: state.error,

    // Mutations
    createShakedown,
    updateShakedown,
    deleteShakedown,
    completeShakedown,
    reopenShakedown,

    // Helpers
    clearError,
  };
}

// =============================================================================
// Optimistic Update Helpers
// =============================================================================

/**
 * Creates an optimistic shakedown for immediate UI updates
 * Use before the actual mutation completes
 */
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
    id: `temp-${Date.now()}`, // Temporary ID until server returns real one
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
    // Author fields
    authorName: userName,
    authorAvatar: userAvatar,
    loadoutName,
    totalWeightGrams,
    itemCount,
  };
}

/**
 * Replaces a temporary optimistic shakedown with the real one from the server
 */
export function replaceOptimisticShakedown(
  shakedowns: ShakedownWithAuthor[],
  tempId: string,
  realShakedown: ShakedownWithAuthor
): ShakedownWithAuthor[] {
  return shakedowns.map((s) => (s.id === tempId ? realShakedown : s));
}

/**
 * Removes an optimistic shakedown after a failed mutation
 */
export function removeOptimisticShakedown(
  shakedowns: ShakedownWithAuthor[],
  tempId: string
): ShakedownWithAuthor[] {
  return shakedowns.filter((s) => s.id !== tempId);
}

export default useShakedownMutations;
