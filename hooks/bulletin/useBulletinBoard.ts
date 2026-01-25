'use client';

/**
 * Main Bulletin Board Hook
 *
 * Feature: 051-community-bulletin-board
 * Task: T023
 *
 * Manages the main board state including posts, pagination,
 * loading states, and error handling.
 *
 * Updated in Feature 056 (T046) to integrate with useBulletinFilters
 * for URL-synced filter state.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchBulletinPosts } from '@/lib/supabase/bulletin-queries';
import { useBulletinFilters } from './useBulletinFilters';
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
  // Memoize Supabase client to prevent infinite re-renders
  // (createClient returns a new reference each call, breaking useCallback deps)
  const supabase = useMemo(() => createClient(), []);

  // URL-synced filter state
  const {
    activeTag,
    searchQuery,
    setActiveTag: setUrlActiveTag,
    setSearchQuery: setUrlSearchQuery,
    clearFilters: clearUrlFilters,
  } = useBulletinFilters();

  // Board state (without filters - they come from URL)
  const [state, setState] = useState<Omit<BoardState, 'activeTag' | 'searchQuery'>>({
    posts: [],
    hasMore: true,
    nextCursor: null,
    loadingState: 'idle',
    error: null,
  });

  // Track fetch ID to prevent race conditions in loadMore
  const loadMoreFetchIdRef = useRef(0);

  /**
   * Load initial posts
   */
  const loadPosts = useCallback(async () => {
    setState((prev) => ({ ...prev, loadingState: 'loading', error: null }));

    try {
      const result = await fetchBulletinPosts(supabase, {
        tag: activeTag ?? undefined,
        search: searchQuery || undefined,
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
  }, [supabase, activeTag, searchQuery]);

  /**
   * Load more posts (infinite scroll)
   * Uses fetchId to prevent race conditions when loadMore is called rapidly
   */
  const loadMore = useCallback(async () => {
    if (state.loadingState !== 'idle' || !state.hasMore || !state.nextCursor) {
      return;
    }

    // Increment fetch ID and capture for this request
    const fetchId = ++loadMoreFetchIdRef.current;

    setState((prev) => ({ ...prev, loadingState: 'loading-more' }));

    try {
      const result = await fetchBulletinPosts(supabase, {
        tag: activeTag ?? undefined,
        search: searchQuery || undefined,
        cursor: state.nextCursor,
        limit: BULLETIN_CONSTANTS.POSTS_PER_PAGE,
      });

      // Only update state if this is still the current fetch (prevent race condition)
      if (fetchId !== loadMoreFetchIdRef.current) return;

      setState((prev) => ({
        ...prev,
        posts: [...prev.posts, ...result.posts],
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
      }));
    } catch (err) {
      // Only update state if this is still the current fetch
      if (fetchId !== loadMoreFetchIdRef.current) return;

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
    activeTag,
    searchQuery,
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
   * Set active tag filter (updates URL and resets posts)
   */
  const setActiveTag = useCallback((tag: PostTag | null) => {
    setState((prev) => ({
      ...prev,
      posts: [],
      nextCursor: null,
      hasMore: true,
    }));
    setUrlActiveTag(tag);
  }, [setUrlActiveTag]);

  /**
   * Set search query (updates URL and resets posts)
   */
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      posts: [],
      nextCursor: null,
      hasMore: true,
    }));
    setUrlSearchQuery(query);
  }, [setUrlSearchQuery]);

  /**
   * Clear all filters (updates URL and resets posts)
   */
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      posts: [],
      nextCursor: null,
      hasMore: true,
    }));
    clearUrlFilters();
  }, [clearUrlFilters]);

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
    // Data fetching in useEffect is a valid pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPosts();
  }, [loadPosts]);

  return {
    // State
    posts: state.posts,
    hasMore: state.hasMore,
    loadingState: state.loadingState,
    error: state.error,
    activeTag,
    searchQuery,

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
