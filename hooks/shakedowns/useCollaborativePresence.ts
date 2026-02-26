/**
 * useCollaborativePresence Hook
 *
 * Feature: Shakedown Detail Enhancement - Live Collaboration Cursors
 *
 * Uses Supabase Realtime Presence to track who is viewing a shakedown
 * and what item they are currently focused on.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

// =============================================================================
// Types
// =============================================================================

export interface PresenceUser {
  /** User ID */
  id: string;
  /** Display name */
  name: string;
  /** Avatar URL */
  avatar: string | null;
  /** Color for cursor/indicator (hue value) */
  color: number;
  /** Currently focused item ID (null if not focused on item) */
  focusedItemId: string | null;
  /** Last activity timestamp */
  lastSeen: number;
  /** Whether user is actively viewing (last 5 min) */
  isActive: boolean;
}

export interface UseCollaborativePresenceOptions {
  /** Shakedown ID to track */
  shakedownId: string;
  /** Whether to enable presence tracking */
  enabled?: boolean;
}

export interface UseCollaborativePresenceReturn {
  /** List of users currently viewing */
  viewers: PresenceUser[];
  /** Number of active viewers (excluding self) */
  viewerCount: number;
  /** Set the currently focused item */
  setFocusedItem: (itemId: string | null) => void;
  /** Request attention on an item */
  requestAttention: (itemId: string) => void;
  /** Currently focused item by others (for cursor display) */
  focusedItems: Map<string, PresenceUser[]>;
  /** Items with attention requests */
  attentionRequests: AttentionRequest[];
  /** Whether presence is connected */
  isConnected: boolean;
  /** Current user's color */
  myColor: number;
}

