'use client';

/**
 * Main Bulletin Board Hook
 *
 * Feature: 051-community-bulletin-board
 * Task: T023
 *
 * Manages the main board state including posts, pagination,
 * loading states, and error handling.
 */

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchBulletinPosts } from '@/lib/supabase/bulletin-queries';
import type {
  BulletinPostWithAuthor,
  PostTag,
  BoardState,
  BoardLoadingState,
} from '@/types/bulletin';
import { BULLETIN_CONSTANTS } from '@/types/bulletin';

interface UseBulletinBoardReturn {
  // State
  posts: BulletinPostWithAuthor[];
  hasMore: boolean;
  loadingState: BoardLoadingState;
  error: string | null;
  activeTag: PostTag | null;
  searchQuery: string;

  // Actions
  loadPosts: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  setActiveTag: (tag: PostTag | null) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  // Mutations
  addPostOptimistically: (post: BulletinPostWithAuthor) => void;
  removePost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<BulletinPostWithAuthor>) => void;
}

export function useBulletinBoard(): UseBulletinBoardReturn {
  const supabase = createClient();

  // Board state
  const [state, setState] = useState<BoardState>({
    posts: [],
    hasMore: true,
    nextCursor: null,
    loadingState: 'idle',
    error: null,
    activeTag: null,
    searchQuery: '',
  });

  /**
   * Load initial posts
   */
  const loadPosts = useCallback(async () => {
    setState((prev) => ({ ...prev, loadingState: 'loading', error: null }));

    try {
      const result = await fetchBulletinPosts(supabase, {
        tag: state.activeTag ?? undefined,
        search: state.searchQuery || undefined,
        limit: BULLETIN_CONSTANTS.POSTS_PER_PAGE,
      });

      setState((prev) => ({
        ...prev,
        posts: result.posts,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load posts';
      setState((prev) => ({
        ...prev,
        loadingState: 'error',
        error: message,
      }));
    }
  }, [supabase, state.activeTag, state.searchQuery]);

  /**
   * Load more posts (infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (state.loadingState !== 'idle' || !state.hasMore || !state.nextCursor) {
      return;
    }

    setState((prev) => ({ ...prev, loadingState: 'loading-more' }));

    try {
      const result = await fetchBulletinPosts(supabase, {
        tag: state.activeTag ?? undefined,
        search: state.searchQuery || undefined,
        cursor: state.nextCursor,
        limit: BULLETIN_CONSTANTS.POSTS_PER_PAGE,
      });

      setState((prev) => ({
        ...prev,
        posts: [...prev.posts, ...result.posts],
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load more posts';
      setState((prev) => ({
        ...prev,
        loadingState: 'error',
        error: message,
      }));
    }
  }, [
    supabase,
    state.loadingState,
    state.hasMore,
    state.nextCursor,
    state.activeTag,
    state.searchQuery,
  ]);

  /**
   * Refresh posts (pull to refresh)
   */
  const refreshPosts = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      posts: [],
      nextCursor: null,
      hasMore: true,
    }));
    await loadPosts();
  }, [loadPosts]);

  /**
   * Set active tag filter
   */
  const setActiveTag = useCallback((tag: PostTag | null) => {
    setState((prev) => ({
      ...prev,
      activeTag: tag,
      posts: [],
      nextCursor: null,
      hasMore: true,
    }));
  }, []);

  /**
   * Set search query
   */
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: query,
      posts: [],
      nextCursor: null,
      hasMore: true,
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTag: null,
      searchQuery: '',
      posts: [],
      nextCursor: null,
      hasMore: true,
    }));
  }, []);

  /**
   * Add a post optimistically (for immediate UI feedback)
   */
  const addPostOptimistically = useCallback(
    (post: BulletinPostWithAuthor) => {
      setState((prev) => ({
        ...prev,
        posts: [post, ...prev.posts],
      }));
    },
    []
  );

  /**
   * Remove a post from the list
   */
  const removePost = useCallback((postId: string) => {
    setState((prev) => ({
      ...prev,
      posts: prev.posts.filter((p) => p.id !== postId),
    }));
  }, []);

  /**
   * Update a post in the list
   */
  const updatePost = useCallback(
    (postId: string, updates: Partial<BulletinPostWithAuthor>) => {
      setState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId ? { ...p, ...updates } : p
        ),
      }));
    },
    []
  );

  // Load posts when filters change
  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeTag, state.searchQuery]);

  return {
    // State
    posts: state.posts,
    hasMore: state.hasMore,
    loadingState: state.loadingState,
    error: state.error,
    activeTag: state.activeTag,
    searchQuery: state.searchQuery,

    // Actions
    loadPosts,
    loadMore,
    refreshPosts,
    setActiveTag,
    setSearchQuery,
    clearFilters,

    // Mutations
    addPostOptimistically,
    removePost,
    updatePost,
  };
}
