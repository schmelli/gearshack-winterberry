/**
 * useTypingIndicator - Typing Indicator Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T062
 *
 * Hook for managing typing indicator state with Supabase Broadcast.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  userId: string;
  displayName: string;
  timestamp: number;
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  setTyping: (isTyping: boolean) => void;
  isAnyoneTyping: boolean;
}

const TYPING_TIMEOUT_MS = 3000; // Hide indicator after 3 seconds of inactivity

/**
 * Hook for managing typing indicators in a conversation.
 * Uses Supabase Broadcast for real-time communication.
 */
export function useTypingIndicator(
  conversationId: string | null,
  displayName?: string
): UseTypingIndicatorReturn {
  const { user } = useSupabaseAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up stale typing indicators
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) =>
        prev.filter((u) => now - u.timestamp < TYPING_TIMEOUT_MS)
      );
    }, 1000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  // Subscribe to typing events
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const supabase = createClient();

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, displayName, isTyping } = payload.payload as {
          userId: string;
          displayName: string;
          isTyping: boolean;
        };

        // Ignore own typing events
        if (userId === user.id) return;

        if (isTyping) {
          setTypingUsers((prev) => {
            const existing = prev.find((u) => u.userId === userId);
            if (existing) {
              return prev.map((u) =>
                u.userId === userId ? { ...u, timestamp: Date.now() } : u
              );
            }
            return [...prev, { userId, displayName, timestamp: Date.now() }];
          });
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Send typing status
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !user) return;

      const name = displayName ?? 'Someone';

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          displayName: name,
          isTyping,
        },
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
              userId: user.id,
              displayName: name,
              isTyping: false,
            },
          });
        }, TYPING_TIMEOUT_MS);
      }
    },
    [user, displayName]
  );

  const isAnyoneTyping = typingUsers.length > 0;

  return {
    typingUsers,
    setTyping,
    isAnyoneTyping,
  };
}
