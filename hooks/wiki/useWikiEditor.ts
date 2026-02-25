/**
 * Wiki Editor Hook
 *
 * Feature: Community Section Restructure
 *
 * Handles creating and updating wiki pages.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { WikiPage, WikiPageFormData, UseWikiEditorReturn } from '@/types/wiki';

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function useWikiEditor(): UseWikiEditorReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  const createPage = useCallback(async (data: WikiPageFormData): Promise<WikiPage | null> => {
    if (!user) {
      setError('You must be logged in to create a page');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Generate unique slug
      let slug = generateSlug(data.title_en);
      let slugSuffix = 0;

      // Check for existing slugs - use maybeSingle() to avoid 406 when no row exists
      while (true) {
        const testSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
        const { data: existing } = await supabase
          .from('wiki_pages')
          .select('id')
          .eq('slug', testSlug)
          .maybeSingle();

        if (!existing) {
          slug = testSlug;
          break;
        }
        slugSuffix++;
      }

      // Create the page
      const { data: newPage, error: createError } = await supabase
        .from('wiki_pages')
        .insert({
          slug,
          title_en: data.title_en,
          title_de: data.title_de,
          content_en: data.content_en,
          content_de: data.content_de,
          category_id: data.category_id,
          author_id: user.id,
          status: data.status,
          published_at: data.status === 'published' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create initial revision
      await supabase.from('wiki_revisions').insert({
        page_id: newPage.id,
        revision_number: 1,
        title_en: data.title_en,
        title_de: data.title_de,
        content_en: data.content_en,
        content_de: data.content_de,
        editor_id: user.id,
        edit_summary: 'Initial version',
      });

      return newPage;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create page';
      setError(message);
      console.error('Error creating wiki page:', err);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, supabase]);

  const updatePage = useCallback(async (
    slug: string,
    data: WikiPageFormData
  ): Promise<WikiPage | null> => {
    if (!user) {
      setError('You must be logged in to edit a page');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get current page
      const { data: currentPage, error: fetchError } = await supabase
        .from('wiki_pages')
        .select('*')
        .eq('slug', slug)
        .single();

      if (fetchError) throw fetchError;

      // Update the page
      const newRevisionNumber = (currentPage.revision_number || 1) + 1;
      const { data: updatedPage, error: updateError } = await supabase
        .from('wiki_pages')
        .update({
          title_en: data.title_en,
          title_de: data.title_de,
          content_en: data.content_en,
          content_de: data.content_de,
          category_id: data.category_id,
          status: data.status,
          revision_number: newRevisionNumber,
          published_at: data.status === 'published' && !currentPage.published_at
            ? new Date().toISOString()
            : currentPage.published_at,
        })
        .eq('slug', slug)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create revision record
      await supabase.from('wiki_revisions').insert({
        page_id: updatedPage.id,
        revision_number: newRevisionNumber,
        title_en: data.title_en,
        title_de: data.title_de,
        content_en: data.content_en,
        content_de: data.content_de,
        editor_id: user.id,
        edit_summary: data.edit_summary || 'Updated content',
      });

      return updatedPage;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update page';
      setError(message);
      console.error('Error updating wiki page:', err);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, supabase]);

  return {
    isSubmitting,
    error,
    createPage,
    updatePage,
  };
}
