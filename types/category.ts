/**
 * Category Types
 *
 * Feature: 043-ontology-i18n-import
 * Task: T007
 *
 * TypeScript interfaces for categories with i18n support.
 */

/**
 * Category i18n translations
 * Stores localized labels for different locales
 */
export interface CategoryI18n {
  /** English label (required, fallback) */
  en: string;
  /** German label (optional) */
  de?: string;
  /** Support for additional locales */
  [locale: string]: string | undefined;
}

/**
 * Category entity from database
 * Represents a gear classification at any level (1-3)
 */
export interface Category {
  /** UUID primary key */
  id: string;
  /** Parent category ID (null for level 1) */
  parentId: string | null;
  /** Hierarchy level: 1=category, 2=subcategory, 3=product type */
  level: 1 | 2 | 3;
  /** Legacy label (English, for backward compatibility) */
  label: string;
  /** Unique identifier for upsert operations */
  slug: string;
  /** Localized labels */
  i18n: CategoryI18n;
  /** Display order within parent category (for admin sorting) */
  sortOrder: number;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Category with children (for hierarchical display)
 */
export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

/**
 * Flattened category for Select component
 */
export interface CategoryOption {
  /** Category UUID */
  value: string;
  /** Localized label */
  label: string;
  /** Hierarchy level */
  level: 1 | 2 | 3;
  /** Parent category ID */
  parentId: string | null;
}

/**
 * Ontology item from JSON import file
 */
export interface OntologyItem {
  /** Unique slug identifier */
  slug: string;
  /** English label */
  en: string;
  /** German label */
  de: string;
  /** Level 2 children (only on L1 items) */
  subcategories?: OntologyItem[];
  /** Level 3 children (only on L2 items) */
  productTypes?: OntologyItem[];
}

/**
 * Root structure of ontology JSON file
 */
export interface OntologyFile {
  /** Level 1 categories */
  categories: OntologyItem[];
}
