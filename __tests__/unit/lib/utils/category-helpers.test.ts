/**
 * Category Helper Functions Tests
 *
 * Tests for category localization, hierarchy building,
 * path resolution, and product type matching.
 */

import { describe, it, expect } from 'vitest';
import {
  getLocalizedLabel,
  getCategoryHierarchy,
  getCategoryOptions,
  getCategoryPath,
  getCategorySlugPath,
  getParentCategoryIds,
  findProductTypeId,
} from '@/lib/utils/category-helpers';
import type { Category } from '@/types/category';

// =============================================================================
// Test Data - Outdoor Gear Category Hierarchy
// =============================================================================

const mockCategories: Category[] = [
  // Level 1 - Root categories
  {
    id: 'shelter',
    slug: 'shelter',
    label: 'Shelter',
    level: 1,
    parentId: null,
    icon: 'tent',
    i18n: { en: 'Shelter', de: 'Unterkunft' },
  },
  {
    id: 'sleep',
    slug: 'sleep',
    label: 'Sleep System',
    level: 1,
    parentId: null,
    icon: 'moon',
    i18n: { en: 'Sleep System', de: 'Schlafsystem' },
  },
  {
    id: 'pack',
    slug: 'pack',
    label: 'Packs',
    level: 1,
    parentId: null,
    icon: 'backpack',
    i18n: { en: 'Packs', de: 'Rucksäcke' },
  },

  // Level 2 - Subcategories
  {
    id: 'shelter-tents',
    slug: 'tents',
    label: 'Tents',
    level: 2,
    parentId: 'shelter',
    icon: 'tent',
    i18n: { en: 'Tents', de: 'Zelte' },
  },
  {
    id: 'shelter-tarps',
    slug: 'tarps',
    label: 'Tarps',
    level: 2,
    parentId: 'shelter',
    icon: 'tarp',
    i18n: { en: 'Tarps', de: 'Tarps' },
  },
  {
    id: 'sleep-bags',
    slug: 'sleeping-bags',
    label: 'Sleeping Bags',
    level: 2,
    parentId: 'sleep',
    icon: 'sleeping-bag',
    i18n: { en: 'Sleeping Bags', de: 'Schlafsäcke' },
  },
  {
    id: 'sleep-quilts',
    slug: 'quilts',
    label: 'Quilts',
    level: 2,
    parentId: 'sleep',
    icon: 'quilt',
    i18n: { en: 'Quilts', de: 'Quilts' },
  },
  {
    id: 'pack-backpacks',
    slug: 'backpacks',
    label: 'Backpacks',
    level: 2,
    parentId: 'pack',
    icon: 'backpack',
    i18n: { en: 'Backpacks', de: 'Rucksäcke' },
  },

  // Level 3 - Product types
  {
    id: 'shelter-tents-2p',
    slug: '2-person',
    label: '2-Person Tents',
    level: 3,
    parentId: 'shelter-tents',
    icon: 'tent',
    i18n: { en: '2-Person Tents', de: '2-Personen-Zelte' },
  },
  {
    id: 'shelter-tents-1p',
    slug: '1-person',
    label: '1-Person Tents',
    level: 3,
    parentId: 'shelter-tents',
    icon: 'tent',
    i18n: { en: '1-Person Tents', de: '1-Personen-Zelte' },
  },
  {
    id: 'sleep-quilts-down',
    slug: 'down-quilts',
    label: 'Down Quilts',
    level: 3,
    parentId: 'sleep-quilts',
    icon: 'quilt',
    i18n: { en: 'Down Quilts', de: 'Daunen-Quilts' },
  },
  {
    id: 'pack-backpacks-ul',
    slug: 'ultralight',
    label: 'Ultralight Backpacks',
    level: 3,
    parentId: 'pack-backpacks',
    icon: 'backpack',
    i18n: { en: 'Ultralight Backpacks', de: 'Ultraleicht-Rucksäcke' },
  },
];

// =============================================================================
// getLocalizedLabel Tests
// =============================================================================

