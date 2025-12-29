'use client';

/**
 * useFeedback Hook
 *
 * Feature: 001-community-shakedowns
 * Task: T025
 *
 * Provides CRUD operations for shakedown feedback:
 * - createFeedback: Create new feedback (general or item-specific)
 * - updateFeedback: Edit feedback (30-min window enforced)
 * - deleteFeedback: Soft-delete feedback
 * - reportFeedback: Report inappropriate feedback
 *
 * Follows the callback-based pattern from useShakedownMutations
 * with toast notifications for user feedback.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { canEditFeedback } from '@/lib/shakedown-utils';
import {
  createFeedbackSchema,
  updateFeedbackSchema,
  reportFeedbackSchema,
} from '@/lib/shakedown-schemas';
import type { FeedbackWithAuthor, CreateFeedbackInput } from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface ReportFeedbackInput {
  reason: 'spam' | 'harassment' | 'off_topic' | 'other';
  details?: string;
}

interface MutationState {
  isSubmitting: boolean;
  error: Error | null;
}

export interface UseFeedbackReturn {
  createFeedback: (input: CreateFeedbackInput) => Promise<FeedbackWithAuthor>;
  createItemFeedback: (
    shakedownId: string,
    gearItemId: string,
    content: string
  ) => Promise<FeedbackWithAuthor>;
  updateFeedback: (feedbackId: string, content: string) => Promise<FeedbackWithAuthor>;
  deleteFeedback: (feedbackId: string) => Promise<void>;
  reportFeedback: (feedbackId: string, input: ReportFeedbackInput) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}

// =============================================================================
// Database Row Type (snake_case)
// =============================================================================

interface FeedbackRow {
  id: string;
  shakedown_id: string;
  author_id: string;
  parent_id: string | null;
  gear_item_id: string | null;
  content: string;
  content_html: string | null;
  depth: 1 | 2 | 3;
  helpful_count: number;
  is_hidden: boolean;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined author fields
  author_name?: string;
  author_avatar?: string | null;
  author_reputation?: number;
  // Joined gear item fields
  gear_item_name?: string | null;
}

// =============================================================================
// Transform Helper
// =============================================================================

function transformDbToFeedback(row: FeedbackRow): FeedbackWithAuthor {
  return {
    id: row.id,
    shakedownId: row.shakedown_id,
    authorId: row.author_id,
    parentId: row.parent_id,
    gearItemId: row.gear_item_id,
    content: row.content,
    contentHtml: row.content_html,
    depth: row.depth,
    helpfulCount: row.helpful_count,
    isHidden: row.is_hidden,
    isEdited: row.is_edited,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Author fields
    authorName: row.author_name ?? 'Unknown',
    authorAvatar: row.author_avatar ?? null,
    authorReputation: row.author_reputation ?? 0,
    // Gear item fields
    gearItemName: row.gear_item_name ?? null,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useFeedback(): UseFeedbackReturn {
  const { user } = useAuthContext();

  const [state, setState] = useState<MutationState>({
    isSubmitting: false,
    error: null,
  });

  /**
   * Creates new feedback on a shakedown
   * Can be general feedback or item-specific
   * Supports replies up to depth 3 (enforced by DB)
   */
  const createFeedback = useCallback(
    async (input: CreateFeedbackInput): Promise<FeedbackWithAuthor> => {
      if (!user?.uid) {
        throw new Error('Must be logged in to submit feedback');
      }

      // Validate input with Zod schema
      const validation = createFeedbackSchema.safeParse(input);
      if (!validation.success) {
        const errorMessage = validation.error.issues[0]?.message ?? 'Invalid input';
        throw new Error(errorMessage);
      }

      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      try {
        const response = await fetch('/api/shakedowns/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shakedownId: input.shakedownId,
            content: input.content,
            parentId: input.parentId ?? null,
            gearItemId: input.gearItemId ?? null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error ?? `Failed to create feedback (${response.status})`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const feedback = transformDbToFeedback(data.feedback as FeedbackRow);

        setState((prev) => ({ ...prev, isSubmitting: false }));
        toast.success('Feedback submitted successfully');
        return feedback;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create feedback');
        setState((prev) => ({ ...prev, isSubmitting: false, error }));
        toast.error(error.message);
        throw error;
      }
    },
    [user]
  );

  /**
   * Convenience function for creating item-specific feedback
   * Wraps createFeedback with required gearItemId
   */
  const createItemFeedback = useCallback(
    async (
      shakedownId: string,
      gearItemId: string,
      content: string
    ): Promise<FeedbackWithAuthor> => {
      return createFeedback({ shakedownId, gearItemId, content });
    },
    [createFeedback]
  );

  /**
   * Updates existing feedback content
   * Enforces 30-minute edit window
   */
  const updateFeedback = useCallback(
    async (feedbackId: string, content: string): Promise<FeedbackWithAuthor> => {
      if (!user?.uid) {
        throw new Error('Must be logged in to edit feedback');
      }

      // Validate content with Zod schema
      const validation = updateFeedbackSchema.safeParse({ content });
      if (!validation.success) {
        const errorMessage = validation.error.issues[0]?.message ?? 'Invalid content';
        throw new Error(errorMessage);
      }

      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      try {
        const response = await fetch(`/api/shakedowns/feedback/${feedbackId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Handle specific error types
          if (response.status === 403 && errorData.code === 'edit_window_expired') {
            throw new Error('Edit window has expired (30 minutes)');
          }

          const errorMessage = errorData.error ?? `Failed to update feedback (${response.status})`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const feedback = transformDbToFeedback(data.feedback as FeedbackRow);

        setState((prev) => ({ ...prev, isSubmitting: false }));
        toast.success('Feedback updated successfully');
        return feedback;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update feedback');
        setState((prev) => ({ ...prev, isSubmitting: false, error }));
        toast.error(error.message);
        throw error;
      }
    },
    [user]
  );

  /**
   * Soft-deletes feedback by setting is_hidden to true
   * Only the author can delete their own feedback
   */
  const deleteFeedback = useCallback(
    async (feedbackId: string): Promise<void> => {
      if (!user?.uid) {
        throw new Error('Must be logged in to delete feedback');
      }

      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      try {
        const response = await fetch(`/api/shakedowns/feedback/${feedbackId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error ?? `Failed to delete feedback (${response.status})`;
          throw new Error(errorMessage);
        }

        setState((prev) => ({ ...prev, isSubmitting: false }));
        toast.success('Feedback deleted');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete feedback');
        setState((prev) => ({ ...prev, isSubmitting: false, error }));
        toast.error(error.message);
        throw error;
      }
    },
    [user]
  );

  /**
   * Reports feedback for moderation
   * Creates a report record for admin review
   */
  const reportFeedback = useCallback(
    async (feedbackId: string, input: ReportFeedbackInput): Promise<void> => {
      if (!user?.uid) {
        throw new Error('Must be logged in to report feedback');
      }

      // Validate input with Zod schema
      const validation = reportFeedbackSchema.safeParse(input);
      if (!validation.success) {
        const errorMessage = validation.error.issues[0]?.message ?? 'Invalid report';
        throw new Error(errorMessage);
      }

      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      try {
        const response = await fetch(`/api/shakedowns/feedback/${feedbackId}/report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: input.reason,
            details: input.details,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Handle duplicate report
          if (response.status === 409) {
            throw new Error('You have already reported this feedback');
          }

          const errorMessage = errorData.error ?? `Failed to report feedback (${response.status})`;
          throw new Error(errorMessage);
        }

        setState((prev) => ({ ...prev, isSubmitting: false }));
        toast.success('Thank you for your report. We will review it shortly.');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to report feedback');
        setState((prev) => ({ ...prev, isSubmitting: false, error }));
        toast.error(error.message);
        throw error;
      }
    },
    [user]
  );

  return {
    createFeedback,
    createItemFeedback,
    updateFeedback,
    deleteFeedback,
    reportFeedback,
    isSubmitting: state.isSubmitting,
    error: state.error,
  };
}

// =============================================================================
// Optimistic Update Helpers
// =============================================================================

/**
 * Creates an optimistic feedback for immediate UI updates
 * Use before the actual mutation completes
 */
export function createOptimisticFeedback(
  input: CreateFeedbackInput,
  userId: string,
  userName: string,
  userAvatar: string | null,
  parentDepth: number = 0,
  gearItemName: string | null = null
): FeedbackWithAuthor {
  const now = new Date().toISOString();
  const depth = Math.min(parentDepth + 1, 3) as 1 | 2 | 3;

  return {
    id: `temp-${Date.now()}`, // Temporary ID until server returns real one
    shakedownId: input.shakedownId,
    authorId: userId,
    parentId: input.parentId ?? null,
    gearItemId: input.gearItemId ?? null,
    content: input.content,
    contentHtml: null,
    depth,
    helpfulCount: 0,
    isHidden: false,
    isEdited: false,
    editedAt: null,
    createdAt: now,
    updatedAt: now,
    // Author fields
    authorName: userName,
    authorAvatar: userAvatar,
    authorReputation: 0, // Will be updated when server returns
    // Gear item fields
    gearItemName,
  };
}

/**
 * Replaces a temporary optimistic feedback with the real one from the server
 */
export function replaceOptimisticFeedback(
  feedbackList: FeedbackWithAuthor[],
  tempId: string,
  realFeedback: FeedbackWithAuthor
): FeedbackWithAuthor[] {
  return feedbackList.map((f) => (f.id === tempId ? realFeedback : f));
}

/**
 * Removes an optimistic feedback after a failed mutation
 */
export function removeOptimisticFeedback(
  feedbackList: FeedbackWithAuthor[],
  tempId: string
): FeedbackWithAuthor[] {
  return feedbackList.filter((f) => f.id !== tempId);
}

/**
 * Checks if feedback can still be edited (within 30-minute window)
 * Re-exported for convenience
 */
export { canEditFeedback };

export default useFeedback;
