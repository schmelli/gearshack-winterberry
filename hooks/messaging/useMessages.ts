/**
 * useMessages - Message Management Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T014
 *
 * Manages messages within a conversation with real-time updates.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchMessages,
  sendMessage,
  markConversationAsRead,
  deleteMessage,
} from '@/lib/supabase/messaging-queries';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type {
  MessageWithSender,
  Message,
  MessageType,
  MessageMetadata,
  MessageDeliveryStatus,
} from '@/types/messaging';

interface UseMessagesReturn {
  messages: MessageWithSender[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  send: (content: string) => Promise<void>;
  sendWithMedia: (
    content: string | null,
    messageType: MessageType,
    mediaUrl: string | null,
    metadata?: MessageMetadata
  ) => Promise<void>;
  loadMore: () => Promise<void>;
  deleteForMe: (messageId: string) => Promise<void>;
  deleteForAll: (messageId: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  getDeliveryStatus: (message: Message) => MessageDeliveryStatus;
}

const PAGE_SIZE = 50;

/**
 * Hook for managing messages in a conversation.
 * Provides CRUD operations and real-time updates.
 */
export function useMessages(conversationId: string | null): UseMessagesReturn {
  const { user } = useSupabaseAuth();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!conversationId || !user?.id) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      offsetRef.current = 0;
      const data = await fetchMessages(conversationId, PAGE_SIZE, 0);
      // Reverse to show oldest first
      setMessages(data.reverse());
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    // Track mounted state to prevent memory leaks
    let isMounted = true;

    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const newMessage = payload.new as Message;
          if (!newMessage.sender_id) {
            if (isMounted) {
              setMessages((prev) => [...prev, { ...newMessage, sender: null, reactions: [] }]);
            }
            return;
          }

          // Get sender profile with error handling
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          if (error) {
            console.error('Failed to fetch sender profile:', error);
            // Still add the message but with null sender
            if (isMounted) {
              setMessages((prev) => [...prev, { ...newMessage, sender: null, reactions: [] }]);
            }
            return;
          }

          const sender = profile ? {
            id: profile.id,
            display_name: profile.display_name ?? 'Unknown',
            avatar_url: profile.avatar_url,
          } : null;

          const messageWithSender: MessageWithSender = {
            ...newMessage,
            sender,
            reactions: [],
          };

          if (isMounted) {
            setMessages((prev) => [...prev, messageWithSender]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMessage.id
                ? { ...m, ...updatedMessage }
                : m
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          // Note: Cannot filter by conversation_id since message_reactions table doesn't have it
          // We filter client-side to only process reactions for messages in this conversation
        },
        async (payload) => {
          // Extract message_id from the reaction event
          const reactionData = (payload.new || payload.old) as { message_id?: string };
          const messageId = reactionData?.message_id;

          if (!messageId) return;

          // Fetch updated reactions for this specific message
          const { data: updatedReactions, error } = await supabase
            .from('message_reactions')
            .select('id, message_id, user_id, emoji, created_at')
            .eq('message_id', messageId);

          if (error) {
            console.error('Failed to fetch updated reactions:', error);
            return; // Preserve existing reactions instead of clearing them
          }

          // Update only the affected message's reactions (if it exists in current conversation)
          if (isMounted) {
            setMessages((prev) => {
              const messageExists = prev.some((m) => m.id === messageId);
              if (!messageExists) return prev; // Not in this conversation, ignore

              return prev.map((m) =>
                m.id === messageId
                  ? { ...m, reactions: updatedReactions ?? [] }
                  : m
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, loadMessages]);

  // Send text message
  const send = useCallback(
    async (content: string) => {
      if (!conversationId || !user?.id || !content.trim()) return;

      try {
        await sendMessage(conversationId, user.id, content.trim(), 'text');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        throw err;
      }
    },
    [conversationId, user?.id]
  );

  // Send message with media
  const sendWithMedia = useCallback(
    async (
      content: string | null,
      messageType: MessageType,
      mediaUrl: string | null,
      metadata?: MessageMetadata
    ) => {
      if (!conversationId || !user?.id) return;

      try {
        await sendMessage(
          conversationId,
          user.id,
          content,
          messageType,
          mediaUrl,
          metadata as Record<string, unknown>
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        throw err;
      }
    },
    [conversationId, user?.id]
  );

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!conversationId || !user?.id || isLoading || !hasMore) return;

    try {
      const newOffset = offsetRef.current + PAGE_SIZE;
      const data = await fetchMessages(conversationId, PAGE_SIZE, newOffset);

      if (data.length > 0) {
        // Prepend older messages (reversed)
        setMessages((prev) => [...data.reverse(), ...prev]);
        offsetRef.current = newOffset;
      }

      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    }
  }, [conversationId, user?.id, isLoading, hasMore]);

  // Delete message for me
  const deleteForMe = useCallback(
    async (messageId: string) => {
      if (!user?.id) return;

      try {
        await deleteMessage(messageId, user.id, false);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete message');
      }
    },
    [user?.id]
  );

  // Delete message for everyone
  const deleteForAll = useCallback(
    async (messageId: string) => {
      if (!user?.id) return;

      try {
        await deleteMessage(messageId, user.id, true);
        // Message will be updated via real-time subscription
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete message');
      }
    },
    [user?.id]
  );

  // Mark conversation as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    try {
      await markConversationAsRead(conversationId, user.id);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [conversationId, user?.id]);

  // Get delivery status for a message
  const getDeliveryStatus = useCallback(
    (message: Message): MessageDeliveryStatus => {
      // For now, return 'sent' for all messages
      // TODO: Implement proper read receipts based on last_read_at timestamps
      if (message.sender_id !== user?.id) {
        return 'read'; // Other's messages are implicitly read
      }
      return 'sent';
    },
    [user?.id]
  );

  return {
    messages,
    isLoading,
    error,
    hasMore,
    send,
    sendWithMedia,
    loadMore,
    deleteForMe,
    deleteForAll,
    markAsRead,
    getDeliveryStatus,
  };
}
