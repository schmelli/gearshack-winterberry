/**
 * useMutualFriends Hook
 *
 * Feature: 001-social-graph
 * Task: T054
 *
 * Fetches mutual friends between current user and another user.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { fetchMutualFriends, getMutualFriendsCount } from '@/lib/supabase/social-queries';
import type { UseMutualFriendsReturn, FriendInfo } from '@/types/social';

export function useMutualFriends(targetUserId: string): UseMutualFriendsReturn {
  const { user } = useAuthContext();
  const [mutualFriends, setMutualFriends] = useState<FriendInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMutualFriends = useCallback(async () => {
    if (!user?.uid || !targetUserId || user.uid === targetUserId) {
      setMutualFriends([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchMutualFriends(user.uid, targetUserId);
      setMutualFriends(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load mutual friends';
      setError(message);
      console.error('Error loading mutual friends:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, targetUserId]);

  useEffect(() => {
    loadMutualFriends();
  }, [loadMutualFriends]);

  return {
    mutualFriends,
    count: mutualFriends.length,
    isLoading,
    error,
  };
}

/**
 * Hook to get just the mutual friends count.
 */
export function useMutualFriendsCount(targetUserId: string): {
  count: number;
  isLoading: boolean;
} {
  const { user } = useAuthContext();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !targetUserId || user.uid === targetUserId) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    const loadCount = async () => {
      try {
        setIsLoading(true);
        const result = await getMutualFriendsCount(user.uid, targetUserId);
        setCount(result);
      } catch (err) {
        console.error('Error loading mutual friends count:', err);
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadCount();
  }, [user?.uid, targetUserId]);

  return { count, isLoading };
}

export default useMutualFriends;
