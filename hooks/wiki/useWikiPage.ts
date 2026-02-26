/**
 * Wiki Page Hook
 *
 * Feature: Community Section Restructure
 *
 * Fetches a single wiki page by slug.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WikiPageWithAuthor, UseWikiPageReturn } from '@/types/wiki';

export function useWikiPage(slug: string): UseWikiPageReturn {
  const [page, setPage] = useState<WikiPageWithAuthor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  const fetchPage = useCallback(async () => {
    if (!slug) {
      setPage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('wiki_pages')
        .select(`
          *,
          author:profiles!wiki_pages_author_id_fkey(id, display_name, avatar_url),
          category:wiki_categories(*)
        `)
        .eq('slug', slug)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Page not found');
        } else {
          throw fetchError;
        }
        setPage(null);
      } else {
        setPage(data as WikiPageWithAuthor);

        // Increment view count (fire and forget)
        supabase
          .from('wiki_pages')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to increment view count:', error);
            }
          });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch page';
      setError(message);
      console.error('Error fetching wiki page:', err);
      setPage(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug, supabase]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return {
    page,
    isLoading,
    error,
    refetch: fetchPage,
  };
}
