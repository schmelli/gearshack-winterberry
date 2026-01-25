/**
 * Wiki Revisions Hook
 *
 * Feature: Community Section Restructure
 *
 * Fetches revision history for a wiki page.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WikiRevisionWithEditor, UseWikiRevisionsReturn } from '@/types/wiki';

export function useWikiRevisions(pageId: string | undefined): UseWikiRevisionsReturn {
  const [revisions, setRevisions] = useState<WikiRevisionWithEditor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  const fetchRevisions = useCallback(async () => {
    if (!pageId) {
      setRevisions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('wiki_revisions')
        .select(`
          *,
          editor:profiles!wiki_revisions_editor_id_fkey(id, display_name, avatar_url)
        `)
        .eq('page_id', pageId)
        .order('revision_number', { ascending: false });

      if (fetchError) throw fetchError;

      setRevisions(data as WikiRevisionWithEditor[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch revisions';
      setError(message);
      console.error('Error fetching wiki revisions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pageId, supabase]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  return {
    revisions,
    isLoading,
    error,
    refetch: fetchRevisions,
  };
}
