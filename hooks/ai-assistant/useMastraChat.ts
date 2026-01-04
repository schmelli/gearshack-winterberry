/**
 * useMastraChat Hook
 * Feature 001: Mastra Agentic Voice - T025 [US1]
 *
 * Custom hook for managing chat state with Mastra agent.
 * Implements state machine: idle -> loading -> streaming -> success/error
 *
 * Architecture: Feature-Sliced Light
 * - All business logic encapsulated in this hook
 * - UI components remain stateless, receiving data via props
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { logAIEvent } from '@/lib/ai-assistant/observability';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { parseSSEStream, type SSEEvent, type ToolCallData } from '@/lib/ai-assistant/stream-parser';

// =====================================================
// Types
// =====================================================

/**
 * Chat state machine states
 * idle: No active operation
 * loading: Request sent, waiting for first response
 * streaming: Receiving SSE chunks
 * success: Stream completed successfully
 * error: An error occurred
 */
export type ChatState = 'idle' | 'loading' | 'streaming' | 'success' | 'error';

/**
 * Message structure for Mastra chat
 */
export interface MastraMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  toolCalls?: ToolCallData[];
  memoryUpdates?: MemoryUpdate[];
}

/**
 * Memory update event from Mastra
 */
export interface MemoryUpdate {
  action: 'stored' | 'updated' | 'deleted';
  fact: string;
}

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  includeMemory?: boolean;
  maxTokens?: number;
  context?: Record<string, unknown>;
}

/**
 * Error structure with optional retry info
 */
export interface ChatError {
  message: string;
  code?: string;
  retryable: boolean;
  retryAfter?: number; // seconds until retry allowed (for rate limits)
}

/**
 * Hook return type
 */
export interface UseMastraChatResult {
  /** Current conversation messages */
  messages: MastraMessage[];
  /** Current state machine state */
  state: ChatState;
  /** Error details if state is 'error' */
  error: ChatError | null;
  /** Send a new message */
  sendMessage: (text: string, options?: SendMessageOptions) => Promise<void>;
  /** Reset conversation (clear messages and state) */
  resetConversation: () => void;
  /** Retry the last failed message */
  retryLastMessage: () => Promise<void>;
  /** Convenience: true if state is 'loading' */
  isLoading: boolean;
  /** Convenience: true if state is 'streaming' */
  isStreaming: boolean;
  /** Current conversation ID */
  conversationId: string | null;
  /** Abort current streaming request */
  abort: () => void;
}

// =====================================================
// Constants
// =====================================================

/** Chat API endpoint - configurable via NEXT_PUBLIC_MASTRA_API_URL */
const API_ENDPOINT = process.env.NEXT_PUBLIC_MASTRA_API_URL || '/api/mastra/chat';
const DEFAULT_MAX_TOKENS = 2000;

// =====================================================
// Hook Implementation
// =====================================================

