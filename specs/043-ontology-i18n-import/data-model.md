# Data Model: Ontology Import & Category Internationalization

**Feature**: 043-ontology-i18n-import
**Date**: 2025-12-10

## Entity Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        categories                            │
├─────────────────────────────────────────────────────────────┤
│ id          : UUID (PK)                                      │
│ parent_id   : UUID (FK → categories.id, nullable)           │
│ level       : INTEGER (1-3)                                  │
│ label       : TEXT (legacy, for backward compat)            │
│ slug        : TEXT (UNIQUE, NOT NULL) ← NEW                 │
│ i18n        : JSONB ← NEW                                   │
│ created_at  : TIMESTAMPTZ                                   │
└─────────────────────────────────────────────────────────────┘
         │
         │ self-referential (parent_id)
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Level 1: Categories (parent_id = NULL)                      │
│   e.g., slug: "shelter", i18n: {"en":"Shelter","de":"Schutz"}│
├─────────────────────────────────────────────────────────────┤
│ Level 2: Subcategories (parent_id → L1)                     │
│   e.g., slug: "tents", i18n: {"en":"Tents","de":"Zelte"}    │
├─────────────────────────────────────────────────────────────┤
│ Level 3: Product Types (parent_id → L2)                     │
│   e.g., slug: "dome_tents", i18n: {"en":"Dome Tents",...}   │
└─────────────────────────────────────────────────────────────┘
```

## Entity: Category (Updated)

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| parent_id | UUID | FK → categories.id, ON DELETE CASCADE, nullable | Parent category reference |
| level | INTEGER | NOT NULL, CHECK (1-3) | Hierarchy level |
| label | TEXT | NOT NULL | Legacy label (English, for backward compat) |
| slug | TEXT | UNIQUE, NOT NULL | Stable identifier (e.g., 'rain_jackets') |
| i18n | JSONB | DEFAULT '{}' | Translations: `{"en": "...", "de": "..."}` |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| categories_pkey | id | B-tree (PK) | Primary key lookup |
| idx_categories_parent | parent_id | B-tree | Hierarchy traversal |
| idx_categories_level | level | B-tree | Level filtering |
| idx_categories_slug | slug | B-tree (UNIQUE) | Slug lookup, upsert conflict |

### Constraints

- `slug` must be unique across all categories
- `slug` format: lowercase alphanumeric with underscores (e.g., 'rain_jackets')
- `level` must be 1, 2, or 3
- `parent_id` NULL only for level 1 categories
- `i18n` must contain at least 'en' key

### Validation Rules

```typescript
// Zod schema for category
const CategorySchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  level: z.number().int().min(1).max(3),
  label: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9_]+$/),
  i18n: z.record(z.string(), z.string()).refine(
    (obj) => 'en' in obj,
    { message: 'i18n must contain "en" key' }
  ),
  created_at: z.string().datetime(),
});
```

## Entity: Ontology JSON (Input)

### Structure

```typescript
interface OntologyItem {
  slug: string;      // e.g., "shelter"
  en: string;        // English label
  de: string;        // German label
  subcategories?: OntologyItem[];  // Level 2 (only on L1)
  productTypes?: OntologyItem[];   // Level 3 (only on L2)
}

interface OntologyFile {
  categories: OntologyItem[];  // Level 1 items
}
```

### Example JSON Structure

```json
{
  "categories": [
    {
      "slug": "shelter",
      "en": "Shelter",
      "de": "Unterkunft",
      "subcategories": [
        {
          "slug": "tents",
          "en": "Tents",
          "de": "Zelte",
          "productTypes": [
            {
              "slug": "dome_tents",
              "en": "Dome Tents",
              "de": "Kuppelzelte"
            },
            {
              "slug": "tunnel_tents",
              "en": "Tunnel Tents",
              "de": "Tunnelzelte"
            }
          ]
        }
      ]
    }
  ]
}
```

## TypeScript Types

### types/category.ts (NEW)

```typescript
/**
 * Category i18n translations
 */
export interface CategoryI18n {
  en: string;
  de?: string;
  [locale: string]: string | undefined;
}

/**
 * Category entity from database
 */
export interface Category {
  id: string;
  parentId: string | null;
  level: 1 | 2 | 3;
  label: string;
  slug: string;
  i18n: CategoryI18n;
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
  value: string;  // id
  label: string;  // localized label
  level: 1 | 2 | 3;
  parentId: string | null;
}
```

### types/database.ts (UPDATE)

```typescript
// Update categories table type
categories: {
  Row: {
    id: string;
    parent_id: string | null;
    level: number;
    label: string;
    slug: string;           // NEW
    i18n: Json;             // NEW (JSONB)
    created_at: string;
  };
  Insert: {
    id?: string;
    parent_id?: string | null;
    level: number;
    label: string;
    slug: string;           // NEW (required)
    i18n?: Json;            // NEW (optional, defaults to {})
    created_at?: string;
  };
  Update: {
    id?: string;
    parent_id?: string | null;
    level?: number;
    label?: string;
    slug?: string;          // NEW
    i18n?: Json;            // NEW
    created_at?: string;
  };
  // ... relationships unchanged
};
```

## State Transitions

Categories are static reference data. No state machine required.

**Lifecycle**:
1. Created via seed script (INSERT)
2. Updated via seed script re-run (UPSERT on slug conflict)
3. Deleted only when seed script runs with replace strategy

## Relationships

```
gear_items.category_id      → categories.id (ON DELETE SET NULL)
gear_items.subcategory_id   → categories.id (ON DELETE SET NULL)
gear_items.product_type_id  → categories.id (ON DELETE SET NULL)
categories.parent_id        → categories.id (ON DELETE CASCADE)
```

**Impact of category deletion**:
- Child categories: Cascade deleted
- gear_items references: Set to NULL (users must re-categorize)
