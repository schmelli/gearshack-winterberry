/**
 * useBlockedUsers - Blocked Users Management Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T045
 *
 * Manages blocked user list with block, unblock, and check operations.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface BlockedUserInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  blocked_at: string;
}

interface UseBlockedUsersReturn {
  /** List of blocked users */
  blockedUsers: BlockedUserInfo[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Check if a user is blocked */
  isBlocked: (userId: string) => boolean;
  /** Block a user */
  blockUser: (userId: string) => Promise<boolean>;
  /** Unblock a user */
  unblockUser: (userId: string) => Promise<boolean>;
  /** Refresh the blocked users list */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing blocked users.
 */
export function useBlockedUsers(): UseBlockedUsersReturn {
  const { user } = useSupabaseAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch blocked users list
  const fetchBlockedUsers = useCallback(async () => {
    if (!user?.id) {
      setBlockedUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      // user_blocks table is created by migration
      const { data, error: fetchError } = await supabase
        .from('user_blocks')
        .select(`
          blocked_id,
          created_at,
          profiles:blocked_id (
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

      const blocked: BlockedUserInfo[] = (data ?? []).map((row) => {
        const profile = row.profiles;
        return {
          id: profile?.id ?? row.blocked_id,
          display_name: profile?.display_name ?? 'Unknown User',
          avatar_url: profile?.avatar_url ?? null,
          blocked_at: row.created_at,
        };
      });

      setBlockedUsers(blocked);
    } catch (err) {
      console.error('[useBlockedUsers] Failed to fetch blocked users:', err);
      setError('Failed to load blocked users');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Subscribe to block changes
  useEffect(() => {
    if (!user?.id) return;

    fetchBlockedUsers();

    const supabase = createClient();
    const channel = supabase
      .channel(`blocks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_blocks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh on any change
          fetchBlockedUsers();
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
  }, [user?.id, fetchBlockedUsers]);

  // Check if user is blocked
  const isBlocked = useCallback(
    (userId: string): boolean => {
      return blockedUsers.some((b) => b.id === userId);
    },
    [blockedUsers]
  );

  // Block a user
  const blockUser = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!user?.id) return false;
      if (targetUserId === user.id) return false; // Can't block yourself

      try {
        const supabase = createClient();

        const { error: insertError } = await supabase
          .from('user_blocks')
          .insert({
            user_id: user.id,
            blocked_id: targetUserId,
          });

        if (insertError) {
          // Ignore if already blocked (unique constraint)
          if (insertError.code === '23505') {
            return true;
          }
          throw insertError;
        }

        return true;
      } catch (err) {
        console.error('[useBlockedUsers] Failed to block user:', err);
        setError('Failed to block user');
        return false;
      }
    },
    [user?.id]
  );

  // Unblock a user
  const unblockUser = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const supabase = createClient();

        const { error: deleteError } = await supabase
          .from('user_blocks')
          .delete()
          .eq('user_id', user.id)
          .eq('blocked_id', targetUserId);

        if (deleteError) {
          throw deleteError;
        }

        // Optimistically update local state
        setBlockedUsers((prev) => prev.filter((b) => b.id !== targetUserId));
        return true;
      } catch (err) {
        console.error('[useBlockedUsers] Failed to unblock user:', err);
        setError('Failed to unblock user');
        return false;
      }
    },
    [user?.id]
  );

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  return {
    blockedUsers,
    isLoading,
    error,
    isBlocked,
    blockUser,
    unblockUser,
    refresh,
  };
}
