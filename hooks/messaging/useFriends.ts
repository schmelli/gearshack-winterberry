/**
 * useFriends - Friend Management Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T023
 *
 * Manages friend relationships with add, remove, and list operations.
 * Uses one-way follow model (user adds friends, not mutual).
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface FriendInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  added_at: string;
}

interface UseFriendsReturn {
  /** List of current user's friends */
  friends: FriendInfo[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Check if a user is a friend */
  isFriend: (userId: string) => boolean;
  /** Add a user as friend */
  addFriend: (userId: string) => Promise<boolean>;
  /** Remove a user from friends */
  removeFriend: (userId: string) => Promise<boolean>;
  /** Refresh the friends list */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing friend relationships.
 */
export function useFriends(): UseFriendsReturn {
  const { user } = useSupabaseAuth();
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    if (!user?.id) {
      setFriends([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      // user_friends table is created by migration
      const { data, error: fetchError } = await supabase
        .from('user_friends')
        .select(`
          friend_id,
          created_at,
          profiles:friend_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const friendsList: FriendInfo[] = (data ?? []).map((row) => {
        const profile = row.profiles;
        return {
          id: profile.id,
          display_name: profile.display_name ?? 'Unknown',
          avatar_url: profile.avatar_url,
          added_at: row.created_at,
        };
      });

      setFriends(friendsList);
    } catch (err) {
      console.error('[useFriends] Failed to fetch friends:', err);
      setError('Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Subscribe to friend changes
  useEffect(() => {
    if (!user?.id) return;

    fetchFriends();

    const supabase = createClient();
    const channel = supabase
      .channel(`friends:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_friends',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh on any change
          fetchFriends();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, fetchFriends]);

  // Check if user is a friend
  const isFriend = useCallback(
    (userId: string): boolean => {
      return friends.some((f) => f.id === userId);
    },
    [friends]
  );

  // Add a friend
  const addFriend = useCallback(
    async (friendId: string): Promise<boolean> => {
      if (!user?.id) return false;
      if (friendId === user.id) return false; // Can't friend yourself

      try {
        const supabase = createClient();

        const { error: insertError } = await supabase
          .from('user_friends')
          .insert({
            user_id: user.id,
            friend_id: friendId,
          });

        if (insertError) {
          // Ignore if already friends (unique constraint)
          if (insertError.code === '23505') {
            return true;
          }
          throw insertError;
        }

        // Optimistically update local state
        // The realtime subscription will sync the full data
        return true;
      } catch (err) {
        console.error('[useFriends] Failed to add friend:', err);
        setError('Failed to add friend');
        return false;
      }
    },
    [user?.id]
  );

  // Remove a friend
  const removeFriend = useCallback(
    async (friendId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const supabase = createClient();

        const { error: deleteError } = await supabase
          .from('user_friends')
          .delete()
          .eq('user_id', user.id)
          .eq('friend_id', friendId);

        if (deleteError) {
          throw deleteError;
        }

        // Optimistically update local state
        setFriends((prev) => prev.filter((f) => f.id !== friendId));
        return true;
      } catch (err) {
        console.error('[useFriends] Failed to remove friend:', err);
        setError('Failed to remove friend');
        return false;
      }
    },
    [user?.id]
  );

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchFriends();
  }, [fetchFriends]);

  return {
    friends,
    isLoading,
    error,
    isFriend,
    addFriend,
    removeFriend,
    refresh,
  };
}
