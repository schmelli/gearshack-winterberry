/**
 * Category Helper Functions
 *
 * Feature: 043-ontology-i18n-import
 * Tasks: T020, T025
 *
 * Utilities for working with localized categories.
 */

import type { Category, CategoryI18n, CategoryOption, CategoryWithChildren } from '@/types/category';

/**
 * Gets the localized label for a category.
 * Falls back to English, then to the legacy label field.
 *
 * @param category - The category object
 * @param locale - The desired locale (e.g., 'en', 'de')
 * @returns The localized label string
 */
export function getLocalizedLabel(
  category: { i18n?: CategoryI18n | null; label: string },
  locale: string
): string {
  if (!category.i18n) return category.label;
  return category.i18n[locale] ?? category.i18n.en ?? category.label;
}

/**
 * Transforms a flat array of categories into a hierarchical structure.
 * Used for cascading select components.
 *
 * @param categories - Flat array of categories
 * @param locale - Locale for labels
 * @returns Hierarchical category tree (level 1 at root)
 */
export function getCategoryHierarchy(
  categories: Category[],
  locale: string
): CategoryWithChildren[] {
  // Create a map for quick lookup
  const categoryMap = new Map<string, CategoryWithChildren>();

  // Initialize all categories with empty children
  for (const cat of categories) {
    categoryMap.set(cat.id, {
      ...cat,
      children: [],
    });
  }

  // Build the hierarchy
  const roots: CategoryWithChildren[] = [];

  for (const cat of categories) {
    const node = categoryMap.get(cat.id)!;

    if (cat.parentId === null) {
      // Level 1: Add to roots
      roots.push(node);
    } else {
      // Level 2 or 3: Add to parent's children
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  // Sort children by label within each level
  const sortByLabel = (a: CategoryWithChildren, b: CategoryWithChildren) =>
    getLocalizedLabel(a, locale).localeCompare(getLocalizedLabel(b, locale));

  roots.sort(sortByLabel);
  for (const root of roots) {
    root.children.sort(sortByLabel);
    for (const child of root.children) {
      child.children.sort(sortByLabel);
    }
  }

  return roots;
}

/**
 * Transforms categories into flat options for Select component.
 *
 * @param categories - Array of categories
 * @param locale - Locale for labels
 * @param level - Optional: filter by level (1, 2, or 3)
 * @param parentId - Optional: filter by parent ID
 * @returns Array of category options for Select
 */
export function getCategoryOptions(
  categories: Category[],
  locale: string,
  level?: 1 | 2 | 3,
  parentId?: string | null
): CategoryOption[] {
  let filtered = categories;

  if (level !== undefined) {
    filtered = filtered.filter((c) => c.level === level);
  }

  if (parentId !== undefined) {
    filtered = filtered.filter((c) => c.parentId === parentId);
  }

  return filtered
    .map((cat) => ({
      value: cat.id,
      label: getLocalizedLabel(cat, locale),
      level: cat.level,
      parentId: cat.parentId,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Gets the full category path (breadcrumb) for a category.
 *
 * @param categoryId - The category ID
 * @param categories - All categories
 * @param locale - Locale for labels
 * @returns Array of labels from root to category, e.g., ["Shelter", "Tents", "Dome Tents"]
 */
export function getCategoryPath(
  categoryId: string,
  categories: Category[],
  locale: string
): string[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const path: string[] = [];

  let current = categoryMap.get(categoryId);
  while (current) {
    path.unshift(getLocalizedLabel(current, locale));
    current = current.parentId ? categoryMap.get(current.parentId) : undefined;
  }

  return path;
}

/**
 * Derives parent category IDs from a product type ID.
 * Used for filtering and backward compatibility.
 *
 * Feature: Cascading Category Refactor (Phase 2)
 *
 * @param productTypeId - The product type (level 3) category ID
 * @param categories - All categories
 * @returns Object with categoryId (level 1) and subcategoryId (level 2), or nulls if not found
 */
export function getParentCategoryIds(
  productTypeId: string | null,
  categories: Category[]
): { categoryId: string | null; subcategoryId: string | null } {
  if (!productTypeId) {
    return { categoryId: null, subcategoryId: null };
  }

  const productType = categories.find((c) => c.id === productTypeId);
  if (!productType || productType.level !== 3) {
    return { categoryId: null, subcategoryId: null };
  }

  const subcategory = categories.find((c) => c.id === productType.parentId);
  if (!subcategory || subcategory.level !== 2) {
    return { categoryId: null, subcategoryId: null };
  }

  const category = categories.find((c) => c.id === subcategory.parentId);

  return {
    categoryId: category?.id || null,
    subcategoryId: subcategory.id,
  };
}

/**
 * Finds a product type ID by fuzzy matching category labels.
 * Used for GearGraph auto-fill integration.
 *
 * Feature: Cascading Category Refactor (Phase 6)
 *
 * @param labels - Object with category, subcategory, and productType labels
 * @param categories - All categories
 * @param locale - Locale for label matching (defaults to 'en')
 * @returns The product type (level 3) category ID, or null if not found
 */
export function findProductTypeId(
  labels: {
    category: string;
    subcategory: string;
    productType: string;
  },
  categories: Category[],
  locale: string = 'en'
): string | null {
  // Step 1: Find category (level 1)
  const category = categories
    .filter((c) => c.level === 1)
    .find((c) => getLocalizedLabel(c, locale).toLowerCase() === labels.category.toLowerCase());

  if (!category) return null;

  // Step 2: Find subcategory (level 2)
  const subcategory = categories
    .filter((c) => c.level === 2 && c.parentId === category.id)
    .find((c) => getLocalizedLabel(c, locale).toLowerCase() === labels.subcategory.toLowerCase());

  if (!subcategory) return null;

  // Step 3: Find product type (level 3)
  const productType = categories
    .filter((c) => c.level === 3 && c.parentId === subcategory.id)
    .find((c) => getLocalizedLabel(c, locale).toLowerCase() === labels.productType.toLowerCase());

  return productType?.id || null;
}