export interface AttentionRequest {
  /** Request ID */
  id: string;
  /** User who requested attention */
  user: PresenceUser;
  /** Item ID */
  itemId: string;
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// Constants
// =============================================================================

// Predefined cursor colors (hue values)
const CURSOR_COLORS = [
  0,    // Red
  30,   // Orange
  60,   // Yellow
  120,  // Green
  180,  // Cyan
  240,  // Blue
  280,  // Purple
  320,  // Pink
];

// Activity timeout (5 minutes)
const ACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

// Presence update throttle (500ms)
const PRESENCE_UPDATE_THROTTLE_MS = 500;

// Attention request expiry (30 seconds)
const ATTENTION_REQUEST_EXPIRY_MS = 30 * 1000;

// =============================================================================
// Helper Functions
// =============================================================================

function getColorForUser(userId: string): number {
  // Hash user ID to get consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useCollaborativePresence({
  shakedownId,
  enabled = true,
}: UseCollaborativePresenceOptions): UseCollaborativePresenceReturn {
  const { user, profile } = useAuthContext();

  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [attentionRequests, setAttentionRequests] = useState<AttentionRequest[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const focusedItemRef = useRef<string | null>(null);
  const userRef = useRef(user);

  const myColor = useMemo(() => {
    return user ? getColorForUser(user.uid) : 0;
  }, [user]);

  // Update user ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Track and update presence
  const trackPresence = useCallback(
    async (focusedItemId: string | null = null) => {
      if (!channelRef.current || !user) return;

      const now = Date.now();
      // Throttle updates
      if (now - lastUpdateRef.current < PRESENCE_UPDATE_THROTTLE_MS) return;
      lastUpdateRef.current = now;

      const displayName = profile?.profile?.displayName || user.displayName || 'Anonymous';
      const avatarUrl = profile?.profile?.avatarUrl || user.photoURL || null;

      try {
        await channelRef.current.track({
          id: user.uid,
          name: displayName,
          avatar: avatarUrl,
          color: myColor,
          focusedItemId,
          lastSeen: now,
        });
      } catch (error) {
        console.error('Failed to track presence:', error);
        // Gracefully degrade - presence tracking is non-critical
      }
    },
    [user, profile, myColor]
  );

  // Set focused item
  const setFocusedItem = useCallback(
    (itemId: string | null) => {
      focusedItemRef.current = itemId;
      trackPresence(itemId);
    },
    [trackPresence]
  );

  // Request attention on an item
  const requestAttention = useCallback(
    (itemId: string) => {
      if (!channelRef.current || !user) return;

      const displayName = profile?.profile?.displayName || user.displayName || 'Anonymous';
      const avatarUrl = profile?.profile?.avatarUrl || user.photoURL || null;

      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'attention_request',
          payload: {
            id: `${user.uid}_${Date.now()}`,
            user: {
              id: user.uid,
              name: displayName,
              avatar: avatarUrl,
              color: myColor,
            },
            itemId,
            timestamp: Date.now(),
          },
        });
      } catch (error) {
        console.error('Failed to send attention request:', error);
        // Gracefully degrade - attention requests are non-critical
      }
    },
    [user, profile, myColor]
  );

  // Process presence state
  const processPresenceState = useCallback(
    (state: RealtimePresenceState<Record<string, unknown>>) => {
      const now = Date.now();
      const users: PresenceUser[] = [];
      const currentUser = userRef.current;

      Object.values(state).forEach((presences) => {
        presences.forEach((presence: Record<string, unknown>) => {
          const presenceData = presence as {
            id: string;
            name: string;
            avatar: string | null;
            color: number;
            focusedItemId: string | null;
            lastSeen: number;
          };

          // Skip self
          if (currentUser && presenceData.id === currentUser.uid) return;

          const lastSeen = presenceData.lastSeen || now;
          const isActive = now - lastSeen < ACTIVITY_TIMEOUT_MS;

          users.push({
            id: presenceData.id,
            name: presenceData.name || 'Anonymous',
            avatar: presenceData.avatar || null,
            color: presenceData.color || 0,
            focusedItemId: presenceData.focusedItemId || null,
            lastSeen,
            isActive,
          });
        });
      });

      // Sort by last seen (most recent first)
      users.sort((a, b) => b.lastSeen - a.lastSeen);

      setViewers(users);
    },
    [] // No dependencies - uses refs
  );

  // Set up presence channel
  useEffect(() => {
    if (!enabled || !shakedownId) return;

    const supabase = createClient();
    const channel = supabase.channel(`shakedown:${shakedownId}`, {
      config: {
        presence: {
          key: user?.uid || 'anonymous',
        },
      },
    });

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      processPresenceState(state);
    });

    // Handle joins
    channel.on('presence', { event: 'join' }, ({ newPresences: _newPresences }) => {
      const state = channel.presenceState();
      processPresenceState(state);
    });

    // Handle leaves
    channel.on('presence', { event: 'leave' }, ({ leftPresences: _leftPresences }) => {
      const state = channel.presenceState();
      processPresenceState(state);
    });

    // Handle attention requests
    channel.on('broadcast', { event: 'attention_request' }, ({ payload }) => {
      const request = payload as AttentionRequest;

      // Skip own requests
      if (user && request.user.id === user.uid) return;

      setAttentionRequests((prev) => {
        // Remove expired requests
        const now = Date.now();
        const filtered = prev.filter(
          (r) => now - r.timestamp < ATTENTION_REQUEST_EXPIRY_MS
        );
        return [...filtered, request];
      });
    });

    // Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        channelRef.current = channel;

        // Track initial presence
        if (user) {
          trackPresence(null);
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false);
      }
    });

    return () => {
      const cleanup = async () => {
        try {
          // Untrack presence before unsubscribing
          if (user && channelRef.current) {
            await channelRef.current.untrack();
          }
        } catch (error) {
          console.error('Failed to untrack presence:', error);
        }

        try {
          await channel.unsubscribe();
        } catch (error) {
          console.error('Failed to unsubscribe from channel:', error);
        }

        channelRef.current = null;
        setIsConnected(false);
      };

      // Properly handle async cleanup promise
      cleanup().catch((error) => {
        console.error('Cleanup failed:', error);
      });
    };
  }, [enabled, shakedownId, user, processPresenceState, trackPresence]);

  // Periodically update presence to maintain activity
  useEffect(() => {
    if (!isConnected || !user) return;

    const interval = setInterval(() => {
      trackPresence(focusedItemRef.current);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isConnected, user, trackPresence]);

  // Clean up expired attention requests
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAttentionRequests((prev) =>
        prev.filter((r) => now - r.timestamp < ATTENTION_REQUEST_EXPIRY_MS)
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Build focused items map
  const focusedItems = useMemo(() => {
    const map = new Map<string, PresenceUser[]>();

    viewers.forEach((viewer) => {
      if (viewer.focusedItemId && viewer.isActive) {
        if (!map.has(viewer.focusedItemId)) {
          map.set(viewer.focusedItemId, []);
        }
        map.get(viewer.focusedItemId)!.push(viewer);
      }
    });

    return map;
  }, [viewers]);

  const viewerCount = viewers.filter((v) => v.isActive).length;

  return {
    viewers,
    viewerCount,
    setFocusedItem,
    requestAttention,
    focusedItems,
    attentionRequests,
    isConnected,
    myColor,
  };
}

export default useCollaborativePresence;
