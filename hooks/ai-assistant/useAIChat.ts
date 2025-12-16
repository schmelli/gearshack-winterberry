/**
 * useAIChat Hook
 * Feature 050: AI Assistant - T037
 *
 * Manages AI conversation state, message sending, and streaming responses.
 * Implements optimistic updates and error handling.
 */

'use client';

import { useState, useCallback } from 'react';
import { sendAIMessage } from '@/app/[locale]/ai-assistant/actions';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { logAIEvent } from '@/lib/ai-assistant/observability';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import type { UserContext } from '@/types/ai-assistant';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  inline_cards?: any[];
}

interface UseAIChatResult {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (content: string, conversationId: string | null) => Promise<string | null>;
  error: string | null;
  clearError: () => void;
}

export function useAIChat(): UseAIChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();
  const locale = useLocale();

  const sendMessage = useCallback(
    async (content: string, conversationId: string | null): Promise<string | null> => {
      if (!user) {
        setError('You must be logged in to use AI Assistant');
        return null;
      }

      setError(null);
      setIsStreaming(true);

      // Optimistic update: Add user message immediately
      const optimisticUserMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMessage]);

      try {
        const startTime = Date.now();

        // Build user context
        const context: UserContext = {
          screen: 'chat',
          locale,
          inventoryCount: 0, // TODO: Get actual count
          currentLoadoutId: undefined,
          userId: user.uid,
          subscriptionTier: 'trailblazer', // TODO: Get actual subscription tier
        };

        // Call Server Action
        const result = await sendAIMessage(conversationId, content, context);

        if (!result.success) {
          // Remove optimistic message on error
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== optimisticUserMessage.id)
          );
          setError(result.error);
          toast.error(result.error);
          logAIEvent('error', 'AI message send failed', {
            userId: user.uid,
            error: result.error,
            errorCode: result.errorCode,
          });
          return null;
        }

        const latency = Date.now() - startTime;

        // Replace optimistic message with real message from server
        // Note: We'll need to fetch the actual messages to get IDs
        setMessages((prev) => [
          ...prev.filter((msg) => msg.id !== optimisticUserMessage.id),
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content,
            created_at: new Date().toISOString(),
          },
          {
            id: result.messageId,
            role: 'assistant',
            content: result.response,
            created_at: new Date().toISOString(),
          },
        ]);

        logAIEvent('info', 'AI message sent successfully', {
          userId: user.uid,
          conversationId: conversationId || 'new',
          latency,
        });

        return conversationId; // Return existing or new conversation ID
      } catch (err) {
        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticUserMessage.id)
        );
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        toast.error(errorMessage);
        logAIEvent('error', 'AI message send exception', {
          userId: user.uid,
          error: errorMessage,
        });
        return null;
      } finally {
        setIsStreaming(false);
      }
    },
    [user, locale]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    error,
    clearError,
  };
}
