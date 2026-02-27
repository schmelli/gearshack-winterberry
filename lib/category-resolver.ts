/**
 * Category Resolver
 *
 * Resolves an AI-detected category label + product name to the most appropriate
 * level-3 product type ID from the `categories` table.
 *
 * Two-step matching:
 * 1. Find the best level-2 parent for the AI category string (label similarity)
 * 2. Among the level-3 children of that parent, pick the best by keyword overlap
 *    with the product name
 *
 * Used by the Vision Scan route to fill in `productTypeId` when no catalog
 * match is found (or to validate the type from a matched catalog product).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// =============================================================================
// Types
// =============================================================================

interface CategoryNode {
  id: string;
  label: string;
  slug: string;
  level: number;
  parentId: string | null;
}

// =============================================================================
// Module-level cache
// =============================================================================

/** Survives across requests in the same serverless instance (reset on cold start). */
let categoryCache: CategoryNode[] | null = null;

async function loadCategories(
  supabase: SupabaseClient<Database>
): Promise<CategoryNode[]> {
  if (categoryCache) return categoryCache;

  const { data } = await supabase
    .from('categories')
    .select('id, label, slug, level, parent_id')
    .in('level', [2, 3])
    .order('level', { ascending: true })
    .order('label', { ascending: true });

  categoryCache = (data ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    slug: r.slug,
    level: r.level,
    parentId: r.parent_id,
  }));

  return categoryCache;
}

// =============================================================================
// Scoring helpers
// =============================================================================

/**
 * Scores how well `candidate` matches `query` (both already lowercased).
 *
 * Scoring tiers:
 * - 1.0  exact match
 * - 0.8  one contains the other
 * - 0–0.6  proportional word overlap
 */
function labelSimilarity(query: string, candidate: string): number {
  if (query === candidate) return 1.0;
  if (candidate.includes(query) || query.includes(candidate)) return 0.8;

  const qWords = query.split(/[\s&/,()-]+/).filter((w) => w.length >= 2);
  const cWords = candidate.split(/[\s&/,()-]+/).filter((w) => w.length >= 2);
  if (qWords.length === 0 || cWords.length === 0) return 0;

  const overlap = qWords.filter((w) => cWords.includes(w)).length;
  return (0.6 * overlap) / Math.max(qWords.length, cWords.length);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Finds the best level-3 product type ID for an AI-detected gear item.
 *
 * @param supabase - Server-side Supabase client (authenticated or service role)
 * @param aiCategory - Free-form category string returned by the AI (e.g. "Tents")
 * @param productName - Product name returned by the AI (e.g. "Alto TR2 Tarp Shelter")
 * @returns Level-3 category UUID, or `null` if no confident match is found
 */
export async function resolveProductTypeId(
  supabase: SupabaseClient<Database>,
  aiCategory: string,
  productName: string
): Promise<string | null> {
  const categories = await loadCategories(supabase);

  const level2 = categories.filter((c) => c.level === 2);
  const level3 = categories.filter((c) => c.level === 3);

  // ── Step 1: best level-2 match for the AI category ──────────────────────────
  const normalizedCat = aiCategory.toLowerCase().trim();

  let bestL2: CategoryNode | null = null;
  let bestL2Score = 0;

  for (const cat of level2) {
    const score = labelSimilarity(normalizedCat, cat.label.toLowerCase());
    if (score > bestL2Score) {
      bestL2Score = score;
      bestL2 = cat;
    }
  }

  // Require a minimum confidence to avoid wild mismatches
  if (!bestL2 || bestL2Score < 0.3) return null;

  // ── Step 2: best level-3 child by product name keywords ─────────────────────
  const children = level3.filter((c) => c.parentId === bestL2!.id);

  if (children.length === 0) return null;
  if (children.length === 1) return children[0].id;

  const nameWords = productName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // If the product name gives us nothing useful, return the first child
  if (nameWords.length === 0) return children[0].id;

  let bestL3: CategoryNode = children[0];
  let bestL3Score = 0;

  for (const child of children) {
    const label = child.label.toLowerCase();
    const matches = nameWords.filter((w) => label.includes(w)).length;
    const score = matches / nameWords.length;

    if (score > bestL3Score) {
      bestL3Score = score;
      bestL3 = child;
    }
  }

  return bestL3.id;
}

/**
 * Invalidates the module-level category cache.
 * Useful in tests or when categories are known to have changed.
 */
export function clearCategoryCache(): void {
  categoryCache = null;
}