describe('getLocalizedLabel', () => {
  it('should return English label for en locale', () => {
    const category = mockCategories.find((c) => c.id === 'shelter')!;
    expect(getLocalizedLabel(category, 'en')).toBe('Shelter');
  });

  it('should return German label for de locale', () => {
    const category = mockCategories.find((c) => c.id === 'shelter')!;
    expect(getLocalizedLabel(category, 'de')).toBe('Unterkunft');
  });

  it('should fallback to English for unknown locale', () => {
    const category = mockCategories.find((c) => c.id === 'shelter')!;
    expect(getLocalizedLabel(category, 'fr')).toBe('Shelter');
  });

  it('should fallback to label field when i18n is null', () => {
    const category = { label: 'Test Category', i18n: null };
    expect(getLocalizedLabel(category, 'en')).toBe('Test Category');
  });

  it('should fallback to label field when i18n is undefined', () => {
    const category = { label: 'Fallback Label' };
    expect(getLocalizedLabel(category, 'de')).toBe('Fallback Label');
  });

  it('should handle deep nested localization', () => {
    const category = mockCategories.find((c) => c.id === 'shelter-tents-2p')!;
    expect(getLocalizedLabel(category, 'de')).toBe('2-Personen-Zelte');
  });
});

// =============================================================================
// getCategoryHierarchy Tests
// =============================================================================

describe('getCategoryHierarchy', () => {
  it('should return root categories at top level', () => {
    const hierarchy = getCategoryHierarchy(mockCategories, 'en');
    expect(hierarchy.length).toBe(3); // shelter, sleep, pack
    expect(hierarchy.map((c) => c.id)).toContain('shelter');
    expect(hierarchy.map((c) => c.id)).toContain('sleep');
    expect(hierarchy.map((c) => c.id)).toContain('pack');
  });

  it('should nest level 2 categories under level 1', () => {
    const hierarchy = getCategoryHierarchy(mockCategories, 'en');
    const shelter = hierarchy.find((c) => c.id === 'shelter')!;
    expect(shelter.children.length).toBe(2); // tents, tarps
    expect(shelter.children.map((c) => c.id)).toContain('shelter-tents');
    expect(shelter.children.map((c) => c.id)).toContain('shelter-tarps');
  });

  it('should nest level 3 categories under level 2', () => {
    const hierarchy = getCategoryHierarchy(mockCategories, 'en');
    const shelter = hierarchy.find((c) => c.id === 'shelter')!;
    const tents = shelter.children.find((c) => c.id === 'shelter-tents')!;
    expect(tents.children.length).toBe(2); // 1p, 2p
    expect(tents.children.map((c) => c.id)).toContain('shelter-tents-1p');
    expect(tents.children.map((c) => c.id)).toContain('shelter-tents-2p');
  });

  it('should sort categories alphabetically by localized label', () => {
    const hierarchy = getCategoryHierarchy(mockCategories, 'en');
    const labels = hierarchy.map((c) => getLocalizedLabel(c, 'en'));
    expect(labels).toEqual(['Packs', 'Shelter', 'Sleep System']);
  });

  it('should sort children alphabetically', () => {
    const hierarchy = getCategoryHierarchy(mockCategories, 'en');
    const shelter = hierarchy.find((c) => c.id === 'shelter')!;
    const childLabels = shelter.children.map((c) => getLocalizedLabel(c, 'en'));
    expect(childLabels).toEqual(['Tarps', 'Tents']);
  });

  it('should handle empty categories array', () => {
    const hierarchy = getCategoryHierarchy([], 'en');
    expect(hierarchy).toEqual([]);
  });

  it('should handle German locale sorting', () => {
    const hierarchy = getCategoryHierarchy(mockCategories, 'de');
    // German labels: Rucksäcke, Schlafsystem, Unterkunft
    const labels = hierarchy.map((c) => getLocalizedLabel(c, 'de'));
    expect(labels).toEqual(['Rucksäcke', 'Schlafsystem', 'Unterkunft']);
  });
});

// =============================================================================
// getCategoryOptions Tests
// =============================================================================

