/**
 * useFriendships Hook
 *
 * Feature: 001-social-graph
 * Task: T034
 *
 * Manages friendships:
 * - Fetch friends list with search/filter/sort
 * - Unfriend users (silent, no notification)
 * - Check friendship status
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchFriends,
  areFriends,
  unfriend,
  fetchMutualFriends,
} from '@/lib/supabase/social-queries';
import type { UseFriendshipsReturn, FriendInfo, FriendsListFilters, FriendsListSortBy } from '@/types/social';

export function useFriendships(): UseFriendshipsReturn {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a Set for O(1) lookup of friend IDs
  const friendIds = useMemo(
    () => new Set(friends.map((f) => f.id)),
    [friends]
  );

  /**
   * Loads the friends list.
   */
  const loadFriends = useCallback(async () => {
    if (!user?.id) {
      setFriends([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFriends(user.id);
      setFriends(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load friends list';
      setError(message);
      console.error('Error loading friends:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Unfriends a user. Silent operation - no notification sent.
   * @param friendId - The ID of the friend to remove
   */
  const unfriendUser = useCallback(
    async (friendId: string): Promise<void> => {
      if (!user?.id) {
        throw new Error('Must be logged in to unfriend users');
      }

      // Store for rollback
      const previousFriends = [...friends];

      // Optimistic update
      setFriends((prev) => prev.filter((f) => f.id !== friendId));

      try {
        await unfriend(user.id, friendId);
      } catch (err) {
        // Rollback on error
        setFriends(previousFriends);
        const message = err instanceof Error ? err.message : 'Failed to unfriend user';
        setError(message);
        throw err;
      }
    },
    [user?.id, friends]
  );

  /**
   * Checks if the current user is friends with another user.
   * Uses local state for O(1) lookup.
   * @param userId - The ID of the user to check
   */
  const checkAreFriends = useCallback(
    (userId: string): boolean => {
      return friendIds.has(userId);
    },
    [friendIds]
  );

  /**
   * Gets mutual friends between current user and another user.
   * @param userId - The ID of the other user
   */
  const getMutualFriends = useCallback(
    async (userId: string): Promise<FriendInfo[]> => {
      if (!user?.id) return [];

      try {
        return await fetchMutualFriends(user.id, userId);
      } catch (err) {
        console.error('Error fetching mutual friends:', err);
        return [];
      }
    },
    [user?.id]
  );

  /**
   * Refreshes the friends list.
   */
  const refresh = useCallback(async () => {
    await loadFriends();
  }, [loadFriends]);

  // Initial load
  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  return {
    friends,
    totalCount: friends.length,
    isLoading,
    error,
    unfriend: unfriendUser,
    areFriends: checkAreFriends,
    getMutualFriends,
    refresh,
  };
}

// =============================================================================
// FILTERED/SORTED HOOK
// =============================================================================

/**
 * Hook with built-in filtering and sorting for friends list UI.
 */
export function useFilteredFriends(filters: FriendsListFilters = {}): {
  friends: FriendInfo[];
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  error: string | null;
  unfriend: (friendId: string) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { friends: allFriends, isLoading, error, unfriend: removeFriend, refresh } = useFriendships();

  // Apply filters and sorting
  const filteredFriends = useMemo(() => {
    let result = [...allFriends];

    // Search filter
    if (filters.search?.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter((friend) =>
        friend.display_name.toLowerCase().includes(query)
      );
    }

    // Online only filter
    if (filters.onlineOnly) {
      result = result.filter((friend) => friend.is_online);
    }

    // Sort
    const sortBy: FriendsListSortBy = filters.sortBy ?? 'name';
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.display_name.localeCompare(b.display_name);
        case 'recent':
          // Sort by last active (most recent first)
          if (!a.last_active && !b.last_active) return 0;
          if (!a.last_active) return 1;
          if (!b.last_active) return -1;
          return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
        case 'online':
          // Online users first, then by name
          if (a.is_online === b.is_online) {
            return a.display_name.localeCompare(b.display_name);
          }
          return a.is_online ? -1 : 1;
        case 'date_added':
          // Sort by friends_since (newest first)
          return new Date(b.friends_since).getTime() - new Date(a.friends_since).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [allFriends, filters.search, filters.onlineOnly, filters.sortBy]);

  return {
    friends: filteredFriends,
    totalCount: allFriends.length,
    filteredCount: filteredFriends.length,
    isLoading,
    error,
    unfriend: removeFriend,
    refresh,
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to check if current user is friends with a specific user.
 */
export function useIsFriend(targetUserId: string): {
  isFriend: boolean;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const [isFriend, setIsFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !targetUserId) {
      setIsFriend(false);
      setIsLoading(false);
      return;
    }

    const checkFriendship = async () => {
      try {
        setIsLoading(true);
        const result = await areFriends(user.id, targetUserId);
        setIsFriend(result);
      } catch (err) {
        console.error('Error checking friendship:', err);
        setIsFriend(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFriendship();
  }, [user?.id, targetUserId]);

  return { isFriend, isLoading };
}

/**
 * Hook to get friends count.
 */
export function useFriendsCount(): number {
  const { friends } = useFriendships();
  return friends.length;
}

export default useFriendships;
