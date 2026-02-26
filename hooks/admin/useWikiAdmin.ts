/**
 * useWikiAdmin Hook
 *
 * Feature: Admin Section Enhancement
 *
 * Admin hook for wiki analytics and management.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WikiAdminStats, UseWikiAdminReturn } from '@/types/admin';

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWikiAdmin(): UseWikiAdminReturn {
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState<WikiAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Parallel queries for all stats
      const [
        pagesResult,
        publishedResult,
        draftResult,
        lockedResult,
        revisionsResult,
        reportsResult,
        mostViewedResult,
        recentActivityResult,
        categoriesResult,
      ] = await Promise.all([
        // Total pages
        supabase.from('wiki_pages').select('*', { count: 'exact', head: true }),
        // Published pages
        supabase
          .from('wiki_pages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published'),
        // Draft pages
        supabase
          .from('wiki_pages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft'),
        // Locked pages
        supabase
          .from('wiki_pages')
          .select('*', { count: 'exact', head: true })
          .eq('is_locked', true),
        // Total revisions
        supabase
          .from('wiki_revisions')
          .select('*', { count: 'exact', head: true }),
        // Pending reports
        supabase
          .from('wiki_page_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        // Most viewed pages (top 10)
        supabase
          .from('wiki_pages')
          .select('id, title_en, slug, view_count, status, is_locked')
          .order('view_count', { ascending: false })
          .limit(10),
        // Recent activity (last 10 edits)
        supabase
          .from('wiki_revisions')
          .select(
            `
            id,
            revision_number,
            edit_summary,
            created_at,
            page:wiki_pages!inner(id, title_en, slug),
            editor:profiles(id, display_name, avatar_url)
          `
          )
          .order('created_at', { ascending: false })
          .limit(10),
        // Category stats
        supabase
          .from('wiki_categories')
          .select('id, name_en, slug')
          .eq('is_active', true),
      ]);

      // Calculate total views
      const viewsResult = await supabase
        .from('wiki_pages')
        .select('view_count');
      const totalViews = (viewsResult.data || []).reduce(
        (sum, p) => sum + (p.view_count || 0),
        0
      );

      // Get page counts per category
      const categoryStatsPromises = (categoriesResult.data || []).map(
        async (cat) => {
          const countResult = await supabase
            .from('wiki_pages')
            .select('view_count', { count: 'exact' })
            .eq('category_id', cat.id);

          const categoryViews = (countResult.data || []).reduce(
            (sum, p) => sum + (p.view_count || 0),
            0
          );

          return {
            category_id: cat.id,
            category_name: cat.name_en,
            category_slug: cat.slug,
            page_count: countResult.count || 0,
            total_views: categoryViews,
          };
        }
      );

      const categoryStats = await Promise.all(categoryStatsPromises);

      // Transform recent activity
      const recentActivity = (recentActivityResult.data || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => ({
          id: r.id,
          page_id: r.page?.id || '',
          page_title: r.page?.title_en || 'Unknown',
          page_slug: r.page?.slug || '',
          editor_id: r.editor?.id || '',
          editor_name: r.editor?.display_name || 'Unknown',
          editor_avatar: r.editor?.avatar_url || null,
          edit_summary: r.edit_summary || '',
          revision_number: r.revision_number,
          created_at: r.created_at,
        })
      );

      // Transform most viewed pages
      const mostViewedPages = (mostViewedResult.data || []).map((p) => ({
        id: p.id,
        title: p.title_en,
        slug: p.slug,
        view_count: p.view_count || 0,
        status: p.status as 'draft' | 'published' | 'archived',
        is_locked: p.is_locked || false,
      }));

      setStats({
        totalPages: pagesResult.count || 0,
        totalViews,
        totalRevisions: revisionsResult.count || 0,
        pendingReportsCount: reportsResult.count || 0,
        publishedPages: publishedResult.count || 0,
        draftPages: draftResult.count || 0,
        lockedPages: lockedResult.count || 0,
        mostViewedPages,
        recentActivity,
        categoryBreakdown: categoryStats,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch wiki stats';
      setError(message);
      console.error('[useWikiAdmin] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
