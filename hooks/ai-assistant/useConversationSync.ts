/**
 * useConversationSync Hook
 * Feature 050: AI Assistant - T020
 *
 * Manages Supabase Realtime synchronization for AI conversations.
 * Subscribes to new messages and broadcasts typing indicators.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  subscribeToConversationMessages,
  subscribeToTypingIndicators,
  subscribeToContextUpdates,
  broadcastTypingIndicator,
  broadcastContextUpdate,
  cleanupChannel,
  type SyncEvent,
} from '@/lib/ai-assistant/sync-protocol';
import type { Message } from '@/types/ai-assistant';

interface UseConversationSyncOptions {
  conversationId: string | null;
  userId: string;
  onNewMessage?: (message: Message) => void;
  onTypingChange?: (userId: string, typing: boolean) => void;
  onContextChange?: (userId: string, screen: string) => void;
}

interface UseConversationSyncResult {
  isConnected: boolean;
  sendTypingIndicator: (typing: boolean) => Promise<void>;
  sendContextUpdate: (screen: string, loadoutId?: string) => Promise<void>;
}

/**
 * Hook for real-time conversation synchronization
 *
 * @param options - Configuration options
 * @returns Connection state and broadcast functions
 */
export function useConversationSync({
  conversationId,
  userId,
  onNewMessage,
  onTypingChange,
  onContextChange,
}: UseConversationSyncOptions): UseConversationSyncResult {
  const [isConnected, setIsConnected] = useState(false);
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  // Handle sync events
  const handleSyncEvent = useCallback(
    (event: SyncEvent) => {
      switch (event.type) {
        case 'message_inserted':
          onNewMessage?.(event.message);
          break;
        case 'typing_started':
          onTypingChange?.(event.userId, true);
          break;
        case 'typing_stopped':
          onTypingChange?.(event.userId, false);
          break;
        case 'context_updated':
          onContextChange?.(event.userId, event.screen);
          break;
      }
    },
    [onNewMessage, onTypingChange, onContextChange]
  );

  // Broadcast typing indicator
  const sendTypingIndicator = useCallback(
    async (typing: boolean) => {
      if (!conversationId) return;

      const channel = supabase.channel(`ai-conversation-${conversationId}`);
      await broadcastTypingIndicator(channel, userId, conversationId, typing);
    },
    [conversationId, userId, supabase]
  );

  // Broadcast context update
  const sendContextUpdate = useCallback(
    async (screen: string, loadoutId?: string) => {
      if (!conversationId) return;

      const channel = supabase.channel(`ai-conversation-${conversationId}`);
      await broadcastContextUpdate(channel, userId, screen, loadoutId);
    },
    [conversationId, userId, supabase]
  );

  // Setup Realtime subscription
  useEffect(() => {
    if (!conversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsConnected(false);
      return;
    }

    const channel = supabase.channel(`ai-conversation-${conversationId}`, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
      },
    });

    // Subscribe to postgres changes (new messages)
    subscribeToConversationMessages(channel, conversationId, handleSyncEvent);

    // Subscribe to broadcasts (typing, context)
    subscribeToTypingIndicators(channel, handleSyncEvent);
    subscribeToContextUpdates(channel, handleSyncEvent);

    // Subscribe and track connection state
    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    // Cleanup on unmount
    return () => {
      cleanupChannel(channel);
      setIsConnected(false);
    };
  }, [conversationId, supabase, handleSyncEvent]);

  return {
    isConnected,
    sendTypingIndicator,
    sendContextUpdate,
  };
}
