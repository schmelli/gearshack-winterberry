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
      setError(err instanceof Error ? err.message : 'Failed to fetch unread count');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to real-time updates on conversation_participants unread_count changes
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
      .subscribe();

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
