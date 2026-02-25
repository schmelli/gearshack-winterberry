# Quickstart: Ontology Import & Category Internationalization

**Feature**: 043-ontology-i18n-import
**Date**: 2025-12-10

## Prerequisites

- Supabase project with database access
- Node.js 18+ installed
- `.env.local` with Supabase credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

## Setup Steps

### 1. Install Dependencies

```bash
npm install --save-dev tsx
```

### 2. Run Database Migration

Apply the schema migration to add `slug` and `i18n` columns:

**Option A: Supabase Dashboard**
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `specs/043-ontology-i18n-import/contracts/categories-i18n-migration.sql`
3. Execute the SQL

**Option B: Supabase CLI**
```bash
# Copy migration to supabase/migrations folder
cp specs/043-ontology-i18n-import/contracts/categories-i18n-migration.sql \
   supabase/migrations/20251211_categories_i18n.sql

# Push migration
supabase db push
```

### 3. Prepare Ontology JSON

Place your `Hiking_Gear_Ontology_i18n.json` file:

```bash
mkdir -p scripts/data
# Copy your ontology file to:
# scripts/data/Hiking_Gear_Ontology_i18n.json
```

**Expected JSON structure**:
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
            { "slug": "dome_tents", "en": "Dome Tents", "de": "Kuppelzelte" }
          ]
        }
      ]
    }
  ]
}
```

### 4. Run Seed Script

```bash
npm run seed:ontology
```

Or directly:
```bash
npx tsx scripts/seed-ontology.ts
```

### 5. Verify Import

Check Supabase Dashboard > Table Editor > categories:
- All categories should have `slug` and `i18n` populated
- Hierarchy levels (1, 2, 3) should be correct
- Parent-child relationships should be established

## Usage in Frontend

### Fetching Categories with Localization

```typescript
// hooks/useCategories.ts
import { useLocale } from 'next-intl';
import { getLocalizedLabel } from '@/lib/utils/category-helpers';

export function useCategories() {
  const locale = useLocale();
  // ... fetch categories from Supabase

  // Transform to localized options
  const options = categories.map(cat => ({
    value: cat.id,
    label: getLocalizedLabel(cat, locale),
  }));
}
```

### Helper Function

```typescript
// lib/utils/category-helpers.ts
import type { Category } from '@/types/category';

export function getLocalizedLabel(
  category: Category,
  locale: string
): string {
  return category.i18n?.[locale] ?? category.i18n?.en ?? category.label;
}
```

## Troubleshooting

### "slug column does not exist"
Run the database migration first (Step 2).

### "duplicate key value violates unique constraint"
The seed script uses upsert - this shouldn't happen. Check for duplicate slugs in your JSON file.

### "SUPABASE_SERVICE_ROLE_KEY not set"
Add the service role key to `.env.local`. Find it in Supabase Dashboard > Settings > API.

### "Cannot find module 'tsx'"
Run `npm install --save-dev tsx` first.

## npm Scripts (Add to package.json)

```json
{
  "scripts": {
    "seed:ontology": "tsx scripts/seed-ontology.ts"
  }
}
```

## Files Created by This Feature

| File | Purpose |
|------|---------|
| `scripts/seed-ontology.ts` | Main seed script |
| `scripts/data/Hiking_Gear_Ontology_i18n.json` | Ontology data (user-provided) |
| `supabase/migrations/20251211_categories_i18n.sql` | Schema migration |
| `types/category.ts` | TypeScript types |
| `hooks/useCategories.ts` | Category fetching hook |
| `lib/utils/category-helpers.ts` | Localization helper |
