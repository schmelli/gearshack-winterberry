/**
 * Wiki Pages Hook
 *
 * Feature: Community Section Restructure
 *
 * Fetches and searches wiki pages with pagination.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WikiPageWithAuthor, WikiSearchParams, UseWikiPagesReturn } from '@/types/wiki';

const PAGE_SIZE = 12;

export function useWikiPages(params: WikiSearchParams = {}): UseWikiPagesReturn {
  const [pages, setPages] = useState<WikiPageWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);
  const { query, category_id, status = 'published', locale = 'en', limit = PAGE_SIZE } = params;

  const fetchPages = useCallback(async (resetOffset = true) => {
    setIsLoading(true);
    setError(null);

    const currentOffset = resetOffset ? 0 : offset;
    if (resetOffset) setOffset(0);

    try {
      let queryBuilder = supabase
        .from('wiki_pages')
        .select(`
          *,
          author:profiles!wiki_pages_author_id_fkey(id, display_name, avatar_url),
          category:wiki_categories(*)
        `, { count: 'exact' })
        .eq('status', status)
        .order('updated_at', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1);

      // Apply filters
      if (category_id) {
        queryBuilder = queryBuilder.eq('category_id', category_id);
      }

      // Full-text search
      if (query) {
        const searchColumn = locale === 'de' ? 'search_vector_de' : 'search_vector_en';
        queryBuilder = queryBuilder.textSearch(searchColumn, query, {
          type: 'websearch',
          config: locale === 'de' ? 'german' : 'english',
        });
      }

      const { data, error: fetchError, count } = await queryBuilder;

      if (fetchError) throw fetchError;

      if (resetOffset) {
        setPages(data as WikiPageWithAuthor[]);
      } else {
        setPages((prev) => [...prev, ...(data as WikiPageWithAuthor[])]);
      }
      setTotal(count ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pages';
      setError(message);
      console.error('Error fetching wiki pages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, query, category_id, status, locale, limit, offset]);

  const loadMore = useCallback(async () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    await fetchPages(false);
  }, [offset, limit, fetchPages]);

  useEffect(() => {
    fetchPages(true);
  }, [query, category_id, status, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    pages,
    isLoading,
    error,
    total,
    hasMore: pages.length < total,
    loadMore,
    refetch: () => fetchPages(true),
  };
}