export function useMastraChat(): UseMastraChatResult {
  const t = useTranslations('AIChat');

  // State
  const [messages, setMessages] = useState<MastraMessage[]>([]);
  const [state, setState] = useState<ChatState>('idle');
  const [error, setError] = useState<ChatError | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Refs for tracking request state
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<{ text: string; options?: SendMessageOptions } | null>(null);

  // Auth context - uses cookie-based authentication
  const { user } = useAuthContext();

  /**
   * Abort any in-flight request
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState('idle');
      logAIEvent('info', 'Chat request aborted by user');
    }
  }, []);

  /**
   * Send a message to the Mastra agent
   */
  const sendMessage = useCallback(
    async (text: string, options?: SendMessageOptions): Promise<void> => {
      // Validate auth - cookie-based auth, just check user exists
      if (!user) {
        const authError: ChatError = {
          message: 'Authentication required. Please sign in to use the AI assistant.',
          code: 'AUTH_REQUIRED',
          retryable: false,
        };
        setError(authError);
        setState('error');
        toast.error(authError.message);
        return;
      }

      // Validate input
      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }

      if (trimmedText.length > 10000) {
        const validationError: ChatError = {
          message: 'Message too long. Maximum length is 10,000 characters.',
          code: 'VALIDATION_ERROR',
          retryable: false,
        };
        setError(validationError);
        setState('error');
        toast.error(validationError.message);
        return;
      }

      // Store for retry
      lastMessageRef.current = { text: trimmedText, options };

      // Abort any existing request
      abort();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Clear previous error
      setError(null);

      // Transition to loading state
      setState('loading');

      // Optimistic update: add user message immediately
      const userMessageId = `user-${Date.now()}`;
      const userMessage: MastraMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmedText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Create placeholder for assistant response
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: MastraMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        toolCalls: [],
        memoryUpdates: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const startTime = Date.now();

      try {
        // Build request body
        const requestBody = {
          message: trimmedText,
          conversationId,
          context: options?.context,
          enableTools: true, // CRITICAL: Enable tool calling (queryUserData, searchCatalog, etc.)
          options: {
            stream: true,
            includeMemory: options?.includeMemory ?? true,
            maxTokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
          },
        };

        logAIEvent('info', 'Sending message to Mastra agent', {
          userId: user.uid,
          conversationId,
          messageLength: trimmedText.length,
          enableTools: requestBody.enableTools,
        });

        // Make streaming request - uses cookie-based auth (credentials: 'include')
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          credentials: 'include', // Include cookies for Supabase auth
          signal: abortControllerRef.current.signal,
        });

        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new MastraChatError(
            errorData.message || `Request failed with status ${response.status}`,
            response.status === 429 ? 'RATE_LIMIT' : 'HTTP_ERROR',
            response.status >= 500 || response.status === 429,
            errorData.retryAfter
          );
        }

        // Ensure we have a response body
        if (!response.body) {
          throw new MastraChatError('No response body received', 'EMPTY_RESPONSE', true);
        }

        // Update conversation ID from response header if new
        const responseConversationId = response.headers.get('X-Conversation-Id');
        if (responseConversationId && !conversationId) {
          setConversationId(responseConversationId);
        }

        // Transition to streaming state
        setState('streaming');

        // Process SSE stream
        const toolCalls: ToolCallData[] = [];
        const memoryUpdates: MemoryUpdate[] = [];
        let fullContent = '';

        // Performance optimization: Debounce text updates to reduce re-renders
        // For long responses (1000+ tokens), this prevents 100+ state updates
        let textUpdateBuffer = '';
        let textUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
        const DEBOUNCE_MS = 100; // Update UI every 100ms max

        const flushTextUpdates = () => {
          if (textUpdateBuffer.length > 0) {
            const bufferedText = textUpdateBuffer;
            textUpdateBuffer = '';
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + bufferedText }
                  : msg
              )
            );
          }
        };

        for await (const event of parseSSEStream(response.body)) {
          await processStreamEvent(
            event,
            assistantMessageId,
            (text) => {
              fullContent += text;
              textUpdateBuffer += text;

              // Debounce text updates
              if (textUpdateTimeout) {
                clearTimeout(textUpdateTimeout);
              }
              textUpdateTimeout = setTimeout(flushTextUpdates, DEBOUNCE_MS);
            },
            (toolCall) => {
              // Flush pending text updates before adding tool call
              if (textUpdateTimeout) {
                clearTimeout(textUpdateTimeout);
                flushTextUpdates();
              }

              toolCalls.push(toolCall);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, toolCalls: [...(msg.toolCalls || []), toolCall] }
                    : msg
                )
              );
            },
            (memoryUpdate) => {
              memoryUpdates.push(memoryUpdate);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, memoryUpdates: [...(msg.memoryUpdates || []), memoryUpdate] }
                    : msg
                )
              );
            }
          );
        }

        // Flush any remaining text updates
        if (textUpdateTimeout) {
          clearTimeout(textUpdateTimeout);
        }
        flushTextUpdates();

        const latency = Date.now() - startTime;

        // Transition to success state
        setState('success');

        logAIEvent('info', 'Mastra chat response completed', {
          userId: user.uid,
          conversationId,
          latencyMs: latency,
          contentLength: fullContent.length,
          toolCallCount: toolCalls.length,
          memoryUpdateCount: memoryUpdates.length,
        });

        // Clear retry tracking on success
        lastMessageRef.current = null;
      } catch (err) {
        // Handle abort
        if (err instanceof Error && err.name === 'AbortError') {
          // Remove placeholder messages on abort
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
          setState('idle');
          return;
        }

        // Remove placeholder on error
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));

        // Build error object
        const chatError: ChatError = err instanceof MastraChatError
          ? {
              message: err.message,
              code: err.code,
              retryable: err.retryable,
              retryAfter: err.retryAfter,
            }
          : {
              message: err instanceof Error ? err.message : 'An unexpected error occurred',
              retryable: true,
            };

        setError(chatError);
        setState('error');

        logAIEvent('error', 'Mastra chat error', {
          userId: user?.uid,
          conversationId,
          error: chatError.message,
          code: chatError.code,
        });

        toast.error(chatError.message);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [user, conversationId, abort]
  );

  /**
   * Reset conversation - clears all messages and state
   */
  const resetConversation = useCallback(() => {
    abort();
    setMessages([]);
    setState('idle');
    setError(null);
    setConversationId(null);
    lastMessageRef.current = null;
    logAIEvent('info', 'Conversation reset');
  }, [abort]);

  /**
   * Retry the last failed message
   */
  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current) {
      toast.error(t('noMessageToRetry'));
      return;
    }

    const { text, options } = lastMessageRef.current;
    await sendMessage(text, options);
  }, [sendMessage, t]);

  // Cleanup on unmount - CRITICAL for preventing memory leaks
  // Aborts in-flight requests when component unmounts
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return {
    messages,
    state,
    error,
    sendMessage,
    resetConversation,
    retryLastMessage,
    isLoading: state === 'loading',
    isStreaming: state === 'streaming',
    conversationId,
    abort,
  };
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Process a single SSE event from the stream
 */
