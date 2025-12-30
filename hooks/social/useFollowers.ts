/**
 * useFollowers Hook
 *
 * Feature: 001-social-graph
 * Task: T021
 *
 * Manages follower information for VIP accounts:
 * - Get follower count (VIP only)
 * - Fetch follower list (VIP only)
 * - Non-VIP users receive null values
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import {
  fetchFollowers,
  getFollowerCount,
} from '@/lib/supabase/social-queries';
import type { UseFollowersReturn, FollowInfo } from '@/types/social';

export function useFollowers(): UseFollowersReturn {
  const { user } = useAuthContext();
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the follower count (VIP only).
   */
  const loadFollowerCount = useCallback(async () => {
    if (!user?.uid) {
      setFollowerCount(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const count = await getFollowerCount(user.uid);
      setFollowerCount(count);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load follower count';
      setError(message);
      console.error('Error loading follower count:', err);
      setFollowerCount(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  /**
   * Refreshes the follower count.
   */
  const refresh = useCallback(async () => {
    await loadFollowerCount();
  }, [loadFollowerCount]);

  // Initial load
  useEffect(() => {
    loadFollowerCount();
  }, [loadFollowerCount]);

  return {
    followerCount,
    isLoading,
    error,
    refresh,
  };
}

// =============================================================================
// EXTENDED HOOK FOR VIP FOLLOWER LIST
// =============================================================================

/**
 * Hook for VIP accounts to get their full follower list.
 * Returns null for non-VIP users.
 */
export function useFollowerList(): {
  followers: FollowInfo[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { user } = useAuthContext();
  const [followers, setFollowers] = useState<FollowInfo[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFollowers = useCallback(async () => {
    if (!user?.uid) {
      setFollowers(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFollowers(user.uid);
      setFollowers(data); // Will be null for non-VIP users
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load followers';
      setError(message);
      console.error('Error loading followers:', err);
      setFollowers(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const refresh = useCallback(async () => {
    await loadFollowers();
  }, [loadFollowers]);

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  return { followers, isLoading, error, refresh };
}

// =============================================================================
// UTILITY HOOK FOR OTHER USER'S FOLLOWER COUNT
// =============================================================================

/**
 * Hook to get follower count for any VIP user.
 * Useful for displaying follower counts on profile pages.
 */
export function useUserFollowerCount(userId: string | undefined): {
  count: number | null;
  isLoading: boolean;
  error: string | null;
} {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCount(null);
      setIsLoading(false);
      return;
    }

    const loadCount = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const followerCount = await getFollowerCount(userId);
        setCount(followerCount);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load follower count';
        setError(message);
        setCount(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCount();
  }, [userId]);

  return { count, isLoading, error };
}

export default useFollowers;
