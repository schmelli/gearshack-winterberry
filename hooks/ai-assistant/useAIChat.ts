/**
 * useAIChat Hook
 * Feature 050: AI Assistant - T037
 *
 * Manages AI conversation state, message sending, and streaming responses.
 * Implements optimistic updates and error handling.
 *
 * IMPORTANT: This hook uses the streaming API endpoint which does NOT support
 * tool calling (actions). For features requiring tool execution like adding
 * items to wishlist or sending messages, use the Server Action instead.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, conversationId: string | null): Promise<string | null> => {
      console.log('sendMessage called:', { content, conversationId, userId: user?.uid });

      if (!user) {
        setError('You must be logged in to use AI Assistant');
        toast.error('You must be logged in to use AI Assistant');
        return null;
      }

      setError(null);
      setIsStreaming(true);

      // Optimistic update: Add user message immediately
      const optimisticUserMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMessage]);

      // Create a placeholder for the AI response
      const aiMessageId = `assistant-${Date.now()}`;
      const aiMessage: Message = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

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

        console.log('Sending message to API:', { context, message: content });

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Call streaming API endpoint
        const response = await fetch('/api/ai-assistant/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            message: content,
            context,
          }),
          signal: abortControllerRef.current.signal,
        });

        console.log('API response received:', { status: response.status, ok: response.ok });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
          console.error('AI API error:', { status: response.status, error: errorMessage });
          throw new Error(errorMessage);
        }

        // Check if response body exists
        if (!response.body) {
          throw new Error('No response body');
        }

        // Read streaming response
        console.log('Starting to read stream...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('Stream complete. Total chunks:', chunkCount, 'Total length:', accumulatedText.length);
            break;
          }

          chunkCount++;
          // Decode chunk and accumulate
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          if (chunkCount === 1) {
            console.log('First chunk received:', chunk.substring(0, 50));
          }

          // Update the AI message with accumulated text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, content: accumulatedText } : msg
            )
          );
        }

        const latency = Date.now() - startTime;

        console.log('Stream finished successfully:', { latency, messageLength: accumulatedText.length });

        logAIEvent('info', 'AI message streamed successfully', {
          userId: user.uid,
          conversationId: conversationId || 'new',
          latency,
          messageLength: accumulatedText.length,
        });

        return conversationId;
      } catch (err) {
        // Remove AI message placeholder on error
        setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));

        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';

        // Don't show error if it was aborted intentionally
        if (errorMessage !== 'The user aborted a request.') {
          setError(errorMessage);
          toast.error(errorMessage);
          logAIEvent('error', 'AI streaming error', {
            userId: user.uid,
            error: errorMessage,
          });
        }

        return null;
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
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