async function processStreamEvent(
  event: SSEEvent,
  messageId: string,
  onText: (text: string) => void,
  onToolCall: (toolCall: ToolCallData) => void,
  onMemoryUpdate: (update: MemoryUpdate) => void
): Promise<void> {
  switch (event.type) {
    case 'text':
      if (typeof event.data === 'string') {
        onText(event.data);
      }
      break;

    case 'tool_call':
      if (typeof event.data === 'object' && 'toolName' in event.data) {
        onToolCall(event.data as ToolCallData);
      }
      break;

    case 'done':
      // Stream complete - nothing to do, state transition handled in main flow
      break;

    case 'error':
      if (typeof event.data === 'object' && 'message' in event.data) {
        const errorData = event.data as { message: string; code?: string };
        throw new MastraChatError(errorData.message, errorData.code, true);
      }
      break;

    default:
      // Handle memory_update events (custom Mastra event type)
      // The stream-parser may pass through unknown event types
      if ((event as { type: string }).type === 'memory_update') {
        // Safely parse memory update data with proper type guards
        const rawData = event.data;
        if (
          typeof rawData === 'object' &&
          rawData !== null &&
          'action' in rawData &&
          'fact' in rawData
        ) {
          const data = rawData as Record<string, unknown>;
          const action = data.action;
          const fact = data.fact;
          if (
            typeof action === 'string' &&
            typeof fact === 'string' &&
            (action === 'stored' || action === 'updated' || action === 'deleted')
          ) {
            onMemoryUpdate({ action, fact });
          }
        }
      }
  }
}

// =====================================================
// Custom Error Class
// =====================================================

/**
 * Custom error for Mastra chat operations
 */
class MastraChatError extends Error {
  code?: string;
  retryable: boolean;
  retryAfter?: number;

  constructor(
    message: string,
    code?: string,
    retryable: boolean = true,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'MastraChatError';
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}
