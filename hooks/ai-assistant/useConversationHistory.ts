/**
 * useConversationHistory Hook
 * Feature 050: AI Assistant - T038, T050
 *
 * Manages conversation history persistence with Supabase.
 * Fetches messages on modal open, handles pagination, enforces 90-day retention.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logAIEvent } from '@/lib/ai-assistant/observability';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  gear_references?: Array<{ id: string; name: string; brand?: string }>;
}

interface UseConversationHistoryResult {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const MESSAGES_PER_PAGE = 50;
const RETENTION_DAYS = 90;

export function useConversationHistory(
  conversationId: string | null
): UseConversationHistoryResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const supabase = createClient();

  // Fetch messages for conversation
  const fetchMessages = useCallback(
    async (loadOffset = 0, append = false) => {
      if (!conversationId) {
        setMessages([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Calculate retention cutoff date
        const retentionCutoff = new Date();
        retentionCutoff.setDate(retentionCutoff.getDate() - RETENTION_DAYS);

        const { data, error: fetchError, count } = await supabase
          .from('ai_messages')
          .select('id, role, content, created_at, inline_cards', { count: 'exact' })
          .eq('conversation_id', conversationId)
          .gte('created_at', retentionCutoff.toISOString())
          .order('created_at', { ascending: true })
          .range(loadOffset, loadOffset + MESSAGES_PER_PAGE - 1);

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          setMessages([]);
          setHasMore(false);
          return;
        }

        // Transform messages
        const transformedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          created_at: msg.created_at,
          gear_references: (msg.inline_cards as Array<{ id: string; name: string; brand?: string }>) || undefined,
        }));

        if (append) {
          setMessages((prev) => [...prev, ...transformedMessages]);
        } else {
          setMessages(transformedMessages);
        }

        // Check if there are more messages
        const totalCount = count || 0;
        setHasMore(loadOffset + MESSAGES_PER_PAGE < totalCount);
        setOffset(loadOffset + MESSAGES_PER_PAGE);

        logAIEvent('info', 'Conversation history loaded', {
          conversationId,
          messageCount: transformedMessages.length,
          hasMore: loadOffset + MESSAGES_PER_PAGE < totalCount,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation history';
        setError(errorMessage);
        logAIEvent('error', 'Failed to load conversation history', {
          conversationId,
          error: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, supabase]
  );

  // Load initial messages when conversation changes
  useEffect(() => {
    setOffset(0);
    fetchMessages(0, false);
  }, [conversationId, fetchMessages]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchMessages(offset, true);
  }, [hasMore, isLoading, offset, fetchMessages]);

  return {
    messages,
    isLoading,
    error,
    loadMore,
    hasMore,
  };
}
