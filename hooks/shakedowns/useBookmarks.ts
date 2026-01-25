'use client';

/**
 * useBookmarks Hook
 *
 * Feature: 001-community-shakedowns
 * Task: T058
 *
 * Manages bookmarking shakedowns for later reference.
 * Supports optional notes on bookmarks.
 *
 * Features:
 * - Local cache of bookmarked IDs for quick `isBookmarked` checks
 * - Optimistic updates with rollback on error
 * - Toast notifications
 * - i18n support for toast messages
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import type { ShakedownWithAuthor } from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

export interface BookmarkedShakedown {
  bookmarkId: string;
  shakedownId: string;
  note: string | null;
  bookmarkedAt: string;
  shakedown: ShakedownWithAuthor;
}

interface BookmarkState {
  bookmarks: BookmarkedShakedown[];
  bookmarkedIds: Set<string>;
  isLoading: boolean;
  error: Error | null;
  isOperating: boolean;
}

interface UseBookmarksOptions {
  /** Fetch user's bookmarks on mount (default: true) */
  autoFetch?: boolean;
}

export interface UseBookmarksReturn {
  bookmarks: BookmarkedShakedown[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  bookmark: (shakedownId: string, note?: string) => Promise<void>;
  unbookmark: (shakedownId: string) => Promise<void>;
  updateNote: (shakedownId: string, note: string | null) => Promise<void>;
  isBookmarked: (shakedownId: string) => boolean;

  // Fetch
  fetchBookmarks: () => Promise<void>;
}

// =============================================================================
// Database Row Types (snake_case from API)
// =============================================================================

interface BookmarkDbRow {
  id: string;
  shakedown_id: string;
  note: string | null;
  created_at: string;
  shakedown: ShakedownDbRow;
}

interface ShakedownDbRow {
  id: string;
  owner_id: string;
  loadout_id: string;
  trip_name: string;
  trip_start_date: string;
  trip_end_date: string;
  experience_level: 'beginner' | 'intermediate' | 'experienced' | 'expert';
  concerns: string | null;
  privacy: 'public' | 'friends_only' | 'private';
  share_token: string | null;
  status: 'open' | 'completed' | 'archived';
  feedback_count: number;
  helpful_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
  // Joined fields
  author_name?: string;
  author_avatar?: string | null;
  loadout_name?: string;
  total_weight_grams?: number;
  item_count?: number;
}

// =============================================================================
// Transform Helpers
// =============================================================================

function transformShakedownFromDb(row: ShakedownDbRow): ShakedownWithAuthor {
  return {
    id: row.id,
    ownerId: row.owner_id,
    loadoutId: row.loadout_id,
    tripName: row.trip_name,
    tripStartDate: row.trip_start_date,
    tripEndDate: row.trip_end_date,
    experienceLevel: row.experience_level,
    concerns: row.concerns,
    privacy: row.privacy,
    shareToken: row.share_token,
    status: row.status,
    feedbackCount: row.feedback_count,
    helpfulCount: row.helpful_count,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    // Joined fields
    authorName: row.author_name ?? 'Unknown',
    authorAvatar: row.author_avatar ?? null,
    loadoutName: row.loadout_name ?? 'Untitled Loadout',
    totalWeightGrams: row.total_weight_grams ?? 0,
    itemCount: row.item_count ?? 0,
  };
}

function transformBookmarkFromDb(row: BookmarkDbRow): BookmarkedShakedown {
  return {
    bookmarkId: row.id,
    shakedownId: row.shakedown_id,
    note: row.note,
    bookmarkedAt: row.created_at,
    shakedown: transformShakedownFromDb(row.shakedown),
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBookmarks(options: UseBookmarksOptions = {}): UseBookmarksReturn {
  const { autoFetch = true } = options;
  const { user } = useAuthContext();
  const t = useTranslations('Shakedowns');

  // Track previous state for optimistic rollback
  const previousStateRef = useRef<BookmarkState | null>(null);

  const [state, setState] = useState<BookmarkState>({
    bookmarks: [],
    bookmarkedIds: new Set(),
    isLoading: false,
    error: null,
    isOperating: false,
  });

  // =============================================================================
  // Fetch Bookmarks
  // =============================================================================

  const fetchBookmarks = useCallback(async () => {
    if (!user?.uid) {
      setState((prev) => ({
        ...prev,
        bookmarks: [],
        bookmarkedIds: new Set(),
        isLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/shakedowns/bookmarks');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch bookmarks (${response.status})`);
      }

      const data = await response.json();
      const bookmarks = (data.bookmarks as BookmarkDbRow[]).map(transformBookmarkFromDb);
      const bookmarkedIds = new Set(bookmarks.map((b) => b.shakedownId));

      setState((prev) => ({
        ...prev,
        bookmarks,
        bookmarkedIds,
        isLoading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch bookmarks');
      console.error('[useBookmarks] Fetch error:', error);
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, [user?.uid]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && user?.uid) {
      fetchBookmarks();
    }
  }, [autoFetch, user?.uid, fetchBookmarks]);

  // =============================================================================
  // Bookmark (Add)
  // =============================================================================

  const bookmark = useCallback(
    async (shakedownId: string, note?: string): Promise<void> => {
      if (!user?.uid) {
        toast.error(t('errors.unauthorized') || 'You must be logged in to bookmark');
        throw new Error('Unauthorized');
      }

      // Use setState callback to check current state without stale closure
      let isAlreadyBookmarked = false;
      setState((prev) => {
        isAlreadyBookmarked = prev.bookmarkedIds.has(shakedownId);
        if (isAlreadyBookmarked) {
          return prev; // No-op, already bookmarked
        }
        // Save previous state for rollback
        previousStateRef.current = { ...prev };
        // Optimistic update - add to bookmarkedIds immediately
        return {
          ...prev,
          isOperating: true,
          error: null,
          bookmarkedIds: new Set(prev.bookmarkedIds).add(shakedownId),
        };
      });

      if (isAlreadyBookmarked) {
        return;
      }

      try {
        const response = await fetch('/api/shakedowns/bookmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shakedownId,
            note: note ?? null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Handle duplicate bookmark
          if (response.status === 409) {
            // Already bookmarked - just update state to reflect reality
            setState((prev) => ({ ...prev, isOperating: false }));
            return;
          }

          throw new Error(errorData.error || `Failed to bookmark (${response.status})`);
        }

        const data = await response.json();
        const newBookmark = transformBookmarkFromDb(data.bookmark as BookmarkDbRow);

        // Update state with the new bookmark
        setState((prev) => ({
          ...prev,
          isOperating: false,
          bookmarks: [newBookmark, ...prev.bookmarks],
          bookmarkedIds: new Set(prev.bookmarkedIds).add(shakedownId),
        }));

        toast.success(t('success.bookmarked') || 'Shakedown bookmarked');
      } catch (err) {
        // Rollback optimistic update
        if (previousStateRef.current) {
          setState({
            ...previousStateRef.current,
            isOperating: false,
            error: err instanceof Error ? err : new Error('Failed to bookmark'),
          });
        } else {
          setState((prev) => ({
            ...prev,
            isOperating: false,
            bookmarkedIds: new Set([...prev.bookmarkedIds].filter((id) => id !== shakedownId)),
            error: err instanceof Error ? err : new Error('Failed to bookmark'),
          }));
        }

        toast.error(t('errors.bookmarkFailed') || 'Failed to bookmark. Please try again.');
        throw err;
      }
    },
    [user?.uid, t]
  );

  // =============================================================================
  // Unbookmark (Remove)
  // =============================================================================

  const unbookmark = useCallback(
    async (shakedownId: string): Promise<void> => {
      if (!user?.uid) {
        toast.error(t('errors.unauthorized') || 'You must be logged in');
        throw new Error('Unauthorized');
      }

      // Use setState callback to check state and extract bookmark ID without stale closure
      let isNotBookmarked = false;
      let existingBookmarkId: string | null = null;

      setState((prev) => {
        isNotBookmarked = !prev.bookmarkedIds.has(shakedownId);
        if (isNotBookmarked) {
          return prev; // No-op, not bookmarked
        }

        const existingBookmark = prev.bookmarks.find((b) => b.shakedownId === shakedownId);
        if (!existingBookmark) {
          // Stale state - just remove from IDs
          const newIds = new Set(prev.bookmarkedIds);
          newIds.delete(shakedownId);
          return { ...prev, bookmarkedIds: newIds };
        }

        existingBookmarkId = existingBookmark.bookmarkId;

        // Save previous state for rollback
        previousStateRef.current = { ...prev };

        // Optimistic update
        const newIds = new Set(prev.bookmarkedIds);
        newIds.delete(shakedownId);
        return {
          ...prev,
          isOperating: true,
          error: null,
          bookmarkedIds: newIds,
          bookmarks: prev.bookmarks.filter((b) => b.shakedownId !== shakedownId),
        };
      });

      if (isNotBookmarked || !existingBookmarkId) {
        return;
      }

      try {
        const response = await fetch(`/api/shakedowns/bookmarks/${existingBookmarkId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Already deleted - not an error
          if (response.status === 404) {
            setState((prev) => ({ ...prev, isOperating: false }));
            return;
          }

          throw new Error(errorData.error || `Failed to remove bookmark (${response.status})`);
        }

        setState((prev) => ({ ...prev, isOperating: false }));
        toast.success(t('success.unbookmarked') || 'Bookmark removed');
      } catch (err) {
        // Rollback optimistic update
        if (previousStateRef.current) {
          setState({
            ...previousStateRef.current,
            isOperating: false,
            error: err instanceof Error ? err : new Error('Failed to remove bookmark'),
          });
        }

        toast.error(t('errors.bookmarkFailed') || 'Failed to remove bookmark. Please try again.');
        throw err;
      }
    },
    [user?.uid, t]
  );

  // =============================================================================
  // Update Note
  // =============================================================================

  const updateNote = useCallback(
    async (shakedownId: string, note: string | null): Promise<void> => {
      if (!user?.uid) {
        toast.error(t('errors.unauthorized') || 'You must be logged in');
        throw new Error('Unauthorized');
      }

      // Use setState callback to find bookmark and set up optimistic update
      let existingBookmarkId: string | null = null;
      let bookmarkNotFound = false;

      setState((prev) => {
        const existingBookmark = prev.bookmarks.find((b) => b.shakedownId === shakedownId);
        if (!existingBookmark) {
          bookmarkNotFound = true;
          return prev;
        }

        existingBookmarkId = existingBookmark.bookmarkId;

        // Save previous state for rollback
        previousStateRef.current = { ...prev };

        // Optimistic update
        return {
          ...prev,
          isOperating: true,
          error: null,
          bookmarks: prev.bookmarks.map((b) =>
            b.shakedownId === shakedownId ? { ...b, note } : b
          ),
        };
      });

      if (bookmarkNotFound || !existingBookmarkId) {
        throw new Error('Bookmark not found');
      }

      try {
        const response = await fetch(`/api/shakedowns/bookmarks/${existingBookmarkId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to update note (${response.status})`);
        }

        setState((prev) => ({ ...prev, isOperating: false }));
        toast.success(t('success.noteUpdated') || 'Note updated');
      } catch (err) {
        // Rollback optimistic update
        if (previousStateRef.current) {
          setState({
            ...previousStateRef.current,
            isOperating: false,
            error: err instanceof Error ? err : new Error('Failed to update note'),
          });
        }

        toast.error(t('errors.bookmarkFailed') || 'Failed to update note. Please try again.');
        throw err;
      }
    },
    [user?.uid, t]
  );

  // =============================================================================
  // isBookmarked Check
  // =============================================================================

  const isBookmarked = useCallback(
    (shakedownId: string): boolean => {
      return state.bookmarkedIds.has(shakedownId);
    },
    [state.bookmarkedIds]
  );

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      bookmarks: state.bookmarks,
      isLoading: state.isLoading,
      error: state.error,
      bookmark,
      unbookmark,
      updateNote,
      isBookmarked,
      fetchBookmarks,
    }),
    [
      state.bookmarks,
      state.isLoading,
      state.error,
      bookmark,
      unbookmark,
      updateNote,
      isBookmarked,
      fetchBookmarks,
    ]
  );
}

export default useBookmarks;
