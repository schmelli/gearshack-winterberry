/**
 * useConversations - Conversation List Management Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T011
 *
 * Manages conversation list, creation, and real-time updates.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  toggleMute,
  toggleArchive,
  canMessageUser,
  leaveGroupConversation,
  addGroupParticipant,
  removeGroupParticipant,
  getUserRole,
} from '@/lib/supabase/messaging-queries';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { ConversationListItem } from '@/types/messaging';

interface UseConversationsReturn {
  conversations: ConversationListItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startDirectConversation: (recipientId: string) => Promise<{ success: boolean; conversationId?: string; error?: string }>;
  createGroup: (name: string, participantIds: string[]) => Promise<{ success: boolean; conversationId?: string; error?: string }>;
  muteConversation: (conversationId: string, muted: boolean) => Promise<void>;
  archiveConversation: (conversationId: string, archived: boolean) => Promise<void>;
  leaveGroup: (conversationId: string) => Promise<{ success: boolean; error?: string }>;
  addParticipant: (conversationId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  removeParticipant: (conversationId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin: (conversationId: string) => Promise<boolean>;
}

interface UseConversationsOptions {
  includeArchived?: boolean;
}

/**
 * Hook for managing user's conversations.
 * Provides CRUD operations and real-time updates.
 */
export function useConversations(
  options: UseConversationsOptions = {}
): UseConversationsReturn {
  const { includeArchived = false } = options;
  const { user } = useSupabaseAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchConversations(user.id, includeArchived);
      setConversations(data);
      setError(null);
    } catch (err) {
      // Silently handle errors when messaging tables don't exist yet
      // This prevents console spam during development
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        // Table doesn't exist - messaging feature not yet deployed
        setConversations([]);
        setError(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, includeArchived]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Use ref to avoid subscription churn when refresh callback changes
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Subscribe to real-time updates with surgical updates
  // Note: This subscription will silently fail if messaging tables don't exist yet
  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    const channel = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          // New conversation - need full data with participants, so refresh
          refreshRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          // Surgical update: only update the affected conversation
          const updated = payload.new as { id: string; name?: string | null; updated_at?: string };
          setConversations((prev) =>
            prev.map((item) =>
              item.conversation.id === updated.id
                ? {
                    ...item,
                    conversation: { ...item.conversation, ...updated },
                  }
                : item
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          // Surgical delete: remove the conversation from list
          const deleted = payload.old as { id: string };
          setConversations((prev) =>
            prev.filter((item) => item.conversation.id !== deleted.id)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh when our participation changes (join/leave/role change)
          refreshRef.current();
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
          // Surgical update: update only last_message for the affected conversation
          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            content: string | null;
            message_type: string;
            sender_id: string | null;
            created_at: string;
          };

          setConversations((prev) => {
            // Find the conversation and update its last_message
            const updatedList = prev.map((item) => {
              if (item.conversation.id !== newMessage.conversation_id) {
                return item;
              }

              // Create a message preview from the new message
              const lastMessage = {
                id: newMessage.id,
                content: newMessage.content,
                message_type: newMessage.message_type as 'text' | 'image' | 'voice' | 'location' | 'gear_reference' | 'gear_trade' | 'trip_invitation',
                sender_id: newMessage.sender_id,
                sender_name: null, // Will be populated on next full load
                created_at: newMessage.created_at,
              };

              return {
                ...item,
                last_message: lastMessage,
                // Increment unread if message is from someone else
                unread_count:
                  newMessage.sender_id !== user.id
                    ? item.unread_count + 1
                    : item.unread_count,
              };
            });

            // Sort by last message time (most recent first)
            return updatedList.sort((a, b) => {
              const aTime = a.last_message?.created_at || a.conversation.created_at;
              const bTime = b.last_message?.created_at || b.conversation.created_at;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Surgical update: handle message updates (e.g., deletion_state changes)
          const updatedMessage = payload.new as {
            id: string;
            conversation_id: string;
            content: string | null;
            message_type: string;
            sender_id: string | null;
            deletion_state: string | null;
            created_at: string;
          };

          setConversations((prev) =>
            prev.map((item) => {
              // Only update if this message is the last_message for this conversation
              if (
                item.conversation.id === updatedMessage.conversation_id &&
                item.last_message?.id === updatedMessage.id
              ) {
                // If message was deleted for all, clear the preview content
                if (updatedMessage.deletion_state === 'deleted_for_all') {
                  return {
                    ...item,
                    last_message: {
                      ...item.last_message,
                      content: null, // Clear content to indicate deletion
                    },
                  };
                }

                // Otherwise update the message preview with new data
                return {
                  ...item,
                  last_message: {
                    id: updatedMessage.id,
                    content: updatedMessage.content,
                    message_type: updatedMessage.message_type as 'text' | 'image' | 'voice' | 'location' | 'gear_reference' | 'gear_trade' | 'trip_invitation',
                    sender_id: updatedMessage.sender_id,
                    sender_name: item.last_message.sender_name,
                    created_at: updatedMessage.created_at,
                  },
                };
              }

              return item;
            })
          );
        }
      )
      .subscribe((status, err) => {
        // Silently handle subscription errors (e.g., tables don't exist)
        if (status === 'CHANNEL_ERROR' && err) {
          console.debug('[useConversations] Realtime subscription unavailable:', err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // Include includeArchived to recreate subscription when filter changes
  }, [user?.id, includeArchived]);

  const startDirectConversation = useCallback(
    async (
      recipientId: string
    ): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      try {
        // Check if we can message this user
        const canMessage = await canMessageUser(user.id, recipientId);
        if (!canMessage) {
          return { success: false, error: 'privacy_restricted' };
        }

        const conversationId = await getOrCreateDirectConversation(
          user.id,
          recipientId
        );
        await refresh();
        return { success: true, conversationId };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to start conversation',
        };
      }
    },
    [user?.id, refresh]
  );

  const createGroup = useCallback(
    async (
      name: string,
      participantIds: string[]
    ): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      if (participantIds.length === 0) {
        return { success: false, error: 'At least one participant required' };
      }

      if (participantIds.length > 49) {
        return { success: false, error: 'Maximum 50 participants allowed' };
      }

      try {
        const conversationId = await createGroupConversation(
          name,
          user.id,
          participantIds
        );
        await refresh();
        return { success: true, conversationId };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to create group',
        };
      }
    },
    [user?.id, refresh]
  );

  const muteConversation = useCallback(
    async (conversationId: string, muted: boolean) => {
      if (!user?.id) return;

      // Optimistic update
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation.id === conversationId ? { ...c, is_muted: muted } : c
        )
      );

      try {
        await toggleMute(conversationId, user.id, muted);
      } catch {
        // Revert on error
        refresh();
      }
    },
    [user?.id, refresh]
  );

  const archiveConversation = useCallback(
    async (conversationId: string, archived: boolean) => {
      if (!user?.id) return;

      // Optimistic update
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation.id === conversationId ? { ...c, is_archived: archived } : c
        )
      );

      try {
        await toggleArchive(conversationId, user.id, archived);
      } catch {
        // Revert on error
        refresh();
      }
    },
    [user?.id, refresh]
  );

  const leaveGroup = useCallback(
    async (conversationId: string): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      try {
        await leaveGroupConversation(conversationId, user.id);
        // Remove from local state
        setConversations((prev) =>
          prev.filter((c) => c.conversation.id !== conversationId)
        );
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to leave group',
        };
      }
    },
    [user?.id]
  );

  const addParticipant = useCallback(
    async (
      conversationId: string,
      userId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      try {
        await addGroupParticipant(conversationId, user.id, userId);
        await refresh();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to add participant',
        };
      }
    },
    [user?.id, refresh]
  );

  const removeParticipant = useCallback(
    async (
      conversationId: string,
      userId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      try {
        await removeGroupParticipant(conversationId, user.id, userId);
        await refresh();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to remove participant',
        };
      }
    },
    [user?.id, refresh]
  );

  const isAdmin = useCallback(
    async (conversationId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const role = await getUserRole(conversationId, user.id);
        return role === 'admin';
      } catch {
        return false;
      }
    },
    [user?.id]
  );

  return {
    conversations,
    isLoading,
    error,
    refresh,
    startDirectConversation,
    createGroup,
    muteConversation,
    archiveConversation,
    leaveGroup,
    addParticipant,
    removeParticipant,
    isAdmin,
  };
}
