/**
 * Category Database Functions
 *
 * Feature: 043-ontology-i18n-import
 * Task: T021
 *
 * Supabase queries for categories with i18n support.
 */

import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/types/category';
import type { Database } from '@/types/database';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

/**
 * Transforms database row to Category type.
 * Converts snake_case to camelCase.
 */
function transformCategory(row: CategoryRow): Category {
  // Parse i18n JSONB, ensuring 'en' key exists (falls back to label)
  const rawI18n = row.i18n as Record<string, string> | null;
  const i18n = {
    en: rawI18n?.en ?? row.label,
    ...(rawI18n?.de ? { de: rawI18n.de } : {}),
  };

  return {
    id: row.id,
    parentId: row.parent_id,
    level: row.level as 1 | 2 | 3,
    label: row.label,
    slug: row.slug,
    i18n,
    // @ts-ignore - sort_order will exist after admin migration
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

/**
 * Fetches all categories from the database.
 * Returns transformed categories sorted by level and label.
 *
 * @returns Promise<Category[]> - All categories
 * @throws Error if query fails
 */
export async function fetchCategories(): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('level', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return ((data ?? []) as CategoryRow[]).map(transformCategory);
}

/**
 * Fetches categories by level.
 *
 * @param level - Category level (1, 2, or 3)
 * @returns Promise<Category[]> - Categories at the specified level
 */
export async function fetchCategoriesByLevel(level: 1 | 2 | 3): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('level', level)
    .order('label', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch level ${level} categories: ${error.message}`);
  }

  return ((data ?? []) as CategoryRow[]).map(transformCategory);
}

/**
 * Fetches categories by parent ID.
 *
 * @param parentId - Parent category ID
 * @returns Promise<Category[]> - Child categories
 */
export async function fetchCategoriesByParent(parentId: string): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('parent_id', parentId)
    .order('label', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch child categories: ${error.message}`);
  }

  return ((data ?? []) as CategoryRow[]).map(transformCategory);
}

/**
 * Fetches a single category by ID.
 *
 * @param id - Category UUID
 * @returns Promise<Category | null> - The category or null if not found
 */
export async function fetchCategoryById(id: string): Promise<Category | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch category: ${error.message}`);
  }

  return transformCategory(data as CategoryRow);
}

/**
 * Fetches a single category by slug.
 *
 * @param slug - Category slug
 * @returns Promise<Category | null> - The category or null if not found
 */
export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch category by slug: ${error.message}`);
  }

  return transformCategory(data as CategoryRow);
}
