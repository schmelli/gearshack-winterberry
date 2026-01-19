/**
 * GearGraph Categories API
 *
 * Provides dynamic access to ProductTypes, Categories, and Subcategories.
 * Designed for GearGraph team integration.
 *
 * GET /api/geargraph/categories
 *   - Returns all categories (flat list)
 *
 * Query Parameters:
 *   - level: 1 | 2 | 3 - Filter by hierarchy level
 *     - 1 = Main Categories (e.g., "Shelter", "Clothing")
 *     - 2 = Subcategories (e.g., "Tents", "Jackets")
 *     - 3 = Product Types (e.g., "Dome Tents", "Winter Jackets")
 *   - parent: UUID - Filter by parent category ID
 *   - format: 'flat' | 'tree' - Output format (default: flat)
 *
 * Response includes i18n labels (en, de) for each category.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Category, CategoryWithChildren } from '@/types/category';
import type { Database } from '@/types/supabase';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

/**
 * Transforms database row to Category type.
 */
function transformCategory(row: CategoryRow): Category {
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
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

/**
 * Builds hierarchical tree from flat category list.
 */
function buildCategoryTree(categories: Category[]): CategoryWithChildren[] {
  const categoryMap = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // First pass: create all nodes with empty children arrays
  for (const cat of categories) {
    categoryMap.set(cat.id, { ...cat, children: [] });
  }

  // Second pass: build tree structure
  for (const cat of categories) {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      categoryMap.get(cat.parentId)!.children.push(node);
    } else if (!cat.parentId) {
      roots.push(node);
    }
  }

  // Sort children by sortOrder, then by label
  const sortChildren = (nodes: CategoryWithChildren[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const levelParam = searchParams.get('level');
    const parentParam = searchParams.get('parent');
    const formatParam = searchParams.get('format') || 'flat';

    // Validate level parameter
    let level: 1 | 2 | 3 | undefined;
    if (levelParam) {
      const parsed = parseInt(levelParam, 10);
      if (![1, 2, 3].includes(parsed)) {
        return NextResponse.json(
          { error: 'Invalid level parameter. Must be 1, 2, or 3.' },
          { status: 400 }
        );
      }
      level = parsed as 1 | 2 | 3;
    }

    // Validate format parameter
    if (!['flat', 'tree'].includes(formatParam)) {
      return NextResponse.json(
        { error: 'Invalid format parameter. Must be "flat" or "tree".' },
        { status: 400 }
      );
    }

    // Validate parent UUID format if provided
    if (parentParam && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentParam)) {
      return NextResponse.json(
        { error: 'Invalid parent parameter. Must be a valid UUID.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('categories')
      .select('*')
      .order('level', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    // Apply filters
    if (level) {
      query = query.eq('level', level);
    }
    if (parentParam) {
      query = query.eq('parent_id', parentParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GearGraph Categories] Query error:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const categories = ((data ?? []) as CategoryRow[]).map(transformCategory);

    // Return tree or flat format
    if (formatParam === 'tree') {
      const tree = buildCategoryTree(categories);
      return NextResponse.json({
        format: 'tree',
        count: categories.length,
        data: tree,
      });
    }

    return NextResponse.json({
      format: 'flat',
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error('[GearGraph Categories] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
