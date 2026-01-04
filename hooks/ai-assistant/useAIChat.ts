/**
 * useAIChat Hook
 * Feature 050: AI Assistant - Agentic Features Enabled
 *
 * Manages AI conversation state, message sending, and streaming responses.
 * Implements optimistic updates, tool calling, and error handling.
 *
 * Phase 1-4 Features:
 * - Streaming responses with word-by-word display
 * - Tool calling (all 11 tools available)
 * - Multi-step orchestration for complex queries
 * - Web search grounding (when enabled)
 * - Autonomous reasoning and self-correction
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { sendAIMessage } from '@/app/[locale]/ai-assistant/actions';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { logAIEvent } from '@/lib/ai-assistant/observability';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { useItems } from '@/hooks/useSupabaseStore';
import type { UserContext } from '@/types/ai-assistant';
import { processSSEStream, type ToolCallData } from '@/lib/ai-assistant/stream-parser';

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
  const t = useTranslations('AIChat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();
  const locale = useLocale();
  const items = useItems();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, conversationId: string | null): Promise<string | null> => {
      console.log('sendMessage called:', { content, conversationId, userId: user?.uid });

      if (!user) {
        setError(t('loginRequired'));
        toast.error(t('loginRequired'));
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
          inventoryCount: items.length,
          currentLoadoutId: undefined,
          userId: user.uid,
          subscriptionTier: 'trailblazer', // TODO: Get actual subscription tier
        };

        console.log('Sending message to API:', { context, message: content });

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Call streaming API endpoint with tools enabled (Phase 1-4)
        const response = await fetch('/api/ai-assistant/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            message: content,
            context,
            enableTools: true, // Enable agentic features (all 11 tools + orchestration)
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

        // Process SSE stream with tool support
        console.log('Starting to process SSE stream...');
        const toolCalls: ToolCallData[] = [];

        const result = await processSSEStream(
          response.body,
          // onTextChunk: Update message content in real-time
          (text: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? { ...msg, content: msg.content + text }
                  : msg
              )
            );
          },
          // onToolCall: Capture tool calls for potential inline cards
          (toolCall: ToolCallData) => {
            toolCalls.push(toolCall);
            console.log('Tool called:', toolCall.toolName, toolCall.args);
          }
        );

        const latency = Date.now() - startTime;

        console.log('Stream finished successfully:', {
          latency,
          messageLength: result.content.length,
          toolCalls: result.toolCalls.length,
          finishReason: result.metadata.finishReason,
        });

        // Update final message with tool calls if any
        if (result.toolCalls.length > 0) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, inline_cards: result.toolCalls }
                : msg
            )
          );
        }

        logAIEvent('info', 'AI message streamed successfully', {
          userId: user.uid,
          conversationId: conversationId || 'new',
          latency,
          messageLength: result.content.length,
          toolCallsExecuted: result.toolCalls.length,
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
    [user, locale, items, t]
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
