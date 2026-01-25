/**
 * useMessageSearch - Message Search Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T057
 *
 * Hook for searching messages across conversations.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { MessageSearchResult } from '@/types/messaging';

interface UseMessageSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: MessageSearchResult[];
  isSearching: boolean;
  error: string | null;
  searchInConversation: (conversationId: string) => void;
  clearSearch: () => void;
}

/**
 * Hook for searching messages across all conversations or within a specific one.
 * Supports debounced search with abort controller for cancelled requests.
 */
export function useMessageSearch(): UseMessageSearchReturn {
  const { user } = useSupabaseAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationFilter, setConversationFilter] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string, conversationId: string | null) => {
      if (!user || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        setIsSearching(true);
        setError(null);

        const supabase = createClient();

        // SECURITY: Sanitize search query for ILIKE to prevent SQL injection
        // Escape PostgreSQL LIKE special characters: % _ \
        const sanitizedQuery = searchQuery
          .replace(/\\/g, '\\\\') // Escape backslash first
          .replace(/%/g, '\\%')   // Escape percent wildcard
          .replace(/_/g, '\\_');  // Escape underscore wildcard

        // Build query
        let queryBuilder = (supabase as ReturnType<typeof createClient>)
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            conversation_id,
            conversations!inner (
              id,
              name,
              type
            )
          `)
          .ilike('content', `%${sanitizedQuery}%`)
          .eq('deletion_state', 'active')
          .not('content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);

        // Filter by conversation if specified
        if (conversationId) {
          queryBuilder = queryBuilder.eq('conversation_id', conversationId);
        }

        const { data, error: searchError } = await queryBuilder;

        if (searchError) {
          throw searchError;
        }

        // Transform results
        const searchResults: MessageSearchResult[] = (data || []).map((row: {
          id: string;
          content: string | null;
          created_at: string;
          conversation_id: string;
          conversations: {
            id: string;
            name: string | null;
            type: string;
          };
        }) => {
          // Create highlight with context
          const content = row.content || '';
          const queryLower = searchQuery.toLowerCase();
          const contentLower = content.toLowerCase();
          const index = contentLower.indexOf(queryLower);

          let highlight = content;
          if (index !== -1) {
            const start = Math.max(0, index - 30);
            const end = Math.min(content.length, index + searchQuery.length + 30);
            highlight =
              (start > 0 ? '...' : '') +
              content.slice(start, end) +
              (end < content.length ? '...' : '');
          }

          return {
            message: {
              id: row.id,
              content: row.content,
              created_at: row.created_at,
            },
            conversation: {
              id: row.conversations.id,
              name: row.conversations.name,
              type: row.conversations.type as 'direct' | 'group',
            },
            highlight,
          };
        });

        setResults(searchResults);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        setIsSearching(false);
      }
    },
    [user]
  );

  // Use ref to access performSearch without causing effect re-runs
  const performSearchRef = useRef(performSearch);
  performSearchRef.current = performSearch;

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearchRef.current(query, conversationFilter);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, conversationFilter]); // Remove performSearch - use ref instead

  const searchInConversation = useCallback((conversationId: string) => {
    setConversationFilter(conversationId);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setConversationFilter(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    searchInConversation,
    clearSearch,
  };
}
