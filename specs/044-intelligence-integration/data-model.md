# Data Model: Intelligence Integration (Categories & Autocomplete)

**Feature**: 044-intelligence-integration
**Date**: 2025-12-11

## Overview

This feature uses **existing data models** from Features 042 and 043. No new entities are introduced.

## Existing Entities

### Category (from Feature 043)

**Source**: `types/category.ts`
**Table**: `categories`

```typescript
interface Category {
  id: string;           // UUID primary key
  parentId: string | null; // Parent category ID (null for level 1)
  level: 1 | 2 | 3;     // Hierarchy level
  label: string;        // Legacy English label
  slug: string;         // Unique identifier (e.g., "shelter-tents-ultralight")
  i18n: CategoryI18n;   // Localized labels { en, de, ... }
  createdAt: string;    // ISO timestamp
}

interface CategoryI18n {
  en: string;           // English (required, fallback)
  de?: string;          // German (optional)
  [locale: string]: string | undefined; // Extensible
}
```

**Relationships**:
- Self-referential: `parentId` → `Category.id`
- Level 1 (Main) → Level 2 (Sub) → Level 3 (Type)

**Derived Types**:

```typescript
// Hierarchical tree node
interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

// Flattened option for Select components
interface CategoryOption {
  value: string;        // Category UUID
  label: string;        // Localized label
  level: 1 | 2 | 3;
  parentId: string | null;
}
```

---

### CatalogBrand (from Feature 042)

**Source**: `types/catalog.ts`
**Table**: `catalog_brands`

```typescript
interface CatalogBrand {
  id: string;           // UUID primary key
  externalId: string;   // External system ID
  name: string;         // Display name
  nameNormalized: string; // Lowercase for search
  logoUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Search Result Type**:

```typescript
interface BrandSuggestion {
  id: string;
  name: string;
  logoUrl: string | null;
  similarity: number;   // 0.0 - 1.0 match score
}
```

---

## Database Schema

### categories (existing)

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id),
  level SMALLINT NOT NULL CHECK (level IN (1, 2, 3)),
  label TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  i18n JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);
CREATE INDEX idx_categories_slug ON categories(slug);
```

### catalog_brands (existing)

```sql
CREATE TABLE catalog_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigram index for fuzzy search
CREATE INDEX idx_catalog_brands_name_trgm
  ON catalog_brands USING gin (name_normalized gin_trgm_ops);
```

---

## State Management

### Category State (useCategories hook)

```typescript
interface UseCategoriesReturn {
  categories: Category[];           // All categories (flat)
  hierarchy: CategoryWithChildren[]; // Tree structure
  isLoading: boolean;
  error: string | null;
  getOptionsForLevel: (level: 1|2|3, parentId?: string) => CategoryOption[];
  getLabelById: (id: string) => string;
  refresh: () => Promise<void>;
}
```

**Caching Strategy**: Categories are fetched once on hook mount and stored in component state. Cache is cleared on page refresh (acceptable per FR-002).

### Brand Autocomplete State (useBrandAutocomplete hook)

```typescript
interface UseBrandAutocompleteReturn {
  suggestions: BrandSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;  // Debounced, min 2 chars
  clear: () => void;
}
```

**Debounce**: 300ms (per FR-007)
**Minimum Characters**: 2 (per FR-006)

---

## Form Integration

### Gear Item Form Fields

The gear editor form stores category selections as UUIDs:

```typescript
interface GearItemFormData {
  // ... other fields
  categoryId: string;      // Level 1 category UUID
  subcategoryId: string;   // Level 2 subcategory UUID
  productTypeId: string;   // Level 3 product type UUID
  brand: string;           // Free-text brand name (not FK)
}
```

**Note**: The `brand` field stores the string value, not a foreign key to `catalog_brands`. This allows users to enter custom brands not in the database (per FR-008).

---

## No New Migrations Required

All database tables and indexes already exist from Features 042 and 043.
