# Tasks: Intelligence Integration (Categories & Autocomplete)

**Input**: Design documents from `/specs/044-intelligence-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Note**: Most infrastructure already exists from Features 042 and 043. This task list focuses on the **remaining work** needed to complete the integration.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a Next.js App Router project with:
- `hooks/` - Custom React hooks
- `components/` - UI components
- `lib/` - Utilities and services
- `app/api/` - API routes
- `scripts/` - Development scripts
- `supabase/` - Database migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing infrastructure and prepare for enhancements

- [x] T001 Verify existing hooks compile without errors by running `npm run lint` in hooks/ directory
- [x] T002 [P] Verify database tables exist by checking `supabase/migrations/` for categories and catalog_brands schemas
- [x] T003 [P] Verify API routes are accessible by testing `/api/catalog/brands/search?q=test` endpoint

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database function needed for fuzzy search (blocks US2)

**⚠️ CRITICAL**: The fuzzy search SQL function must be deployed before brand autocomplete can work with typo tolerance

- [x] T004 Create `search_brands_fuzzy` SQL function in `supabase/migrations/20251211_search_brands_fuzzy.sql` using pg_trgm similarity()
- [ ] T005 Deploy migration to Supabase by running `supabase db push` or via Supabase dashboard SQL editor

**Checkpoint**: Fuzzy search function deployed - User Story 2 can now proceed

---

## Phase 3: User Story 4 - Brand Data Seeding (Priority: P3) 🛠️ Developer Utility

**Goal**: Populate catalog_brands with test data so autocomplete can be tested

**Independent Test**: Run `npx tsx scripts/seed-brands-sample.ts` and verify 25 brands appear in database

**Why P3 first?**: Although lowest priority, this enables testing of US2. Seed data is a prerequisite for manual verification.

### Implementation for User Story 4

- [x] T006 [US4] Create brand seed script at `scripts/seed-brands-sample.ts` with 25 outdoor brands
- [x] T007 [US4] Add brand data array with name, country, website_url for each brand
- [x] T008 [US4] Implement upsert logic using `external_id` as conflict key in `scripts/seed-brands-sample.ts`
- [ ] T009 [US4] Test seed script by running `npx tsx scripts/seed-brands-sample.ts` and verifying output

**Checkpoint**: Test data available - User Story 2 can now be verified

---

## Phase 4: User Story 1 - Cascading Category Selection (Priority: P1) 🎯 MVP

**Goal**: Users can select categories via 3-level cascading dropdown in gear editor

**Independent Test**: Navigate to `/en/inventory/new`, verify Category → Subcategory → Product Type dropdowns cascade correctly

**Note**: This user story is **ALREADY IMPLEMENTED** in Features 042/043. This phase is for **verification only**.

### Verification for User Story 1

- [x] T010 [US1] Verify `TaxonomySelect` component exists at `components/gear-editor/TaxonomySelect.tsx`
- [x] T011 [US1] Verify `useCategories` hook exists at `hooks/useCategories.ts` with getOptionsForLevel function
- [ ] T012 [US1] Manual test: Navigate to gear editor, select "Shelter" → verify subcategories appear
- [ ] T013 [US1] Manual test: Select subcategory "Tents" → verify product types appear
- [ ] T014 [US1] Manual test: Save item with partial selection (only Main category) → verify slug saved correctly
- [ ] T015 [US1] Manual test: Edit existing item → verify category dropdowns pre-populated
- [ ] T016 [US1] Manual test: Switch locale to German → verify category labels display in German

**Checkpoint**: Category selection fully functional

---

## Phase 5: User Story 3 - Developer Category Hook (Priority: P2) 🛠️ Technical Enabler

**Goal**: useCategories hook provides hierarchical tree with i18n support

**Independent Test**: Import useCategories in a test component and verify hierarchy structure

**Note**: This user story is **ALREADY IMPLEMENTED**. This phase is for **verification only**.

### Verification for User Story 3

- [x] T017 [US3] Verify `useCategories` returns `hierarchy` with nested CategoryWithChildren structure in `hooks/useCategories.ts`
- [x] T018 [US3] Verify `getOptionsForLevel(1)` returns main categories with localized labels
- [x] T019 [US3] Verify `getOptionsForLevel(2, parentId)` filters subcategories by parent
- [x] T020 [US3] Verify `getLabelById(id)` returns localized label for category UUID
- [x] T021 [US3] Verify error state is returned when Supabase query fails (simulate by disconnecting network)

**Checkpoint**: useCategories hook fully functional

---

## Phase 6: User Story 2 - Brand Autocomplete (Priority: P2)

**Goal**: Users see fuzzy brand suggestions when typing in brand field

**Independent Test**: Type "Hillberg" (typo) in brand field, verify "Hilleberg" appears in suggestions

### Implementation for User Story 2

- [x] T022 [US2] Update brand search API to use fuzzy function at `app/api/catalog/brands/search/route.ts`
- [x] T023 [US2] Replace ILIKE query with RPC call to `search_brands_fuzzy` in `app/api/catalog/brands/search/route.ts`
- [x] T024 [US2] Verify `useBrandAutocomplete` hook exists at `hooks/useBrandAutocomplete.ts`
- [x] T025 [US2] Check if brand autocomplete is wired into gear editor form in `components/gear-editor/sections/GeneralInfoSection.tsx`
- [x] T026 [US2] If not wired: Create `BrandAutocompleteInput` component at `components/gear-editor/BrandAutocompleteInput.tsx`
- [x] T027 [US2] If not wired: Integrate `BrandAutocompleteInput` into `GeneralInfoSection.tsx` for brand field
- [ ] T028 [US2] Manual test: Type "Hill" → verify "Hilleberg" appears in suggestions
- [ ] T029 [US2] Manual test: Type "Hillberg" (typo) → verify "Hilleberg" still appears (fuzzy match)
- [ ] T030 [US2] Manual test: Click suggestion → verify brand field populated
- [ ] T031 [US2] Manual test: Type custom brand "MyBrand" → verify custom value accepted on blur

**Checkpoint**: Brand autocomplete fully functional with fuzzy search

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [x] T032 [P] Run `npm run lint` to verify no linting errors (pre-existing warnings only)
- [x] T033 [P] Run `npm run build` to verify production build succeeds
- [ ] T034 Run quickstart.md validation checklist manually
- [ ] T035 Verify all success criteria (SC-001 through SC-007) from spec.md
- [x] T036 Update CLAUDE.md with new technology entry if not already present (already exists)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: No dependencies - SQL function creation
- **User Story 4 (Phase 3)**: No dependencies - seed script only
- **User Story 1 (Phase 4)**: No dependencies - verification of existing code
- **User Story 3 (Phase 5)**: No dependencies - verification of existing code
- **User Story 2 (Phase 6)**: Depends on Phase 2 (fuzzy function) and Phase 3 (test data)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

```
US4 (Seed) ──────────────────┐
                             │
