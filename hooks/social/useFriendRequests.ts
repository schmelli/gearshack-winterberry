/**
 * useFriendRequests Hook
 *
 * Feature: 001-social-graph
 * Tasks: T027, T028
 *
 * Manages friend request functionality:
 * - Fetch pending incoming and outgoing requests
 * - Send friend requests (with prerequisite checks)
 * - Accept/decline/cancel requests
 * - Check if can send request (message exchange required)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import {
  fetchFriendRequests,
  sendFriendRequest as sendRequest,
  respondToFriendRequest,
  cancelFriendRequest,
  canSendFriendRequest,
} from '@/lib/supabase/social-queries';
import type {
  UseFriendRequestsReturn,
  FriendRequestWithProfile,
  SendFriendRequestResponse,
  CanSendFriendRequestResponse,
} from '@/types/social';

export function useFriendRequests(): UseFriendRequestsReturn {
  const t = useTranslations('FriendRequests');
  const { user } = useAuthContext();
  const [pendingIncoming, setPendingIncoming] = useState<FriendRequestWithProfile[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<FriendRequestWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request ID ref to prevent stale data from race conditions
  const requestIdRef = useRef(0);

  /**
   * Loads all pending friend requests.
   */
  const loadRequests = useCallback(async () => {
    if (!user?.uid) {
      setPendingIncoming([]);
      setPendingOutgoing([]);
      setIsLoading(false);
      return;
    }

    // Increment request ID to track this specific request
    const currentRequestId = ++requestIdRef.current;

    try {
      setIsLoading(true);
      setError(null);
      const { incoming, outgoing } = await fetchFriendRequests(user.uid);

      // Only update state if this is still the latest request
      if (currentRequestId !== requestIdRef.current) return;

      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch (err) {
      // Only handle error if this is still the latest request
      if (currentRequestId !== requestIdRef.current) return;

      const message = err instanceof Error ? err.message : 'Failed to load friend requests';
      setError(message);
      console.error('Error loading friend requests:', err);
      toast.error(t('loadFailed'));
    } finally {
      // Only update loading state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [user?.uid, t]);

  /**
   * Sends a friend request to another user.
   * Prerequisites:
   * - Must have exchanged messages with the user
   * - Rate limited to 20 requests per 24 hours
   *
   * @param recipientId - The ID of the user to send request to
   * @param message - Optional message to include with the request
   */
  const sendFriendRequest = useCallback(
    async (recipientId: string, message?: string): Promise<SendFriendRequestResponse> => {
      if (!user?.uid) {
        return { success: false, error: 'no_message_exchange' };
      }

      try {
        const response = await sendRequest(recipientId, message);

        if (response.success) {
          // Refresh requests to include the new outgoing request
          await loadRequests();
        }

        return response;
      } catch (err) {
        console.error('Error sending friend request:', err);
        toast.error(t('sendFailed'));
        return { success: false, error: 'request_already_sent' };
      }
    },
    [user?.uid, loadRequests, t]
  );

  /**
   * Accepts a friend request.
   * Creates a friendship and notifies the sender.
   * Uses true optimistic update pattern with rollback on failure.
   *
   * @param requestId - The ID of the friend request to accept
   */
  const acceptRequest = useCallback(
    async (requestId: string): Promise<void> => {
      // Store request for potential rollback (true optimistic pattern)
      let removedRequest: FriendRequestWithProfile | undefined;
      setPendingIncoming((prev) => {
        removedRequest = prev.find((r) => r.id === requestId);
        return prev.filter((r) => r.id !== requestId);
      });

      try {
        const response = await respondToFriendRequest(requestId, true);

        if (!response.success) {
          throw new Error(response.error ?? 'Failed to accept request');
        }
      } catch (err) {
        // Rollback on error
        if (removedRequest) {
          setPendingIncoming((prev) => [...prev, removedRequest!]);
        }
        const message = err instanceof Error ? err.message : 'Failed to accept friend request';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Declines a friend request.
   * Silent action - no notification sent to sender.
   * Uses true optimistic update pattern with rollback on failure.
   *
   * @param requestId - The ID of the friend request to decline
   */
  const declineRequest = useCallback(
    async (requestId: string): Promise<void> => {
      // Store request for potential rollback (true optimistic pattern)
      let removedRequest: FriendRequestWithProfile | undefined;
      setPendingIncoming((prev) => {
        removedRequest = prev.find((r) => r.id === requestId);
        return prev.filter((r) => r.id !== requestId);
      });

      try {
        const response = await respondToFriendRequest(requestId, false);

        if (!response.success) {
          throw new Error(response.error ?? 'Failed to decline request');
        }
      } catch (err) {
        // Rollback on error
        if (removedRequest) {
          setPendingIncoming((prev) => [...prev, removedRequest!]);
        }
        const message = err instanceof Error ? err.message : 'Failed to decline friend request';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Cancels a pending outgoing friend request.
   * Uses true optimistic update pattern with rollback on failure.
   *
   * @param requestId - The ID of the friend request to cancel
   */
  const cancelOutgoingRequest = useCallback(
    async (requestId: string): Promise<void> => {
      if (!user?.uid) return;

      // Store request for potential rollback (true optimistic pattern)
      let removedRequest: FriendRequestWithProfile | undefined;
      setPendingOutgoing((prev) => {
        removedRequest = prev.find((r) => r.id === requestId);
        return prev.filter((r) => r.id !== requestId);
      });

      try {
        await cancelFriendRequest(requestId, user.uid);
      } catch (err) {
        // Rollback on error
        if (removedRequest) {
          setPendingOutgoing((prev) => [...prev, removedRequest!]);
        }
        const message = err instanceof Error ? err.message : 'Failed to cancel friend request';
        setError(message);
        throw err;
      }
    },
    [user?.uid]
  );

  /**
   * Checks if the current user can send a friend request to another user.
   * Used for UI button state (disabled/enabled).
   *
   * T028: Uses has_message_exchange RPC to check prerequisite.
   *
   * @param recipientId - The ID of the potential recipient
   */
  const checkCanSendRequest = useCallback(
    async (recipientId: string): Promise<CanSendFriendRequestResponse> => {
      if (!user?.uid) {
        return { canSend: false, reason: 'no_message_exchange' };
      }

      try {
        return await canSendFriendRequest(recipientId);
      } catch (err) {
        console.error('Error checking friend request eligibility:', err);
        toast.error(t('checkFailed'));
        return { canSend: false, reason: 'blocked' };
      }
    },
    [user?.uid, t]
  );

  /**
   * Refreshes all friend requests.
   */
  const refresh = useCallback(async () => {
    await loadRequests();
  }, [loadRequests]);

  // Initial load
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return {
    pendingIncoming,
    pendingOutgoing,
    isLoading,
    error,
    sendRequest: sendFriendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest: cancelOutgoingRequest,
    canSendRequest: checkCanSendRequest,
    refresh,
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to check friend request status for a specific user.
 * More efficient when you only need to check one user.
 */
export function useFriendRequestStatus(targetUserId: string): {
  status: 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends' | 'loading';
  requestId?: string;
  canSend: boolean;
  isLoading: boolean;
  checkCanSend: () => Promise<void>;
} {
  const { pendingIncoming, pendingOutgoing, isLoading, canSendRequest } = useFriendRequests();
  const [canSendResult, setCanSendResult] = useState<boolean | null>(null);
  const [isCheckingCanSend, setIsCheckingCanSend] = useState(false);
  const lastTargetIdRef = useRef<string>(targetUserId);
  // AbortController ref to cancel pending requests on unmount or target change
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check for existing requests
  const outgoingRequest = pendingOutgoing.find((r) => r.recipient_id === targetUserId);
  const incomingRequest = pendingIncoming.find((r) => r.sender_id === targetUserId);

  // Check if can send - exposed as a method for manual triggering
  // Uses AbortController to properly cancel pending operations
  const checkCanSend = useCallback(async () => {
    // Cancel any previous pending request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsCheckingCanSend(true);
    const currentTargetId = targetUserId;
    try {
      const result = await canSendRequest(currentTargetId);
      // Only update state if not aborted and targetUserId hasn't changed
      if (!signal.aborted && currentTargetId === targetUserId) {
        setCanSendResult(result.canSend);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error checking friend request eligibility:', error);
    } finally {
      // Only clear loading if not aborted and targetUserId hasn't changed
      if (!signal.aborted && currentTargetId === targetUserId) {
        setIsCheckingCanSend(false);
      }
    }
  }, [targetUserId, canSendRequest]);

  // Reset when target changes
  useEffect(() => {
    if (lastTargetIdRef.current !== targetUserId) {
      lastTargetIdRef.current = targetUserId;
      setCanSendResult(null);
      // Abort any pending request when target changes
      abortControllerRef.current?.abort();
    }
  }, [targetUserId]);

  // Auto-check on mount and target change
  useEffect(() => {
    if (!isLoading && !outgoingRequest && !incomingRequest && canSendResult === null) {
      checkCanSend();
    }
    // Cleanup: abort pending operations when component unmounts
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [isLoading, outgoingRequest, incomingRequest, canSendResult, checkCanSend]);

  let status: 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends' | 'loading' = 'none';

  if (isLoading) {
    status = 'loading';
  } else if (outgoingRequest) {
    status = 'pending_outgoing';
  } else if (incomingRequest) {
    status = 'pending_incoming';
  }

  return {
    status,
    requestId: outgoingRequest?.id ?? incomingRequest?.id,
    canSend: status === 'none' && canSendResult === true,
    isLoading: isLoading || isCheckingCanSend,
    checkCanSend,
  };
}

/**
 * Hook to get count of pending incoming friend requests.
 * Useful for notification badges.
 */
export function usePendingRequestCount(): number {
  const { pendingIncoming } = useFriendRequests();
  return pendingIncoming.length;
}

export default useFriendRequests;
