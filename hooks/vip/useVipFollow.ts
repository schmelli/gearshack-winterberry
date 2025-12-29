/**
 * useVipFollow Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T049 (US2 Follow)
 *
 * Manages VIP follow/unfollow state with optimistic updates.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { followVip, unfollowVip } from '@/lib/vip/vip-service';

// =============================================================================
// Types
// =============================================================================

interface UseVipFollowReturn {
  isFollowing: boolean;
  followerCount: number;
  isLoading: boolean;
  error: string | null;
  toggleFollow: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useVipFollow(
  vipId: string | undefined,
  initialIsFollowing: boolean = false,
  initialFollowerCount: number = 0
): UseVipFollowReturn {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with initial values when they change
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
    setFollowerCount(initialFollowerCount);
  }, [initialIsFollowing, initialFollowerCount]);

  const toggleFollow = useCallback(async () => {
    if (!vipId || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Optimistic update
    const previousFollowing = isFollowing;
    const previousCount = followerCount;
    setIsFollowing(!isFollowing);
    setFollowerCount(isFollowing ? followerCount - 1 : followerCount + 1);

    try {
      const result = isFollowing
        ? await unfollowVip(vipId)
        : await followVip(vipId);

      // Update with server response
      setIsFollowing(result.isFollowing);
      setFollowerCount(result.followerCount);
    } catch (err) {
      // Rollback on error
      setIsFollowing(previousFollowing);
      setFollowerCount(previousCount);
      setError(err instanceof Error ? err.message : 'Failed to update follow status');
      console.error('Error toggling follow:', err);
    } finally {
      setIsLoading(false);
    }
  }, [vipId, isFollowing, followerCount, isLoading]);

  return {
    isFollowing,
    followerCount,
    isLoading,
    error,
    toggleFollow,
  };
}

export default useVipFollow;
