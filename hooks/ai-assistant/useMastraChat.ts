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
import { parseSSEStream, type SSEEvent, type ToolCallData, type WorkflowProgressData } from '@/lib/ai-assistant/stream-parser';
import type { ConfirmActionData } from '@/types/mastra';

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
  /** Pending confirmation actions (suspend/resume pattern) */
  pendingConfirmations?: ConfirmActionData[];
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
  /** Current workflow progress message (shown during pipeline phases) */
  progressMessage: string | null;
  /** Handle user response to a pending confirmation (suspend/resume) */
  resolveConfirmation: (runId: string, approved: boolean) => Promise<void>;
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
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  // Initialize conversationId from localStorage
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('gearshack:ai-conversation-id');
    } catch {
      return null;
    }
  });
  // Refs for tracking request state
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<{ text: string; options?: SendMessageOptions } | null>(null);
  // Ref for text debounce timeout cleanup on abort
  const textUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to track if history has been loaded for this conversation
  const historyLoadedRef = useRef<string | null>(null);

  // Auth context - uses cookie-based authentication
  const { user } = useAuthContext();

  /**
   * Load conversation history from database
   */
  const loadConversationHistory = useCallback(async (convId: string) => {
    if (!user || historyLoadedRef.current === convId) {
      return; // Already loaded or no user
    }

    try {
      const response = await fetch('/api/mastra/conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId }),
        credentials: 'include',
      });

      if (!response.ok) {
        // If the stored conversation ID is invalid or unauthorized, clear it so
        // the user starts a fresh conversation on the next interaction.
        if (response.status === 404 || response.status === 401) {
          try {
            localStorage.removeItem('gearshack:ai-conversation-id');
          } catch {
            // Silently fail if localStorage unavailable
          }
          setConversationId(null);
          historyLoadedRef.current = null;
        }
        throw new Error('Failed to load conversation history');
      }

      const data = await response.json();
      const validRoles = ['user', 'assistant'] as const;
      const historyMessages: MastraMessage[] = data.messages.map((msg: { id: string; role: string; content: string; created_at: string }) => ({
        id: msg.id,
        role: validRoles.includes(msg.role as 'user' | 'assistant')
          ? (msg.role as 'user' | 'assistant')
          : 'assistant',
        content: msg.content,
        createdAt: msg.created_at,
      }));

      setMessages(historyMessages);
      historyLoadedRef.current = convId;
      logAIEvent('info', 'Conversation history loaded', {
        userId: user.uid,
        conversationId: convId,
        messageCount: historyMessages.length,
      });
    } catch (err) {
      logAIEvent('error', 'Failed to load conversation history', {
        userId: user.uid,
        conversationId: convId,
        error: err instanceof Error ? err.message : 'Unknown',
      });
      // Don't show error to user - just start fresh conversation
    }
  }, [user]);

  /**
   * Abort any in-flight request
   */
  const abort = useCallback(() => {
    // Clean up any pending text update timeout
    if (textUpdateTimeoutRef.current) {
      clearTimeout(textUpdateTimeoutRef.current);
      textUpdateTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState('idle');
      setProgressMessage(null);
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
          message: t('errors.authRequired'),
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
          message: t('errors.messageTooLong'),
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

      // Clear previous error and progress
      setError(null);
      setProgressMessage(null);

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
          // Persist to localStorage
          try {
            localStorage.setItem('gearshack:ai-conversation-id', responseConversationId);
          } catch {
            // Silently fail if localStorage unavailable
          }
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
              // Clear progress message once actual content starts flowing
              setProgressMessage(null);
              fullContent += text;
              textUpdateBuffer += text;

              // Debounce text updates - use ref for cleanup on abort
              if (textUpdateTimeoutRef.current) {
                clearTimeout(textUpdateTimeoutRef.current);
              }
              textUpdateTimeoutRef.current = setTimeout(flushTextUpdates, DEBOUNCE_MS);
            },
            (toolCall) => {
              // Flush pending text updates before adding tool call
              if (textUpdateTimeoutRef.current) {
                clearTimeout(textUpdateTimeoutRef.current);
                textUpdateTimeoutRef.current = null;
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
            },
            (progress) => {
              setProgressMessage(progress);
            },
            (confirmation) => {
              // Handle confirm_action events (suspend/resume pattern)
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        pendingConfirmations: [
                          ...(msg.pendingConfirmations || []),
                          confirmation,
                        ],
                      }
                    : msg
                )
              );
            }
          );
        }

        // Flush any remaining text updates
        if (textUpdateTimeoutRef.current) {
          clearTimeout(textUpdateTimeoutRef.current);
          textUpdateTimeoutRef.current = null;
        }
        flushTextUpdates();

        const latency = Date.now() - startTime;

        // Transition to success state
        setProgressMessage(null);
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
    // t is excluded intentionally - translation function reference stays stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    historyLoadedRef.current = null;
    // Clear from localStorage
    try {
      localStorage.removeItem('gearshack:ai-conversation-id');
    } catch {
      // Silently fail if localStorage unavailable
    }
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

  /**
   * Resolve a pending confirmation (suspend/resume workflow)
   * Calls the resume API endpoint and updates message state
   */
  const resolveConfirmation = useCallback(
    async (runId: string, approved: boolean): Promise<void> => {
      try {
        const response = await fetch('/api/mastra/workflows/add-gear/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId, approved }),
          credentials: 'include',
        });

        const result = await response.json();

        if (!response.ok) {
          // Throw so callers can keep the confirmation card visible/retryable
          throw new Error(result.error || t('confirmAction.errorApprove'));
        }

        // Remove the resolved confirmation from message state so the card unmounts
        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.pendingConfirmations?.some((c) => c.runId === runId)) return msg;
            return {
              ...msg,
              pendingConfirmations: msg.pendingConfirmations.filter(
                (c) => c.runId !== runId
              ),
            };
          })
        );

        // Map structured result codes to i18n messages instead of using API strings
        if (result.resultCode === 'ADD_TO_LOADOUT_CANCELLED') {
          toast.info(t('confirmAction.cancelled', {
            gearItemName: result.details?.gearItemName ?? '',
            loadoutName: result.details?.loadoutName ?? '',
          }));
        } else if (result.success && result.resultCode === 'ADD_TO_LOADOUT_SUCCESS') {
          toast.success(t('confirmAction.success', {
            gearItemName: result.details?.gearItemName ?? '',
            loadoutName: result.details?.loadoutName ?? '',
          }));
        } else {
          throw new Error(result.error || t('confirmAction.errorApprove'));
        }
      } catch (err) {
        // Re-throw so the ConfirmAddToLoadout component can show an error toast
        // and keep the card visible for retry
        throw err instanceof Error ? err : new Error(t('confirmAction.errorApprove'));
      }
    },
    // t is stable (next-intl), setMessages is stable (useState setter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setMessages, t]
  );

  // Load conversation history on mount if conversationId exists.
  // Guard with state === 'idle' to prevent overwriting optimistic message updates
  // if the user sends a message before history finishes loading.
  useEffect(() => {
    if (conversationId && user && historyLoadedRef.current !== conversationId && state === 'idle') {
      loadConversationHistory(conversationId);
    }
  }, [conversationId, user, loadConversationHistory, state]);

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
    progressMessage,
    resolveConfirmation,
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
  onMemoryUpdate: (update: MemoryUpdate) => void,
  onProgress?: (message: string) => void,
  onConfirmAction?: (confirmation: ConfirmActionData) => void
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

    case 'workflow_progress':
      if (typeof event.data === 'object' && 'message' in event.data) {
        const progressData = event.data as WorkflowProgressData;
        onProgress?.(progressData.message);
      }
      break;

    case 'confirm_action':
      // Suspend/resume pattern: workflow suspended, needs user confirmation
      if (typeof event.data === 'object' && 'runId' in event.data) {
        onConfirmAction?.(event.data as ConfirmActionData);
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
