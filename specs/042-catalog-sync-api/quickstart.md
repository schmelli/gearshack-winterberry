# Quickstart: Global Gear Catalog & Sync API

**Feature**: 042-catalog-sync-api
**Date**: 2025-12-10

## Prerequisites

1. Supabase project with PostgreSQL database
2. Environment variables configured:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## Setup Steps

### 1. Run Database Migration

Apply the migration to enable extensions and create tables:

```bash
# Via Supabase CLI
supabase db push

# Or via SQL in Supabase Dashboard
# Copy contents of supabase/migrations/20251210_catalog_tables.sql
```

### 2. Verify Extensions

Check that extensions are enabled:

```sql
SELECT * FROM pg_extension WHERE extname IN ('pg_trgm', 'vector');
```

### 3. Test Sync API

**Sync a brand:**
```bash
curl -X POST http://localhost:3000/api/sync-catalog/brands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "external_id": "test-brand-1",
    "name": "Test Brand",
    "website_url": "https://example.com"
  }'
```

**Sync products:**
```bash
curl -X POST http://localhost:3000/api/sync-catalog/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "items": [
      {
        "external_id": "test-item-1",
        "name": "Test Product",
        "brand_external_id": "test-brand-1",
        "category": "Test Category"
      }
    ]
  }'
```

### 4. Test Search

**Fuzzy brand search:**
```bash
curl "http://localhost:3000/api/catalog/brands/search?q=test"
```

**Fuzzy product search:**
```bash
curl "http://localhost:3000/api/catalog/items/search?q=product&mode=fuzzy"
```

## Usage in Components

### Brand Autocomplete

```tsx
import { useBrandAutocomplete } from '@/hooks/useBrandAutocomplete';

function BrandInput() {
  const { suggestions, isLoading, search, clear } = useBrandAutocomplete();

  return (
    <Combobox
      onInputChange={(value) => search(value)}
      loading={isLoading}
    >
      {suggestions.map((brand) => (
        <ComboboxItem key={brand.id} value={brand.name}>
          {brand.name}
        </ComboboxItem>
      ))}
    </Combobox>
  );
}
```

### Product Search

```tsx
import { useCatalogSearch } from '@/hooks/useCatalogSearch';

function ProductSearch() {
  const { results, isLoading, search } = useCatalogSearch({ mode: 'fuzzy' });

  return (
    <div>
      <Input onChange={(e) => search(e.target.value)} />
      {results.map((item) => (
        <div key={item.id}>
          {item.name} - {item.brand?.name}
        </div>
      ))}
    </div>
  );
}
```

## Troubleshooting

### "Extension not found" Error

Enable extensions manually in Supabase Dashboard:
1. Go to Database → Extensions
2. Enable `pg_trgm`
3. Enable `vector`

### Slow Search Queries

Verify indexes exist:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('catalog_brands', 'catalog_items');
```

Expected indexes:
- `idx_catalog_brands_name_trgm`
- `idx_catalog_items_name_trgm`
- `idx_catalog_items_embedding`

### 401 Unauthorized on Sync

Verify `SUPABASE_SERVICE_ROLE_KEY` is correctly set in `.env.local` and matches your Supabase project's service role key (found in Project Settings → API).

## Next Steps

1. Set up GearGraph Python scripts to call sync API
2. Configure periodic sync schedule (cron or manual)
3. Integrate autocomplete into Gear Editor form
