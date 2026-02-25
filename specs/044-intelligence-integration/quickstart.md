# Quickstart: Intelligence Integration

**Feature**: 044-intelligence-integration
**Date**: 2025-12-11

## Prerequisites

1. Supabase project with:
   - `categories` table populated (Feature 043)
   - `catalog_brands` table created (Feature 042)
   - `pg_trgm` extension enabled

2. Environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Quick Verification

### 1. Verify Categories

Open the gear editor at `/inventory/new` and check:
- [ ] Category dropdown shows main categories (Shelter, Sleep System, etc.)
- [ ] Selecting a category populates subcategories
- [ ] Selecting a subcategory populates product types
- [ ] All labels appear in the correct locale (en/de)

### 2. Run Brand Seed Script

```bash
# After creating the seed script
npx tsx scripts/seed-brands-sample.ts
```

Expected output:
```
✅ Seeded 25 brands to catalog_brands
```

### 3. Verify Brand Autocomplete

In the gear editor, type in the Brand field:
- [ ] Typing "Hill" shows "Hilleberg" suggestion
- [ ] Typing "Hillberg" (typo) still shows "Hilleberg" (fuzzy match)
- [ ] Suggestions appear within 500ms
- [ ] Clicking a suggestion fills the field
- [ ] Custom brand names can be entered

## Implementation Tasks

### Task 1: Create Brand Seed Script

**File**: `scripts/seed-brands-sample.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const brands = [
  { name: 'Hilleberg', country: 'Sweden', website: 'https://hilleberg.com' },
  { name: 'Big Agnes', country: 'USA', website: 'https://bigagnes.com' },
  // ... 23 more brands
];

async function seed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const brand of brands) {
    await supabase
      .from('catalog_brands')
      .upsert({
        external_id: `seed-${brand.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: brand.name,
        name_normalized: brand.name.toLowerCase(),
        website_url: brand.website,
      }, { onConflict: 'external_id' });
  }

  console.log(`✅ Seeded ${brands.length} brands`);
}

seed();
```

### Task 2: Enhance Fuzzy Search (Optional)

**File**: `app/api/catalog/brands/search/route.ts`

Replace ILIKE query with similarity:

```typescript
// Before (substring match)
.ilike('name_normalized', `%${query}%`)

// After (fuzzy/typo-tolerant)
const { data } = await supabase.rpc('search_brands_fuzzy', {
  search_query: query,
  match_threshold: 0.3,
  result_limit: limit
});
```

**SQL Function** (add via Supabase SQL editor):

```sql
CREATE OR REPLACE FUNCTION search_brands_fuzzy(
  search_query TEXT,
  match_threshold FLOAT DEFAULT 0.3,
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  website_url TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.logo_url,
    b.website_url,
    similarity(b.name_normalized, lower(search_query)) AS similarity
  FROM catalog_brands b
  WHERE similarity(b.name_normalized, lower(search_query)) > match_threshold
  ORDER BY similarity DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
```

### Task 3: Wire Brand Autocomplete to Form

If not already integrated, add to `GeneralInfoSection.tsx`:

```tsx
import { useBrandAutocomplete } from '@/hooks/useBrandAutocomplete';

// In component:
const { suggestions, search, clear, isLoading } = useBrandAutocomplete();

// Render autocomplete dropdown when suggestions exist
```

## Testing Checklist

- [ ] Categories load without error
- [ ] All 3 levels cascade correctly
- [ ] Partial selection (stop at level 1 or 2) works
- [ ] Brand autocomplete triggers after 2 characters
- [ ] Fuzzy search handles typos
- [ ] Custom brand names accepted
- [ ] German locale shows German category labels
- [ ] Error states display correctly when offline

## Success Criteria Verification

| Criteria | How to Test |
|----------|-------------|
| SC-001: Selection <10s | Time the full 3-level selection |
| SC-002: Edit preserves selection | Edit existing item, verify pre-filled |
| SC-003: Autocomplete <500ms | Time from typing to suggestions |
| SC-004: 95% brand recall | Test first 3 chars of seeded brands |
| SC-005: Localized names | Switch to German, verify labels |
| SC-006: Graceful errors | Disconnect network, observe UI |
| SC-007: Category load <1s | Time initial page load |