Foundational (Fuzzy SQL) ────┼──► US2 (Brand Autocomplete)
                             │
US1 (Categories) ────────────┤    (independent verification)
                             │
US3 (Hook) ──────────────────┘    (independent verification)
```

### Parallel Opportunities

- T001, T002, T003 can run in parallel (Setup verification)
- T006, T007, T008 are sequential (same file: seed script)
- T010-T016 can run in parallel with T017-T021 (different verification streams)
- T022-T031 are sequential (depend on fuzzy function and may touch same files)
- T032, T033 can run in parallel (different commands)

---

## Parallel Example: Setup Verification

```bash
# Launch all setup verification tasks together:
Task: "Verify existing hooks compile without errors"
Task: "Verify database tables exist"
Task: "Verify API routes are accessible"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 4)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: Deploy fuzzy search function
3. Complete Phase 3: Seed brands for testing
4. Complete Phase 4: Verify US1 (Categories) - should already work
5. **STOP and VALIDATE**: Categories should cascade correctly

### Full Feature

1. Complete Setup → Foundational → Seed
2. Verify US1 (Categories) → Verify US3 (Hook)
3. Implement/verify US2 (Brand Autocomplete with fuzzy)
4. Polish phase
5. All success criteria validated

### Key Insight

Most work is **verification** because Features 042 and 043 built the infrastructure. The only new code is:

| New File | Description |
|----------|-------------|
| `supabase/migrations/YYYYMMDD_search_brands_fuzzy.sql` | SQL function for fuzzy search |
| `scripts/seed-brands-sample.ts` | Brand seed script |
| `components/gear-editor/BrandAutocompleteInput.tsx` | Only if not already wired |

---

## Notes

- Most tasks are **verification** of existing code
- Only ~3-4 new files need to be created
- The fuzzy search SQL function is the key technical addition
- Brand autocomplete may already be wired - check GeneralInfoSection.tsx first
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
