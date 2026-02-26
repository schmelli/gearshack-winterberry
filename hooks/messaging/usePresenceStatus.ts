/**
 * usePresenceStatus - Online/Offline Presence Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T013a
 *
 * Manages user presence status using Supabase Realtime Presence.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  userId: string;
  onlineAt: string;
}

interface UsePresenceStatusReturn {
  /** Current user's online status */
  isOnline: boolean;
  /** Set of online user IDs (more efficient than Map<string, boolean>) */
  onlineUsers: Set<string>;
  /** Check if a specific user is online */
  isUserOnline: (userId: string) => boolean;
  /** Start tracking presence (auto-called on mount) */
  startTracking: () => void;
  /** Stop tracking presence */
  stopTracking: () => void;
}

/**
 * Hook for managing online/offline presence status.
 * Uses Supabase Realtime Presence for real-time tracking.
 */
export function usePresenceStatus(): UsePresenceStatusReturn {
  const { user } = useSupabaseAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const updateOnlineUsers = useCallback((presences: Record<string, PresenceState[]>) => {
    const newOnlineUsers = new Set<string>();

    Object.values(presences).forEach((presence) => {
      presence.forEach((p) => {
        newOnlineUsers.add(p.userId);
      });
    });

    setOnlineUsers(newOnlineUsers);
  }, []);

  const startTracking = useCallback(() => {
    if (!user?.id || channelRef.current) return;

    const userId = user.id;
    const supabase = createClient();

    const channel = supabase.channel('presence:messaging', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        updateOnlineUsers(state);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          (newPresences as unknown as PresenceState[]).forEach((p) => {
            next.add(p.userId);
          });
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          (leftPresences as unknown as PresenceState[]).forEach((p) => {
            next.delete(p.userId);
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence
          await channel.track({
            userId: userId,
            onlineAt: new Date().toISOString(),
          });
          setIsOnline(true);
        }
      });

    channelRef.current = channel;
  }, [user, updateOnlineUsers]);

  const stopTracking = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsOnline(false);
    }
  }, []);

  // Auto-start tracking when user is authenticated
  // Note: startTracking is intentionally excluded from deps
  // to prevent circular dependency causing subscription churn
  useEffect(() => {
    if (user?.id) {
      startTracking();
    }

    // Direct cleanup using channelRef to avoid stale closure
    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsOnline(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Store startTracking in ref to avoid stale closure
  const startTrackingRef = useRef(startTracking);
  startTrackingRef.current = startTracking;

  // Handle page visibility for presence accuracy
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTrackingRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  return {
    isOnline,
    onlineUsers,
    isUserOnline,
    startTracking,
    stopTracking,
  };
}
