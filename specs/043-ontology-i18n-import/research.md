# Research: Ontology Import & Category Internationalization

**Feature**: 043-ontology-i18n-import
**Date**: 2025-12-10

## Research Tasks

### 1. Supabase JSONB i18n Pattern

**Decision**: Store translations in JSONB column with locale keys

**Rationale**:
- Native PostgreSQL JSONB provides efficient storage and indexing
- Supabase supports JSONB queries natively (e.g., `i18n->>'en'`)
- Simple structure: `{"en": "Label", "de": "Bezeichnung"}`
- No additional tables or joins required
- Easy to extend with more locales in future

**Alternatives considered**:
- Separate translations table with foreign keys: Rejected - adds complexity, requires joins
- Columns per locale (label_en, label_de): Rejected - schema changes needed for new locales
- External i18n service: Rejected - overkill for static category labels

### 2. Seed Script Execution Strategy

**Decision**: Use `tsx` to run TypeScript directly with Supabase service role client

**Rationale**:
- `tsx` allows running TypeScript without compilation step
- Service role key bypasses RLS for administrative operations
- Environment variables loaded from `.env.local`
- npm script for easy execution: `npm run seed:ontology`

**Alternatives considered**:
- Supabase Edge Function: Rejected - overkill for one-time operation
- Raw SQL seed file: Rejected - less maintainable, no validation
- Compiled JS script: Rejected - extra build step unnecessary

### 3. Upsert Strategy for Idempotent Updates

**Decision**: Use `ON CONFLICT (slug) DO UPDATE` with Supabase upsert

**Rationale**:
- PostgreSQL native upsert is atomic and efficient
- Slug as conflict target ensures uniqueness
- Updates all fields on conflict (i18n, label, parent_id, level)
- Single database round-trip per batch

**Implementation**:
```typescript
await supabase
  .from('categories')
  .upsert(categories, { onConflict: 'slug' });
```

**Alternatives considered**:
- Delete all + insert: Rejected - not atomic, could leave FK violations
- Check existence + conditional insert/update: Rejected - multiple round-trips

### 4. Category Hierarchy Processing Order

**Decision**: Process levels sequentially (L1 → L2 → L3) with parent slug lookup

**Rationale**:
- Parent categories must exist before children (FK constraint)
- Slug-based parent lookup avoids hardcoded UUIDs
- Three separate passes ensure referential integrity

**Process**:
1. Delete all existing categories (TRUNCATE with CASCADE)
2. Insert Level 1 categories (no parent_id)
3. Insert Level 2 categories (lookup parent_id by L1 slug)
4. Insert Level 3 categories (lookup parent_id by L2 slug)

**Alternatives considered**:
- Single pass with deferred FK checks: Rejected - more complex, PostgreSQL-specific
- Generate UUIDs in JSON file: Rejected - couples data to implementation

### 5. Frontend Locale Resolution

**Decision**: Use `next-intl` locale from routing, pass to helper function

**Rationale**:
- Project already uses `next-intl` for i18n (Feature 027)
- Locale available from `useLocale()` hook
- Helper function `getLocalizedLabel(category, locale)` keeps logic centralized
- Falls back to English if locale not found in i18n object

**Implementation**:
```typescript
// lib/utils/category-helpers.ts
export function getLocalizedLabel(
  category: Category,
  locale: string
): string {
  return category.i18n?.[locale] ?? category.i18n?.en ?? category.label;
}
```

**Alternatives considered**:
- Store locale preference in category hook: Rejected - mixes concerns
- Server-side locale rendering only: Rejected - client needs locale for dynamic UI

### 6. JSON Schema Validation

**Decision**: Validate ontology JSON with Zod schema before processing

**Rationale**:
- Catches malformed input before database operations
- Provides clear error messages for missing/invalid fields
- TypeScript type inference from Zod schema
- Already a project dependency

**Schema structure**:
```typescript
const OntologyItemSchema = z.object({
  slug: z.string().min(1),
  en: z.string().min(1),
  de: z.string().min(1),
  subcategories: z.array(z.lazy(() => OntologyItemSchema)).optional(),
  productTypes: z.array(z.lazy(() => OntologyItemSchema)).optional(),
});

const OntologySchema = z.object({
  categories: z.array(OntologyItemSchema),
});
```

**Alternatives considered**:
- No validation (trust input): Rejected - fragile, poor error messages
- JSON Schema (ajv): Rejected - adds dependency, Zod already available

### 7. Existing Data Migration

**Decision**: Replace strategy - delete all existing categories before import

**Rationale**:
- Per clarification session: "Replace - Delete existing categories, import fresh"
- Existing seed data is placeholder content
- Clean slate avoids orphaned/conflicting entries
- gear_items FK set to NULL via ON DELETE SET NULL

**Migration notes**:
- Users with existing category assignments will see NULL values
- Frontend should handle NULL gracefully (show "Uncategorized")
- Users can re-categorize using new comprehensive ontology

## Dependencies Identified

| Dependency | Purpose | Already Installed |
|------------|---------|-------------------|
| @supabase/supabase-js | Database client | ✅ Yes |
| zod | JSON validation | ✅ Yes |
| tsx | Run TypeScript scripts | ❌ No (dev dep) |

**Action**: Add `tsx` as devDependency for script execution.

## Open Questions (Resolved)

All research questions have been resolved. No blockers for Phase 1.
