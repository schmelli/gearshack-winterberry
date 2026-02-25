# Implementation Plan: Intelligence Integration (Categories & Autocomplete)

**Branch**: `044-intelligence-integration` | **Date**: 2025-12-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/044-intelligence-integration/spec.md`

## Summary

This feature integrates the Supabase-backed category ontology and brand catalog into the gear editor UI. The core infrastructure (hooks, types, API routes, components) **already exists** from Features 042 and 043. The remaining work is:

1. Creating a brand seed script for test data
2. Verifying the existing integration works end-to-end
3. Minor refinements if needed (error states, loading states)

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+, React 19+, @supabase/supabase-js, react-hook-form, zod, shadcn/ui
**Storage**: PostgreSQL (Supabase) with `categories` and `catalog_brands` tables
**Testing**: Manual E2E verification, `npm run lint`, `npm run build`
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: Category load <1s, brand autocomplete response <500ms (per spec SC-003, SC-007)
**Constraints**: Feature-Sliced Light architecture, shadcn/ui components only, `@/` imports
**Scale/Scope**: ~100 categories (already seeded), ~20 brands (to be seeded)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Feature-Sliced Light | **PASS** | `useCategories`, `useBrandAutocomplete` hooks handle all logic; `TaxonomySelect` receives data via hook, not props |
| II. TypeScript Strict Mode | **PASS** | All types defined in `types/category.ts`, `types/catalog.ts`; no `any` types |
| III. Design System Compliance | **PASS** | Uses `Select`, `FormField` from `@/components/ui`; Tailwind only |
| IV. Spec-Driven Development | **PASS** | Spec exists at `specs/044-intelligence-integration/spec.md` |
| V. Import/File Organization | **PASS** | All imports use `@/` alias; hooks in `hooks/`, types in `types/` |

**Gate Result**: PASS - All constitution principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/044-intelligence-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal - infra exists)
├── data-model.md        # Phase 1 output (references existing types)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API routes exist)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Existing infrastructure (from Features 042, 043):
hooks/
├── useCategories.ts         # ✅ EXISTS - Category hook with i18n
├── useBrandAutocomplete.ts  # ✅ EXISTS - Brand fuzzy search hook
└── useCatalogSearch.ts      # ✅ EXISTS - Item search hook

types/
├── category.ts              # ✅ EXISTS - Category, CategoryTree, CategoryOption
├── catalog.ts               # ✅ EXISTS - CatalogBrand, BrandSuggestion
└── database.ts              # ✅ EXISTS - Supabase generated types

lib/supabase/
├── categories.ts            # ✅ EXISTS - fetchCategories, transformCategory
└── catalog.ts               # ✅ EXISTS - Catalog utilities

components/gear-editor/
└── TaxonomySelect.tsx       # ✅ EXISTS - 3-level cascading dropdown

app/api/catalog/
├── brands/search/route.ts   # ✅ EXISTS - Brand fuzzy search API
└── items/search/route.ts    # ✅ EXISTS - Item search API

# NEW for this feature:
scripts/
└── seed-brands-sample.ts    # 🆕 TO CREATE - Brand seed script
```

**Structure Decision**: No new structure needed. The feature integrates existing components.

## Complexity Tracking

> No constitution violations. Complexity is minimal.

| Item | Complexity | Justification |
|------|------------|---------------|
| Seed script | Low | Simple upsert of ~20 brands |
| Integration verification | Low | Components already wired |

## Existing Implementation Analysis

### Already Complete (from Features 042, 043)

1. **useCategories Hook** (`hooks/useCategories.ts:57-117`)
   - Fetches all categories from Supabase
   - Builds hierarchical tree via `getCategoryHierarchy`
   - Provides `getOptionsForLevel(level, parentId)` for cascading UI
   - Supports i18n via `useLocale()` from next-intl
   - Caches data in component state (re-fetched on mount)

2. **useBrandAutocomplete Hook** (`hooks/useBrandAutocomplete.ts:27-151`)
   - 300ms debounce (per FR-007)
   - Minimum 2 characters (per FR-006)
   - Calls `/api/catalog/brands/search` API
   - Returns `suggestions` with similarity scores

3. **TaxonomySelect Component** (`components/gear-editor/TaxonomySelect.tsx:39-210`)
   - 3-level cascading Select (Category → Subcategory → ProductType)
   - Cascading clear when parent changes
   - Loading and error states
   - Integrates with react-hook-form via `useFormContext`

4. **Brand Search API** (`app/api/catalog/brands/search/route.ts`)
   - ILIKE search on `name_normalized` column
   - Returns similarity scores
   - Uses pg_trgm index for performance

### Missing / To Implement

1. **Brand Seed Script** (`scripts/seed-brands-sample.ts`)
   - Create script to insert ~20 common outdoor brands
   - Use upsert to handle re-runs gracefully

2. **BrandAutocomplete UI Integration**
   - The `useBrandAutocomplete` hook exists but may not be wired into the gear editor form
   - Need to verify `GeneralInfoSection.tsx` or similar uses the hook

3. **Fuzzy Search Enhancement** (per clarification)
   - Current API uses ILIKE which is substring match, not true fuzzy/typo-tolerant
   - May need to add `pg_trgm` similarity function for Levenshtein distance

---

## Phase 0 & 1 Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Research | `research.md` | ✅ Complete |
| Data Model | `data-model.md` | ✅ Complete |
| API Contracts | `contracts/api.md` | ✅ Complete |
| Quickstart | `quickstart.md` | ✅ Complete |

## Post-Design Constitution Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Light | **PASS** | No changes to architecture |
| II. TypeScript Strict Mode | **PASS** | All new code will use strict types |
| III. Design System Compliance | **PASS** | Uses existing shadcn/ui components |
| IV. Spec-Driven Development | **PASS** | Full spec and plan completed |
| V. Import/File Organization | **PASS** | New files follow `@/` convention |

**Final Gate Result**: PASS - Ready for `/speckit.tasks`

---

## Next Steps

Run `/speckit.tasks` to generate the implementation task list. Expected tasks:

1. Create `scripts/seed-brands-sample.ts` seed script
2. Create SQL function `search_brands_fuzzy` for pg_trgm similarity
3. Update brand search API to use fuzzy function
4. Verify brand autocomplete integration in gear editor form
5. E2E testing of category cascading and brand autocomplete
