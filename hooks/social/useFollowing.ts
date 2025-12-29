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
import { useAuth } from '@/hooks/useAuth';
import {
  fetchFollowing,
  followUser,
  unfollowUser,
  isFollowingUser,
} from '@/lib/supabase/social-queries';
import type { UseFollowingReturn, FollowInfo } from '@/types/social';

export function useFollowing(): UseFollowingReturn {
  const { user } = useAuth();
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
    if (!user?.id) {
      setFollowing([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFollowing(user.id);
      setFollowing(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load following list';
      setError(message);
      console.error('Error loading following:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Follows a user.
   * @param userId - The ID of the user to follow
   */
  const follow = useCallback(
    async (userId: string) => {
      if (!user?.id) {
        throw new Error('Must be logged in to follow users');
      }

      if (userId === user.id) {
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
        await followUser(user.id, userId);
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
    [user?.id, loadFollowing]
  );

  /**
   * Unfollows a user.
   * @param userId - The ID of the user to unfollow
   */
  const unfollow = useCallback(
    async (userId: string) => {
      if (!user?.id) {
        throw new Error('Must be logged in to unfollow users');
      }

      // Store for rollback
      const previousFollowing = [...following];

      // Optimistic update
      setFollowing((prev) => prev.filter((f) => f.id !== userId));

      try {
        await unfollowUser(user.id, userId);
      } catch (err) {
        // Rollback on error
        setFollowing(previousFollowing);
        const message = err instanceof Error ? err.message : 'Failed to unfollow user';
        setError(message);
        throw err;
      }
    },
    [user?.id, following]
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

  // Initial load
  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

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
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkFollowing = useCallback(async () => {
    if (!user?.id || !targetUserId) {
      setIsFollowing(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await isFollowingUser(user.id, targetUserId);
      setIsFollowing(result);
    } catch (err) {
      console.error('Error checking follow status:', err);
      setIsFollowing(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, targetUserId]);

  const toggle = useCallback(async () => {
    if (!user?.id || !targetUserId) {
      throw new Error('Must be logged in to follow/unfollow');
    }

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await unfollowUser(user.id, targetUserId);
      } else {
        await followUser(user.id, targetUserId);
      }
    } catch (err) {
      // Rollback on error
      setIsFollowing(wasFollowing);
      throw err;
    }
  }, [user?.id, targetUserId, isFollowing]);

  useEffect(() => {
    checkFollowing();
  }, [checkFollowing]);

  return { isFollowing, isLoading, toggle };
}

export default useFollowing;
