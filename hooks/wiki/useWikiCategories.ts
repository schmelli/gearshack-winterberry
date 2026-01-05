/**
 * Wiki Categories Hook
 *
 * Feature: Community Section Restructure
 *
 * Fetches and manages wiki categories with hierarchical structure.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WikiCategoryWithChildren, UseWikiCategoriesReturn } from '@/types/wiki';

export function useWikiCategories(): UseWikiCategoriesReturn {
  const [categories, setCategories] = useState<WikiCategoryWithChildren[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all categories
      const { data, error: fetchError } = await supabase
        .from('wiki_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      // Build hierarchical structure
      const categoryMap = new Map<string, WikiCategoryWithChildren>();
      const rootCategories: WikiCategoryWithChildren[] = [];

      // First pass: create map
      data?.forEach((cat) => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      // Second pass: build tree
      data?.forEach((cat) => {
        const category = categoryMap.get(cat.id)!;
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(category);
          }
        } else {
          rootCategories.push(category);
        }
      });

      setCategories(rootCategories);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(message);
      console.error('Error fetching wiki categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}
