/**
 * useOnlineStatus Hook
 *
 * Feature: 001-social-graph
 * Tasks: T042, T043, T044
 *
 * Manages online presence:
 * - Update own status (online, away, invisible, offline)
 * - Track friends' online status
 * - 5-minute inactivity timeout
 * - Graceful degradation with cached "Last active"
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import {
  updateOnlineStatus,
  getOnlineStatuses,
} from '@/lib/supabase/social-queries';
import { useFriendships } from '@/hooks/social/useFriendships';
import type { UseOnlineStatusReturn, OnlineStatus } from '@/types/social';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const STATUS_REFRESH_INTERVAL = 60 * 1000; // 1 minute
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

export function useOnlineStatus(): UseOnlineStatusReturn {
  const { user } = useAuthContext();
  const { friends } = useFriendships();
  const [status, setStatus] = useState<OnlineStatus>('offline');
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(new Map());
  const [lastActiveMap, setLastActiveMap] = useState<Map<string, string>>(new Map());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Refs for timers
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Updates the current user's online status.
   */
  const updateStatus = useCallback(
    async (newStatus: OnlineStatus): Promise<void> => {
      if (!user?.uid) return;

      try {
        await updateOnlineStatus(user.uid, newStatus);
        setStatus(newStatus);
        setLastActive(new Date().toISOString());
      } catch (err) {
        console.error('Error updating online status:', err);
      }
    },
    [user?.uid]
  );

  /**
   * Checks if a specific user is online.
   */
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return onlineUsers.get(userId) ?? false;
    },
    [onlineUsers]
  );

  /**
   * Gets last active time for a user.
   */
  const getUserLastActive = useCallback(
    (userId: string): string | null => {
      return lastActiveMap.get(userId) ?? null;
    },
    [lastActiveMap]
  );

  /**
   * Refreshes online status for all friends.
   */
  const refreshFriendsStatus = useCallback(async () => {
    if (!friends.length) return;

    try {
      const friendIds = friends.map((f) => f.id);
      const statuses = await getOnlineStatuses(friendIds);

      const newOnlineMap = new Map<string, boolean>();
      const newLastActiveMap = new Map<string, string>();

      statuses.forEach((value, key) => {
        newOnlineMap.set(key, value.status === 'online');
        if (value.lastActive) {
          newLastActiveMap.set(key, value.lastActive);
        }
      });

      setOnlineUsers(newOnlineMap);
      setLastActiveMap(newLastActiveMap);
      setIsRealtimeConnected(true);
    } catch (err) {
      console.error('Error refreshing friend statuses:', err);
      setIsRealtimeConnected(false);
    }
  }, [friends]);

  /**
   * Resets inactivity timer.
   */
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set to "away" after inactivity
    inactivityTimerRef.current = setTimeout(() => {
      if (status === 'online') {
        updateStatus('away');
      }
    }, INACTIVITY_TIMEOUT);
  }, [status, updateStatus]);

  /**
   * Handles user activity (mouse, keyboard, etc.).
   */
  const handleActivity = useCallback(() => {
    if (status === 'away') {
      updateStatus('online');
    }
    resetInactivityTimer();
  }, [status, updateStatus, resetInactivityTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!user?.uid) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user?.uid, handleActivity]);

  // Set up heartbeat (periodic status update)
  useEffect(() => {
    if (!user?.uid || status === 'invisible' || status === 'offline') return;

    heartbeatTimerRef.current = setInterval(() => {
      updateStatus(status);
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [user?.uid, status, updateStatus]);

  // Set up periodic friend status refresh
  useEffect(() => {
    if (!user?.uid || !friends.length) return;

    // Initial refresh
    refreshFriendsStatus();

    // Periodic refresh
    statusRefreshTimerRef.current = setInterval(refreshFriendsStatus, STATUS_REFRESH_INTERVAL);

    return () => {
      if (statusRefreshTimerRef.current) {
        clearInterval(statusRefreshTimerRef.current);
      }
    };
  }, [user?.uid, friends, refreshFriendsStatus]);

  // Set initial status on mount
  useEffect(() => {
    if (user?.uid) {
      updateStatus('online');
      resetInactivityTimer();
    }

    // Set to offline on unmount
    return () => {
      if (user?.uid) {
        updateOnlineStatus(user.uid, 'offline').catch(console.error);
      }

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (statusRefreshTimerRef.current) {
        clearInterval(statusRefreshTimerRef.current);
      }
    };
  }, [user?.uid, updateStatus, resetInactivityTimer]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Don't immediately set offline, user might switch back
        if (status === 'online') {
          updateStatus('away');
        }
      } else {
        // Coming back to tab
        if (status === 'away') {
          updateStatus('online');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, updateStatus]);

  return {
    isOnline: status === 'online',
    status,
    lastActive,
    onlineUsers,
    lastActiveMap,
    isUserOnline,
    getUserLastActive,
    setStatus: updateStatus,
    isRealtimeConnected,
  };
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

/**
 * Gets display info for an online status.
 */
export function getStatusInfo(status: OnlineStatus): {
  label: string;
  color: string;
  dotClass: string;
} {
  switch (status) {
    case 'online':
      return {
        label: 'Online',
        color: 'text-green-500',
        dotClass: 'bg-green-500',
      };
    case 'away':
      return {
        label: 'Away',
        color: 'text-yellow-500',
        dotClass: 'bg-yellow-500',
      };
    case 'invisible':
      return {
        label: 'Invisible',
        color: 'text-gray-400',
        dotClass: 'bg-gray-400',
      };
    case 'offline':
    default:
      return {
        label: 'Offline',
        color: 'text-gray-400',
        dotClass: 'bg-gray-400',
      };
  }
}

/**
 * Formats last active time as relative string.
 */
export function formatLastActive(dateString: string | null): string {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

export default useOnlineStatus;
