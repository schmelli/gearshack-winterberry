/**
 * useFriendActivity Hook
 *
 * Feature: 001-social-graph
 * Task: T035
 *
 * Manages friend activity feed:
 * - Fetch paginated activity from friends
 * - Real-time updates via Supabase Realtime
 * - Filter by activity type
 * - Mark all as read
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import {
  fetchFriendActivities,
  subscribeToFriendActivities,
} from '@/lib/supabase/social-queries';
import type {
  UseFriendActivityReturn,
  FriendActivityWithProfile,
  SocialActivityType,
  SocialActivityTypeFilter,
} from '@/types/social';

const PAGE_SIZE = 20;
const MAX_ACTIVITIES = 50; // Maximum activities to display

export function useFriendActivity(
  activityTypeFilter?: SocialActivityTypeFilter
): UseFriendActivityReturn {
  const { user } = useAuthContext();
  const [activities, setActivities] = useState<FriendActivityWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Track unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Loads initial activities.
   */
  const loadActivities = useCallback(async () => {
    if (!user?.uid) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setOffset(0);

      const filterType = activityTypeFilter === 'all' ? undefined : activityTypeFilter as SocialActivityType | undefined;
      const data = await fetchFriendActivities(PAGE_SIZE, 0, filterType);

      setActivities(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activity feed';
      setError(message);
      console.error('Error loading friend activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, activityTypeFilter]);

  /**
   * Loads more activities (pagination).
   */
  const loadMore = useCallback(async () => {
    if (!user?.uid || isLoading || !hasMore) return;

    try {
      const newOffset = offset + PAGE_SIZE;

      // Don't load more than the max
      if (activities.length >= MAX_ACTIVITIES) {
        setHasMore(false);
        return;
      }

      const filterType = activityTypeFilter === 'all' ? undefined : activityTypeFilter as SocialActivityType | undefined;
      const data = await fetchFriendActivities(PAGE_SIZE, newOffset, filterType);

      setActivities((prev) => [...prev, ...data]);
      setOffset(newOffset);
      setHasMore(data.length === PAGE_SIZE && activities.length + data.length < MAX_ACTIVITIES);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load more activities';
      setError(message);
      console.error('Error loading more activities:', err);
    }
  }, [user?.uid, isLoading, hasMore, offset, activities.length, activityTypeFilter]);

  /**
   * Refreshes the activity feed.
   */
  const refresh = useCallback(async () => {
    await loadActivities();
  }, [loadActivities]);

  /**
   * Marks all activities as read.
   * (Currently a no-op as activities don't have read status,
   * but included for future extension)
   */
  const markAllAsRead = useCallback(async () => {
    // TODO: Implement when activity read status is added
    console.log('Mark all as read - not yet implemented');
  }, []);

  // Use ref for activity filter to avoid subscription churn
  const activityTypeFilterRef = useRef(activityTypeFilter);
  activityTypeFilterRef.current = activityTypeFilter;

  /**
   * Handles new activity from Realtime subscription.
   * Uses ref to access filter without causing subscription churn.
   */
  const handleNewActivity = useCallback((activity: FriendActivityWithProfile) => {
    // Only add if it matches the current filter (read from ref)
    const filter = activityTypeFilterRef.current;
    if (filter && filter !== 'all') {
      if (activity.activity_type !== filter) {
        return;
      }
    }

    setActivities((prev) => {
      // Prevent duplicates
      if (prev.some((a) => a.id === activity.id)) {
        return prev;
      }

      // Add to beginning and limit to MAX_ACTIVITIES
      return [activity, ...prev].slice(0, MAX_ACTIVITIES);
    });
  }, []); // No dependencies - uses ref

  // Initial load - depend only on user.uid and activityTypeFilter
  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      if (!user?.uid) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setOffset(0);

        const filterType = activityTypeFilter === 'all' ? undefined : activityTypeFilter as SocialActivityType | undefined;
        const data = await fetchFriendActivities(PAGE_SIZE, 0, filterType);

        if (isCancelled) return;

        setActivities(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        if (isCancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load activity feed';
        setError(message);
        console.error('Error loading friend activities:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, activityTypeFilter]);

  // Setup Realtime subscription - only recreate when user changes
  // Note: handleNewActivity is stable via ref pattern, so not needed in deps
  useEffect(() => {
    if (!user?.uid) return;

    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to new activities
    unsubscribeRef.current = subscribeToFriendActivities(user.uid, handleNewActivity);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return {
    activities,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    markAllAsRead,
  };
}

// =============================================================================
// ACTIVITY TYPE HELPERS
// =============================================================================

/**
 * Gets display info for an activity type.
 */
export function getSocialActivityTypeInfo(type: SocialActivityType): {
  icon: string;
  label: string;
  color: string;
} {
  switch (type) {
    case 'new_loadout':
      return { icon: 'Backpack', label: 'New Loadout', color: 'text-blue-500' };
    case 'loadout_shared':
      return { icon: 'Share2', label: 'Shared Loadout', color: 'text-green-500' };
    case 'marketplace_listing':
      return { icon: 'Tag', label: 'Listed for Sale', color: 'text-yellow-500' };
    case 'gear_added':
      return { icon: 'Package', label: 'Added Gear', color: 'text-purple-500' };
    case 'friend_added':
      return { icon: 'Users', label: 'New Friend', color: 'text-pink-500' };
    case 'profile_updated':
      return { icon: 'User', label: 'Updated Profile', color: 'text-gray-500' };
    default:
      return { icon: 'Activity', label: 'Activity', color: 'text-muted-foreground' };
  }
}

/**
 * Formats activity time relative to now.
 * @param dateString - ISO date string
 * @param t - Translation function from useTranslations('Community')
 */
export function formatActivityTime(
  dateString: string,
  t: (key: string, values?: { count: number }) => string
): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return t('time.justNow', { count: 0 });

  const minutes = Math.floor(seconds / 60);
  if (seconds < 3600) return t('time.minutesAgo', { count: minutes });

  const hours = Math.floor(seconds / 3600);
  if (seconds < 86400) return t('time.hoursAgo', { count: hours });

  const days = Math.floor(seconds / 86400);
  if (seconds < 604800) return t('time.daysAgo', { count: days });

  const weeks = Math.floor(seconds / 604800);
  if (seconds < 2592000) return t('time.weeksAgo', { count: weeks });

  const months = Math.floor(seconds / 2592000);
  if (seconds < 31536000) return t('time.monthsAgo', { count: months });

  const years = Math.floor(seconds / 31536000);
  return t('time.yearsAgo', { count: years });
}

export default useFriendActivity;
