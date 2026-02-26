'use client';

/**
 * Bulletin Filters Hook with URL Sync
 *
 * Feature: 056-community-hub-enhancements
 * Task: T045
 *
 * Manages bulletin board filter state with URL query parameter synchronization.
 * Allows filters to persist across page refreshes and be shareable via URL.
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { PostTag } from '@/types/bulletin';
import { POST_TAGS } from '@/types/bulletin';

// =============================================================================
// Types
// =============================================================================

interface UseBulletinFiltersReturn {
  // Filter state from URL
  activeTag: PostTag | null;
  searchQuery: string;

  // Actions that update URL
  setActiveTag: (tag: PostTag | null) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  // State checks
  hasActiveFilters: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const URL_PARAM_TAG = 'tag';
const URL_PARAM_SEARCH = 'search';

// =============================================================================
// Hook
// =============================================================================

export function useBulletinFilters(): UseBulletinFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Parse tag from URL, validating it's a valid PostTag
   */
  const activeTag = useMemo((): PostTag | null => {
    const tagParam = searchParams.get(URL_PARAM_TAG);
    if (!tagParam) return null;

    // Validate it's a valid PostTag
    const isValidTag = POST_TAGS.some((option) => option.value === tagParam);
    return isValidTag ? (tagParam as PostTag) : null;
  }, [searchParams]);

  /**
   * Parse search query from URL
   */
  const searchQuery = useMemo((): string => {
    return searchParams.get(URL_PARAM_SEARCH) ?? '';
  }, [searchParams]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return activeTag !== null || searchQuery.length > 0;
  }, [activeTag, searchQuery]);

  /**
   * Update URL with new params
   */
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      // Use replace to avoid adding to history on every filter change
      router.replace(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /**
   * Set active tag filter
   */
  const setActiveTag = useCallback(
    (tag: PostTag | null) => {
      updateUrl({ [URL_PARAM_TAG]: tag });
    },
    [updateUrl]
  );

  /**
   * Set search query
   */
  const setSearchQuery = useCallback(
    (query: string) => {
      updateUrl({ [URL_PARAM_SEARCH]: query || null });
    },
    [updateUrl]
  );

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    updateUrl({
      [URL_PARAM_TAG]: null,
      [URL_PARAM_SEARCH]: null,
    });
  }, [updateUrl]);

  return {
    activeTag,
    searchQuery,
    setActiveTag,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
  };
}
