/**
 * Category Service
 *
 * Feature: Admin Panel with Category Management
 * CRUD operations and analysis for categories
 */

import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/types/category';
import type { Database } from '@/types/database';

type DbCategory = Database['public']['Tables']['categories']['Row'];

// Transform DB row to Category type
function categoryFromDb(row: DbCategory): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    level: row.level as 1 | 2 | 3,
    label: row.label,
    slug: row.slug,
    i18n: row.i18n as { en: string; de?: string },
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

export async function createCategory(data: {
  parentId: string | null;
  level: 1 | 2 | 3;
  label: string;
  slug: string;
  i18n: { en?: string; de?: string };
}): Promise<{ data: Category | null; error: string | null }> {
  const supabase = createClient();

  // Get max sortOrder for siblings
  let query = supabase
    .from('categories')
    .select('sort_order')
    .eq('level', data.level)
    .order('sort_order', { ascending: false })
    .limit(1);

  // Handle parent_id filtering (can be null for level 1)
  if (data.parentId === null) {
    query = query.is('parent_id', null);
  } else {
    query = query.eq('parent_id', data.parentId);
  }

  const { data: siblings } = await query;

  const nextSortOrder = siblings?.[0]?.sort_order ? siblings[0].sort_order + 1 : 1;

  const { data: newCategory, error } = await supabase
    .from('categories')
    .insert({
      parent_id: data.parentId,
      level: data.level,
      label: data.label,
      slug: data.slug,
      i18n: data.i18n,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: categoryFromDb(newCategory), error: null };
}

export async function updateCategory(
  id: string,
  data: {
    label?: string;
    slug?: string;
    i18n?: { en?: string; de?: string };
  }
): Promise<{ data: Category | null; error: string | null }> {
  const supabase = createClient();

  const { data: updated, error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: categoryFromDb(updated), error: null };
}

export async function deleteCategory(
  id: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Check for children first
  const { data: children } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', id)
    .limit(1);

  if (children && children.length > 0) {
    return { error: 'Cannot delete category with children. Delete children first.' };
  }

  // Check if used by gear items
  const { data: gearItems } = await supabase
    .from('gear_items')
    .select('id')
    .eq('product_type_id', id)
    .limit(1);

  if (gearItems && gearItems.length > 0) {
    return { error: 'Cannot delete category. It is used by gear items.' };
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);

  return { error: error?.message || null };
}

/**
 * Indent category - make it a child of the previous sibling
 * Example: L1 → L2 (child of previous L1)
 */
export async function indentCategory(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Get current category
  const { data: current } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Category not found' };
  if (current.level === 3) return { error: 'Level 3 categories cannot be indented further' };

  // Get previous sibling to become the new parent
  let siblingsQuery = supabase
    .from('categories')
    .select('*')
    .eq('level', current.level)
    .order('sort_order', { ascending: true });

  if (current.parent_id === null) {
    siblingsQuery = siblingsQuery.is('parent_id', null);
  } else {
    siblingsQuery = siblingsQuery.eq('parent_id', current.parent_id);
  }

  const { data: siblings } = await siblingsQuery;

  if (!siblings || siblings.length === 0) {
    return { error: 'No siblings found' };
  }

  const currentIndex = siblings.findIndex((s) => s.id === id);

  if (currentIndex <= 0) {
    return { error: 'No previous sibling to indent under' };
  }

  const newParent = siblings[currentIndex - 1];

  // Update category to new parent and level
  const { error } = await supabase
    .from('categories')
    .update({
      parent_id: newParent.id,
      level: (current.level + 1) as 1 | 2 | 3,
      sort_order: 1, // First child of new parent
    })
    .eq('id', id);

  return { error: error?.message || null };
}

/**
 * Outdent category - move it up a level (become sibling of parent)
 * Example: L2 → L1, L3 → L2
 */
export async function outdentCategory(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Get current category
  const { data: current } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Category not found' };
  if (current.level === 1) return { error: 'Level 1 categories cannot be outdented' };
  if (!current.parent_id) return { error: 'Category has no parent' };

  // Get parent to find grandparent
  const { data: parent } = await supabase
    .from('categories')
    .select('*')
    .eq('id', current.parent_id)
    .single();

  if (!parent) return { error: 'Parent category not found' };

  // Update category to grandparent and level up
  const { error } = await supabase
    .from('categories')
    .update({
      parent_id: parent.parent_id, // Grandparent (could be null for L1)
      level: (current.level - 1) as 1 | 2 | 3,
      sort_order: 999, // Move to end of siblings
    })
    .eq('id', id);

  return { error: error?.message || null };
}

export async function moveCategory(
  id: string,
  direction: 'up' | 'down'
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Get current category
  const { data: current } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Category not found' };

  // Get adjacent sibling
  let siblingsQuery = supabase
    .from('categories')
    .select('*')
    .eq('level', current.level)
    .order('sort_order', { ascending: direction === 'down' });

  // Handle parent_id filtering (can be null for level 1)
  if (current.parent_id === null) {
    siblingsQuery = siblingsQuery.is('parent_id', null);
  } else {
    siblingsQuery = siblingsQuery.eq('parent_id', current.parent_id);
  }

  const { data: siblings } = await siblingsQuery;

  if (!siblings || siblings.length === 0) {
    return { error: 'No siblings found' };
  }

  const currentIndex = siblings.findIndex((s) => s.id === id);
  if (currentIndex === -1) return { error: 'Category not found in siblings' };

  const adjacentIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  const adjacent = siblings[adjacentIndex];

  if (!adjacent) return { error: 'No adjacent sibling to swap with' };

  const currentSortOrder = current.sort_order;
  const adjacentSortOrder = adjacent.sort_order;

  // Swap sort_order values
  const { error: error1 } = await supabase
    .from('categories')
    .update({ sort_order: adjacentSortOrder })
    .eq('id', current.id);

  const { error: error2 } = await supabase
    .from('categories')
    .update({ sort_order: currentSortOrder })
    .eq('id', adjacent.id);

  if (error1 || error2) {
    return { error: error1?.message || error2?.message || 'Failed to swap' };
  }

  return { error: null };
}

export interface CategoryIssue {
  categoryId: string;
  categoryLabel: string;
  level: number;
  issues: string[];
}

export async function getCategoryIssues(): Promise<CategoryIssue[]> {
  const supabase = createClient();

  // PERFORMANCE FIX: Avoid N+1 query by fetching all data in 2 queries total
  const { data: allCategories } = await supabase
    .from('categories')
    .select('*')
    .order('level')
    .order('sort_order');

  if (!allCategories) return [];

  // Single query to get all parent IDs that have children (eliminates N+1)
  const { data: childParentIds } = await supabase
    .from('categories')
    .select('parent_id')
    .not('parent_id', 'is', null);

  // Build Set for O(1) lookup of categories with children
  const parentsWithChildren = new Set(
    childParentIds?.map(c => c.parent_id).filter(Boolean) ?? []
  );

  const issues: CategoryIssue[] = [];

  for (const cat of allCategories) {
    const catIssues: string[] = [];

    // Check for missing translations
    const i18n = cat.i18n as { en?: string; de?: string } | null;
    if (!i18n?.en) catIssues.push('Missing English translation');
    if (!i18n?.de) catIssues.push('Missing German translation');

    // Check for empty parent categories (O(1) lookup instead of query)
    if (cat.level < 3 && !parentsWithChildren.has(cat.id)) {
      catIssues.push('Empty category (no children)');
    }

    if (catIssues.length > 0) {
      issues.push({
        categoryId: cat.id,
        categoryLabel: cat.label,
        level: cat.level,
        issues: catIssues,
      });
    }
  }

  return issues;
}