describe('getCategoryOptions', () => {
  it('should return all categories as options', () => {
    const options = getCategoryOptions(mockCategories, 'en');
    expect(options.length).toBe(mockCategories.length);
  });

  it('should filter by level', () => {
    const level1Options = getCategoryOptions(mockCategories, 'en', 1);
    expect(level1Options.length).toBe(3);
    expect(level1Options.every((o) => o.level === 1)).toBe(true);

    const level2Options = getCategoryOptions(mockCategories, 'en', 2);
    expect(level2Options.length).toBe(5);
    expect(level2Options.every((o) => o.level === 2)).toBe(true);

    const level3Options = getCategoryOptions(mockCategories, 'en', 3);
    expect(level3Options.length).toBe(4);
    expect(level3Options.every((o) => o.level === 3)).toBe(true);
  });

  it('should filter by parent ID', () => {
    const shelterChildren = getCategoryOptions(mockCategories, 'en', undefined, 'shelter');
    expect(shelterChildren.length).toBe(2); // tents, tarps
    expect(shelterChildren.every((o) => o.parentId === 'shelter')).toBe(true);
  });

  it('should filter by both level and parent', () => {
    const tentTypes = getCategoryOptions(mockCategories, 'en', 3, 'shelter-tents');
    expect(tentTypes.length).toBe(2); // 1p, 2p tents
  });

  it('should return sorted options by label', () => {
    const options = getCategoryOptions(mockCategories, 'en', 1);
    const labels = options.map((o) => o.label);
    expect(labels).toEqual(['Packs', 'Shelter', 'Sleep System']);
  });

  it('should use localized labels', () => {
    const options = getCategoryOptions(mockCategories, 'de', 1);
    expect(options.map((o) => o.label)).toContain('Unterkunft');
    expect(options.map((o) => o.label)).toContain('Schlafsystem');
  });

  it('should include value, label, level, and parentId', () => {
    const options = getCategoryOptions(mockCategories, 'en', 2, 'shelter');
    const tentsOption = options.find((o) => o.value === 'shelter-tents')!;
    expect(tentsOption).toEqual({
      value: 'shelter-tents',
      label: 'Tents',
      level: 2,
      parentId: 'shelter',
    });
  });

  it('should handle filter for null parent (root categories)', () => {
    const rootOptions = getCategoryOptions(mockCategories, 'en', undefined, null);
    expect(rootOptions.length).toBe(3);
    expect(rootOptions.every((o) => o.parentId === null)).toBe(true);
  });
});

// =============================================================================
// getCategoryPath Tests
// =============================================================================

describe('getCategoryPath', () => {
  it('should return path for level 1 category', () => {
    const path = getCategoryPath('shelter', mockCategories, 'en');
    expect(path).toEqual(['Shelter']);
  });

  it('should return path for level 2 category', () => {
    const path = getCategoryPath('shelter-tents', mockCategories, 'en');
    expect(path).toEqual(['Shelter', 'Tents']);
  });

  it('should return path for level 3 category', () => {
    const path = getCategoryPath('shelter-tents-2p', mockCategories, 'en');
    expect(path).toEqual(['Shelter', 'Tents', '2-Person Tents']);
  });

  it('should use localized labels', () => {
    const path = getCategoryPath('shelter-tents-2p', mockCategories, 'de');
    expect(path).toEqual(['Unterkunft', 'Zelte', '2-Personen-Zelte']);
  });

  it('should return empty array for non-existent category', () => {
    const path = getCategoryPath('non-existent', mockCategories, 'en');
    expect(path).toEqual([]);
  });

  it('should handle sleep system hierarchy', () => {
    const path = getCategoryPath('sleep-quilts-down', mockCategories, 'en');
    expect(path).toEqual(['Sleep System', 'Quilts', 'Down Quilts']);
  });
});

// =============================================================================
// getCategorySlugPath Tests
// =============================================================================

describe('getCategorySlugPath', () => {
  it('should return slug path for level 1 category', () => {
    const path = getCategorySlugPath('shelter', mockCategories);
    expect(path).toEqual(['shelter']);
  });

  it('should return slug path for level 2 category', () => {
    const path = getCategorySlugPath('shelter-tents', mockCategories);
    expect(path).toEqual(['shelter', 'tents']);
  });

  it('should return slug path for level 3 category', () => {
    const path = getCategorySlugPath('shelter-tents-2p', mockCategories);
    expect(path).toEqual(['shelter', 'tents', '2-person']);
  });

  it('should return empty array for non-existent category', () => {
    const path = getCategorySlugPath('non-existent', mockCategories);
    expect(path).toEqual([]);
  });

  it('should return stable slugs regardless of locale', () => {
    // Slugs should be the same regardless of display locale
    const pathEn = getCategorySlugPath('sleep-quilts-down', mockCategories);
    expect(pathEn).toEqual(['sleep', 'quilts', 'down-quilts']);
  });
});

// =============================================================================
// getParentCategoryIds Tests
// =============================================================================

describe('getParentCategoryIds', () => {
  it('should return parent IDs for valid product type', () => {
    const result = getParentCategoryIds('shelter-tents-2p', mockCategories);
    expect(result).toEqual({
      categoryId: 'shelter',
      subcategoryId: 'shelter-tents',
    });
  });

  it('should return nulls for null input', () => {
    const result = getParentCategoryIds(null, mockCategories);
    expect(result).toEqual({
      categoryId: null,
      subcategoryId: null,
    });
  });

  it('should return nulls for non-existent category', () => {
    const result = getParentCategoryIds('non-existent', mockCategories);
    expect(result).toEqual({
      categoryId: null,
      subcategoryId: null,
    });
  });

  it('should return nulls for level 2 category (not a product type)', () => {
    const result = getParentCategoryIds('shelter-tents', mockCategories);
    expect(result).toEqual({
      categoryId: null,
      subcategoryId: null,
    });
  });

  it('should return nulls for level 1 category', () => {
    const result = getParentCategoryIds('shelter', mockCategories);
    expect(result).toEqual({
      categoryId: null,
      subcategoryId: null,
    });
  });

  it('should handle pack hierarchy', () => {
    const result = getParentCategoryIds('pack-backpacks-ul', mockCategories);
    expect(result).toEqual({
      categoryId: 'pack',
      subcategoryId: 'pack-backpacks',
    });
  });
});

