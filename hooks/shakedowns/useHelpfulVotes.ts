'use client';

/**
 * useHelpfulVotes Hook
 *
 * Feature: 001-community-shakedowns
 * Task: T042
 *
 * Manages "helpful" voting system for shakedown feedback.
 * Only the shakedown owner can mark feedback as helpful.
 * Helpful votes contribute to reviewer reputation and badges.
 *
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Rollback on error
 * - Toast notifications (with i18n support via callbacks)
 * - Badge award handling when API returns `badgeAwarded`
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

// =============================================================================
// Types
// =============================================================================

interface HelpfulVoteState {
  userVotes: Set<string>;
  isVoting: boolean;
  error: Error | null;
  isLoading: boolean;
}

interface BadgeInfo {
  badgeType: string;
  badgeName: string;
}

interface HelpfulApiResponse {
  success: boolean;
  feedbackId: string;
  helpfulCount?: number;
  badgeAwarded?: BadgeInfo;
  error?: string;
}

interface ToastMessages {
  helpfulAdded?: string;
  helpfulRemoved?: string;
  helpfulFailed?: string;
  badgeEarned?: string;
  notOwner?: string;
  cannotVoteOwnFeedback?: string;
}

export interface UseHelpfulVotesReturn {
  /** Set of feedback IDs that the user has marked as helpful */
  userVotes: Set<string>;
  /** Mark feedback as helpful */
  markAsHelpful: (feedbackId: string) => Promise<void>;
  /** Remove helpful vote from feedback */
  removeHelpful: (feedbackId: string) => Promise<void>;
  /** Toggle helpful status on feedback */
  toggleHelpful: (feedbackId: string) => Promise<void>;
  /** Whether a voting operation is in progress */
  isVoting: boolean;
  /** Error from the last operation */
  error: Error | null;
  /** Check if user has voted on specific feedback */
  hasVoted: (feedbackId: string) => boolean;
  /** Whether initial votes are loading */
  isLoading: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing helpful votes on shakedown feedback
 *
 * @param shakedownId - ID of the shakedown (null to disable)
 * @param options - Optional configuration
 * @param options.shakedownOwnerId - Owner ID of the shakedown (for permission check)
 * @param options.toastMessages - Custom i18n toast messages
 * @param options.onBadgeAwarded - Callback when a badge is awarded
 */
