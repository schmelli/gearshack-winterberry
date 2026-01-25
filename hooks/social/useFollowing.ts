/**
 * useFollowing Hook
 *
 * Feature: 001-social-graph
 * Task: T020
 *
 * Manages following functionality:
 * - Fetch users the current user is following
 * - Follow/unfollow users with one click
 * - Check if following a specific user
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import {
  fetchFollowing,
  followUser,
  unfollowUser,
  isFollowingUser,
} from '@/lib/supabase/social-queries';
import type { UseFollowingReturn, FollowInfo } from '@/types/social';

export function useFollowing(): UseFollowingReturn {
  const { user } = useAuthContext();
  const [following, setFollowing] = useState<FollowInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a Set for O(1) lookup of followed user IDs
  const followingIds = useMemo(
    () => new Set(following.map((f) => f.id)),
    [following]
  );

  /**
   * Fetches the list of users the current user is following.
   */
  const loadFollowing = useCallback(async () => {
    if (!user?.uid) {
      setFollowing([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFollowing(user.uid);
      setFollowing(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load following list';
      setError(message);
      console.error('Error loading following:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  /**
   * Follows a user.
   * @param userId - The ID of the user to follow
   */
  const follow = useCallback(
    async (userId: string) => {
      if (!user?.uid) {
        throw new Error('Must be logged in to follow users');
      }

      if (userId === user.uid) {
        throw new Error('Cannot follow yourself');
      }

      // Optimistic update
      const tempFollow: FollowInfo = {
        id: userId,
        display_name: 'Loading...',
        avatar_url: null,
        following_since: new Date().toISOString(),
      };
      setFollowing((prev) => [tempFollow, ...prev]);

      try {
        await followUser(user.uid, userId);
        // Refresh to get actual profile data
        await loadFollowing();
      } catch (err) {
        // Rollback on error
        setFollowing((prev) => prev.filter((f) => f.id !== userId));
        const message = err instanceof Error ? err.message : 'Failed to follow user';
        setError(message);
        throw err;
      }
    },
    [user?.uid, loadFollowing]
  );

  /**
   * Unfollows a user.
   * @param userId - The ID of the user to unfollow
   */
  const unfollow = useCallback(
    async (userId: string) => {
      if (!user?.uid) {
        throw new Error('Must be logged in to unfollow users');
      }

      // Store for rollback
      const previousFollowing = [...following];

      // Optimistic update
      setFollowing((prev) => prev.filter((f) => f.id !== userId));

      try {
        await unfollowUser(user.uid, userId);
      } catch (err) {
        // Rollback on error
        setFollowing(previousFollowing);
        const message = err instanceof Error ? err.message : 'Failed to unfollow user';
        setError(message);
        throw err;
      }
    },
    [user?.uid, following]
  );

  /**
   * Checks if the current user is following a specific user.
   * Uses local state for O(1) lookup.
   * @param userId - The ID of the user to check
   */
  const isFollowing = useCallback(
    (userId: string): boolean => {
      return followingIds.has(userId);
    },
    [followingIds]
  );

  /**
   * Refreshes the following list.
   */
  const refresh = useCallback(async () => {
    await loadFollowing();
  }, [loadFollowing]);

  // Initial load - depend only on user.uid to prevent infinite loops
  // loadFollowing is stable when user.uid is stable
  useEffect(() => {
    loadFollowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return {
    following,
    isLoading,
    error,
    follow,
    unfollow,
    isFollowing,
    refresh,
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to check if following a specific user.
 * More efficient when you only need to check one user.
 */
export function useIsFollowing(targetUserId: string): {
  isFollowing: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
} {
  const { user } = useAuthContext();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkFollowing = useCallback(async () => {
    if (!user?.uid || !targetUserId) {
      setIsFollowing(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await isFollowingUser(user.uid, targetUserId);
      setIsFollowing(result);
    } catch (err) {
      console.error('Error checking follow status:', err);
      setIsFollowing(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, targetUserId]);

  const toggle = useCallback(async () => {
    if (!user?.uid || !targetUserId) {
      throw new Error('Must be logged in to follow/unfollow');
    }

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await unfollowUser(user.uid, targetUserId);
      } else {
        await followUser(user.uid, targetUserId);
      }
    } catch (err) {
      // Rollback on error
      setIsFollowing(wasFollowing);
      throw err;
    }
  }, [user?.uid, targetUserId, isFollowing]);

  // Depend on actual values, not the callback to prevent infinite loops
  useEffect(() => {
    checkFollowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, targetUserId]);

  return { isFollowing, isLoading, toggle };
}

export default useFollowing;