// =============================================================================
// findProductTypeId Tests
// =============================================================================

describe('findProductTypeId', () => {
  it('should find product type by exact labels', () => {
    const result = findProductTypeId(
      {
        category: 'Shelter',
        subcategory: 'Tents',
        productType: '2-Person Tents',
      },
      mockCategories,
      'en'
    );
    expect(result).toBe('shelter-tents-2p');
  });

  it('should be case insensitive', () => {
    const result = findProductTypeId(
      {
        category: 'shelter',
        subcategory: 'tents',
        productType: '2-person tents',
      },
      mockCategories,
      'en'
    );
    expect(result).toBe('shelter-tents-2p');
  });

  it('should return null for non-existent category', () => {
    const result = findProductTypeId(
      {
        category: 'Cooking',
        subcategory: 'Stoves',
        productType: 'Gas Stoves',
      },
      mockCategories,
      'en'
    );
    expect(result).toBeNull();
  });

  it('should return null for non-existent subcategory', () => {
    const result = findProductTypeId(
      {
        category: 'Shelter',
        subcategory: 'Hammocks',
        productType: 'Camping Hammocks',
      },
      mockCategories,
      'en'
    );
    expect(result).toBeNull();
  });

  it('should return null for non-existent product type', () => {
    const result = findProductTypeId(
      {
        category: 'Shelter',
        subcategory: 'Tents',
        productType: '4-Person Tents',
      },
      mockCategories,
      'en'
    );
    expect(result).toBeNull();
  });

  it('should find using German labels', () => {
    const result = findProductTypeId(
      {
        category: 'Unterkunft',
        subcategory: 'Zelte',
        productType: '2-Personen-Zelte',
      },
      mockCategories,
      'de'
    );
    expect(result).toBe('shelter-tents-2p');
  });

  it('should find quilt product type', () => {
    const result = findProductTypeId(
      {
        category: 'Sleep System',
        subcategory: 'Quilts',
        productType: 'Down Quilts',
      },
      mockCategories,
      'en'
    );
    expect(result).toBe('sleep-quilts-down');
  });

  it('should use en as default locale', () => {
    const result = findProductTypeId(
      {
        category: 'Shelter',
        subcategory: 'Tents',
        productType: '1-Person Tents',
      },
      mockCategories
    );
    expect(result).toBe('shelter-tents-1p');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle categories with missing i18n keys', () => {
    const partialI18n: Category = {
      id: 'test',
      slug: 'test',
      label: 'Test',
      level: 1,
      parentId: null,
      icon: 'test',
      i18n: { en: 'English Only' }, // Missing 'de'
    };
    expect(getLocalizedLabel(partialI18n, 'de')).toBe('English Only');
  });

  it('should handle orphaned categories (parent not in array)', () => {
    const orphaned: Category[] = [
      { id: 'child', slug: 'child', label: 'Child', level: 2, parentId: 'missing', icon: 'x', i18n: null },
    ];
    const hierarchy = getCategoryHierarchy(orphaned, 'en');
    // Orphaned category should not appear at root level
    expect(hierarchy.length).toBe(0);
  });

  it('should handle special characters in labels', () => {
    const special: Category = {
      id: 'special',
      slug: 'special',
      label: 'Tent & Tarp (2024)',
      level: 1,
      parentId: null,
      icon: 'tent',
      i18n: { en: 'Tent & Tarp (2024)' },
    };
    expect(getLocalizedLabel(special, 'en')).toBe('Tent & Tarp (2024)');
  });

  it('should handle unicode in labels', () => {
    const unicode: Category = {
      id: 'unicode',
      slug: 'unicode',
      label: 'Rücksäcke',
      level: 1,
      parentId: null,
      icon: 'pack',
      i18n: { de: 'Rücksäcke', en: 'Backpacks' },
    };
    expect(getLocalizedLabel(unicode, 'de')).toBe('Rücksäcke');
  });
});