export function useHelpfulVotes(
  shakedownId: string | null,
  options: {
    shakedownOwnerId?: string;
    toastMessages?: ToastMessages;
    onBadgeAwarded?: (badge: BadgeInfo) => void;
  } = {}
): UseHelpfulVotesReturn {
  const { user } = useAuthContext();
  const { shakedownOwnerId, toastMessages, onBadgeAwarded } = options;

  // Track previous votes for optimistic rollback
  const previousVotesRef = useRef<Set<string>>(new Set());

  const [state, setState] = useState<HelpfulVoteState>({
    userVotes: new Set(),
    isVoting: false,
    error: null,
    isLoading: false,
  });

  // =============================================================================
  // Fetch Initial Votes
  // =============================================================================

  useEffect(() => {
    // Skip if no shakedown ID or user
    if (!shakedownId || !user?.uid) {
      setState((prev) => ({ ...prev, userVotes: new Set(), isLoading: false }));
      return;
    }

    // Only fetch votes if user is the shakedown owner
    // (non-owners can't vote anyway, so no need to fetch their votes)
    if (shakedownOwnerId && user.uid !== shakedownOwnerId) {
      setState((prev) => ({ ...prev, userVotes: new Set(), isLoading: false }));
      return;
    }

    const fetchUserVotes = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `/api/shakedowns/helpful?shakedownId=${encodeURIComponent(shakedownId)}`
        );

        if (!response.ok) {
          // Non-critical error - just log and continue with empty votes
          console.warn('[useHelpfulVotes] Failed to fetch user votes:', response.status);
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const data = await response.json();
        const votes = new Set<string>(data.votes || []);

        setState((prev) => ({
          ...prev,
          userVotes: votes,
          isLoading: false,
        }));
        previousVotesRef.current = new Set(votes);
      } catch (err) {
        console.error('[useHelpfulVotes] Error fetching votes:', err);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchUserVotes();
  }, [shakedownId, user?.uid, shakedownOwnerId]);

  // =============================================================================
  // Permission Check
  // =============================================================================

  /**
   * Validates that the current user can vote on feedback
   * Returns error message if not allowed, null if allowed
   */
  const validateVotePermission = useCallback(
    (feedbackAuthorId?: string): string | null => {
      if (!user?.uid) {
        return 'Must be logged in to mark feedback as helpful';
      }

      // Only shakedown owner can mark feedback as helpful
      if (shakedownOwnerId && user.uid !== shakedownOwnerId) {
        return toastMessages?.notOwner || 'Only the shakedown owner can mark feedback as helpful';
      }

      // Cannot mark own feedback as helpful
      if (feedbackAuthorId && feedbackAuthorId === user.uid) {
        return (
          toastMessages?.cannotVoteOwnFeedback || 'You cannot mark your own feedback as helpful'
        );
      }

      return null;
    },
    [user?.uid, shakedownOwnerId, toastMessages]
  );

  // =============================================================================
  // Mark as Helpful
  // =============================================================================

  const markAsHelpful = useCallback(
    async (feedbackId: string, feedbackAuthorId?: string): Promise<void> => {
      // Permission check
      const permissionError = validateVotePermission(feedbackAuthorId);
      if (permissionError) {
        const error = new Error(permissionError);
        setState((prev) => ({ ...prev, error }));
        toast.error(permissionError);
        throw error;
      }

      // Already voted - no-op
      if (state.userVotes.has(feedbackId)) {
        return;
      }

      // Save previous state for rollback
      previousVotesRef.current = new Set(state.userVotes);

      // Optimistic update
      setState((prev) => ({
        ...prev,
        isVoting: true,
        error: null,
        userVotes: new Set(prev.userVotes).add(feedbackId),
      }));

      try {
        const response = await fetch('/api/shakedowns/helpful', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feedbackId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to mark as helpful (${response.status})`
          );
        }

        const data: HelpfulApiResponse = await response.json();

        // Handle badge awarded
        if (data.badgeAwarded) {
          const badgeMessage =
            toastMessages?.badgeEarned?.replace('{badge}', data.badgeAwarded.badgeName) ||
            `Badge earned: ${data.badgeAwarded.badgeName}`;
          toast.success(badgeMessage, { duration: 5000 });
          onBadgeAwarded?.(data.badgeAwarded);
        }

        setState((prev) => ({ ...prev, isVoting: false }));
        toast.success(toastMessages?.helpfulAdded || 'Marked as helpful');
      } catch (err) {
        // Rollback optimistic update
        setState((prev) => ({
          ...prev,
          isVoting: false,
          userVotes: previousVotesRef.current,
          error: err instanceof Error ? err : new Error('Failed to mark as helpful'),
        }));
        toast.error(toastMessages?.helpfulFailed || 'Failed to mark as helpful. Please try again.');
        throw err;
      }
    },
    [state.userVotes, validateVotePermission, toastMessages, onBadgeAwarded]
  );

  // =============================================================================
  // Remove Helpful
  // =============================================================================

  const removeHelpful = useCallback(
    async (feedbackId: string): Promise<void> => {
      // Permission check (less strict - just need to be owner)
      if (!user?.uid) {
        const error = new Error('Must be logged in');
        setState((prev) => ({ ...prev, error }));
        throw error;
      }

      if (shakedownOwnerId && user.uid !== shakedownOwnerId) {
        const error = new Error(
          toastMessages?.notOwner || 'Only the shakedown owner can remove helpful votes'
        );
        setState((prev) => ({ ...prev, error }));
        toast.error(error.message);
        throw error;
      }

      // Not voted - no-op
      if (!state.userVotes.has(feedbackId)) {
        return;
      }

      // Save previous state for rollback
      previousVotesRef.current = new Set(state.userVotes);

      // Optimistic update
      const newVotes = new Set(state.userVotes);
      newVotes.delete(feedbackId);
      setState((prev) => ({
        ...prev,
        isVoting: true,
        error: null,
        userVotes: newVotes,
      }));

      try {
        const response = await fetch('/api/shakedowns/helpful', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feedbackId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to remove helpful vote (${response.status})`
          );
        }

        setState((prev) => ({ ...prev, isVoting: false }));
        toast.success(toastMessages?.helpfulRemoved || 'Helpful mark removed');
      } catch (err) {
        // Rollback optimistic update
        setState((prev) => ({
          ...prev,
          isVoting: false,
          userVotes: previousVotesRef.current,
          error: err instanceof Error ? err : new Error('Failed to remove helpful vote'),
        }));
        toast.error(toastMessages?.helpfulFailed || 'Failed to update. Please try again.');
        throw err;
      }
    },
    [user?.uid, shakedownOwnerId, state.userVotes, toastMessages]
  );

  // =============================================================================
  // Toggle Helpful
  // =============================================================================

  const toggleHelpful = useCallback(
    async (feedbackId: string, feedbackAuthorId?: string): Promise<void> => {
      if (state.userVotes.has(feedbackId)) {
        await removeHelpful(feedbackId);
      } else {
        await markAsHelpful(feedbackId, feedbackAuthorId);
      }
    },
    [state.userVotes, markAsHelpful, removeHelpful]
  );

  // =============================================================================
  // Check if Voted
  // =============================================================================

  const hasVoted = useCallback(
    (feedbackId: string): boolean => {
      return state.userVotes.has(feedbackId);
    },
    [state.userVotes]
  );

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      userVotes: state.userVotes,
      markAsHelpful,
      removeHelpful,
      toggleHelpful,
      isVoting: state.isVoting,
      error: state.error,
      hasVoted,
      isLoading: state.isLoading,
    }),
    [
      state.userVotes,
      state.isVoting,
      state.error,
      state.isLoading,
      markAsHelpful,
      removeHelpful,
      toggleHelpful,
      hasVoted,
    ]
  );
}

export default useHelpfulVotes;
