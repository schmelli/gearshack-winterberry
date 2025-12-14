/**
 * useUnreadCount - Global Unread Message Count Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T007
 *
 * Provides real-time unread message count with Supabase subscription.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchTotalUnreadCount } from '@/lib/supabase/messaging-queries';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface UseUnreadCountReturn {
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing global unread message count.
 * Subscribes to real-time updates when messages are received.
 */
export function useUnreadCount(): UseUnreadCountReturn {
  const { user } = useSupabaseAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const count = await fetchTotalUnreadCount(user.id);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      // Silently handle errors when messaging tables don't exist yet
      // This prevents console spam during development
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch unread count';
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        // Table doesn't exist - messaging feature not yet deployed
        setUnreadCount(0);
        setError(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to real-time updates on conversation_participants unread_count changes
  // Note: This subscription will silently fail if messaging tables don't exist yet
  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    const channel = supabase
      .channel('unread-count-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh count when participant record changes (unread_count updated)
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // When a new message is inserted, check if it's for us
          // The trigger will update unread_count, so we just refresh
          if (payload.new && payload.new.sender_id !== user.id) {
            refresh();
          }
        }
      )
      .subscribe((status, err) => {
        // Silently handle subscription errors (e.g., tables don't exist)
        if (status === 'CHANNEL_ERROR' && err) {
          console.debug('[useUnreadCount] Realtime subscription unavailable:', err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  return {
    unreadCount,
    isLoading,
    error,
    refresh,
  };
}
