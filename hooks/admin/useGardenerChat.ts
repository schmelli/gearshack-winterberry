'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  GardenerChatMessage,
  GardenerSystemStatus,
  GardenerSSEEvent,
  UseGardenerChatReturn,
} from '@/types/gardener';

// Use local API proxy to avoid CORS issues and keep credentials secure
const GARDENER_BASE_URL = '/api/gardener';
const STATUS_POLL_INTERVAL = 30000; // 30 seconds

/**
 * Custom hook for interacting with the Graph Gardener AI chat API.
 * Handles SSE streaming, message history, and system status polling.
 */
export function useGardenerChat(): UseGardenerChatReturn {
  const [messages, setMessages] = useState<GardenerChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [systemStatus, setSystemStatus] = useState<GardenerSystemStatus | null>(null);

  // Ref to track current streaming content for building assistant message
  const streamingContentRef = useRef<string>('');
  // Ref for abort controller to cancel ongoing requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch system status from the Gardener API.
   * No auth required for this endpoint.
   */
  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch(`${GARDENER_BASE_URL}/status`);
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      const data: GardenerSystemStatus = await response.json();
      setSystemStatus(data);
    } catch (err) {
      console.error('Failed to fetch Gardener system status:', err);
      // Don't set error state for status polling failures - non-critical
    }
  }, []);

  /**
   * Fetch conversation history from the Gardener API.
   */
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`${GARDENER_BASE_URL}/chat`);
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }
      const data = await response.json();
      setMessages(data.history || []);
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    }
  }, []);

  /**
   * Clear conversation history on the server.
   */
  const clearHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${GARDENER_BASE_URL}/chat`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to clear history: ${response.status}`);
      }
      setMessages([]);
      setSuggestions([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear history';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Parse SSE line and return event data if valid.
   */
  const parseSSELine = (line: string): GardenerSSEEvent | null => {
    if (!line.startsWith('data: ')) return null;
    try {
      return JSON.parse(line.substring(6)) as GardenerSSEEvent;
    } catch {
      console.warn('Failed to parse SSE line:', line);
      return null;
    }
  };

  /**
   * Send a message to the Gardener AI and stream the response.
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isStreaming) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setError(null);
    setIsStreaming(true);
    streamingContentRef.current = '';

    // Add user message immediately
    const userMessage: GardenerChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for assistant message
    const assistantPlaceholder: GardenerChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const response = await fetch(`${GARDENER_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          streamResponse: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let receivedSuggestions: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          const event = parseSSELine(trimmedLine);
          if (!event) continue;

          switch (event.type) {
            case 'chunk':
              if (event.content) {
                streamingContentRef.current += event.content;
                // Update the last message (assistant placeholder) with accumulated content
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: streamingContentRef.current,
                    };
                  }
                  return updated;
                });
              }
              break;

            case 'tools':
              // Update assistant message with tool calls
              if (event.toolCalls) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      toolCalls: event.toolCalls,
                    };
                  }
                  return updated;
                });
              }
              break;

            case 'suggestions':
              if (event.suggestions) {
                receivedSuggestions = event.suggestions;
              }
              break;

            case 'done':
              // Finalize the assistant message
              setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                  updated[lastIndex] = {
                    ...updated[lastIndex],
                    content: streamingContentRef.current,
                    suggestions: receivedSuggestions,
                    timestamp: event.timestamp || new Date().toISOString(),
                  };
                }
                return updated;
              });
              setSuggestions(receivedSuggestions);
              break;

            case 'start':
              // Stream started - no action needed
              break;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't treat as error
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      // Remove the placeholder assistant message on error
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming]);

  /**
   * Select a suggestion and send it as the next message.
   */
  const selectSuggestion = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [sendMessage]);

  // Initial load: fetch history and status
  useEffect(() => {
    fetchHistory();
    refreshStatus();
  }, [fetchHistory, refreshStatus]);

  // Poll system status periodically
  useEffect(() => {
    const intervalId = setInterval(refreshStatus, STATUS_POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [refreshStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isStreaming,
    isLoading,
    error,
    suggestions,
    systemStatus,
    sendMessage,
    clearHistory,
    refreshStatus,
    selectSuggestion,
  };
}
