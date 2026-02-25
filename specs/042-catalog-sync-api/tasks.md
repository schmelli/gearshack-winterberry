# Tasks: Global Gear Catalog & Sync API

**Input**: Design documents from `/specs/042-catalog-sync-api/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/api/` for routes, `hooks/` for client hooks, `types/` for TypeScript types
- **Supabase**: `supabase/migrations/` for SQL migrations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment configuration and dependency verification

- [X] T001 Verify Supabase project has ability to enable pg_trgm and pgvector extensions (check via Supabase Dashboard → Extensions)
- [X] T002 [P] Add SUPABASE_SERVICE_ROLE_KEY to .env.local (copy from Supabase Dashboard → Settings → API)
- [X] T003 [P] Verify existing @supabase/supabase-js and @supabase/ssr dependencies in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and shared types that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create database migration file supabase/migrations/20251210_catalog_tables.sql with pg_trgm, pgvector extensions, catalog_brands and catalog_items tables, generated columns, indexes, and RLS policies (per data-model.md)
- [X] T005 [P] Create TypeScript types for CatalogBrand and CatalogItem in types/catalog.ts (per data-model.md entity definitions)
- [X] T006 [P] Update types/database.ts to add catalog_brands and catalog_items table definitions to Database interface
- [X] T007 [P] Create Zod validation schemas in lib/validations/catalog-schema.ts (brandPayloadSchema, itemPayloadSchema, brandSyncRequestSchema, itemSyncRequestSchema per sync-api.md)
- [X] T008 Create catalog query utilities in lib/supabase/catalog.ts with functions for fuzzy brand search, fuzzy item search, semantic search, and hybrid search (per research.md SQL patterns)
- [ ] T009 Run migration in Supabase (via Dashboard SQL Editor or supabase db push)

**Checkpoint**: Foundation ready - database schema exists, types defined, query utilities available

---

## Phase 3: User Story 1 - Fuzzy Brand/Product Autocomplete (Priority: P1) 🎯 MVP

**Goal**: Enable instant, typo-tolerant autocomplete suggestions when users type brand/product names in the Gear Editor

**Independent Test**: Type "Hile" in Gear Editor brand field → see "Hilleberg" suggestion within 200ms

### Implementation for User Story 1

- [X] T010 [P] [US1] Create GET /api/catalog/brands/search route in app/api/catalog/brands/search/route.ts implementing fuzzy brand search with trigram similarity (per search-api.md)
- [X] T011 [P] [US1] Create GET /api/catalog/items/search route in app/api/catalog/items/search/route.ts implementing fuzzy item search (mode=fuzzy only for now) (per search-api.md)
- [X] T012 [US1] Create useBrandAutocomplete hook in hooks/useBrandAutocomplete.ts with 300ms debounce, minChars=2, fetches from /api/catalog/brands/search, handles fast typing via debounce (per search-api.md hook contract, addresses edge case: fast typing)
- [X] T013 [US1] Create useCatalogSearch hook in hooks/useCatalogSearch.ts with mode='fuzzy' support, 300ms debounce, handles fast typing via debounce (per search-api.md hook contract, addresses edge case: fast typing)
- [ ] T014 [US1] Verify fuzzy search works with sample data: POST test brands/items via Supabase Dashboard, test search endpoints with curl, validate 2-character typo tolerance (e.g., "Hileberg" → "Hilleberg") per SC-002

**Checkpoint**: User Story 1 complete - fuzzy autocomplete works for brands and products

---

## Phase 4: User Story 2 - Semantic Product Search (Priority: P2)

**Goal**: Enable users to find products using conceptual queries like "ultralight winter shelter" even when exact keywords don't match

**Independent Test**: Search "ultralight shelter" → see tent products like "X-Mid" or "Hornet" appear with relevance scores

### Implementation for User Story 2

- [ ] T015 [US2] Extend GET /api/catalog/items/search route in app/api/catalog/items/search/route.ts to support mode=semantic with embedding parameter (base64-decoded to float array) ⚠️ EXTENDS T011 - same file
- [ ] T016 [US2] Extend GET /api/catalog/items/search route in app/api/catalog/items/search/route.ts to support mode=hybrid with configurable weight_text parameter (default 0.7) ⚠️ EXTENDS T011/T015 - same file
- [ ] T017 [US2] Update useCatalogSearch hook in hooks/useCatalogSearch.ts to support mode='semantic' and mode='hybrid' with embedding parameter
- [ ] T018 [US2] Verify semantic search works: Upload test items with embeddings via sync API, then search with embedding vectors

**Checkpoint**: User Story 2 complete - semantic and hybrid search functional

---

## Phase 5: User Story 3 - Catalog Sync API (Priority: P3)

**Goal**: Enable external GearGraph Python scripts to push catalog data into Supabase via authenticated API endpoints

**Independent Test**: POST brand payload with valid service role key → record appears in catalog_brands table

### Implementation for User Story 3

- [X] T019 [US3] Create POST /api/sync-catalog/brands route in app/api/sync-catalog/brands/route.ts with service role key auth, Zod validation, single and batch upsert support (per sync-api.md)
- [X] T020 [US3] Create POST /api/sync-catalog/items route in app/api/sync-catalog/items/route.ts with service role key auth, Zod validation, embedding support, brand_external_id lookup, batch upsert (per sync-api.md)
- [X] T021 [US3] Add error handling in sync routes: 400 for validation errors with details array (including malformed JSON), 401 for missing/invalid auth, 500 for server errors (per sync-api.md response formats, addresses edge case: malformed JSON)
- [ ] T022 [US3] Test sync API with curl commands from quickstart.md (brands endpoint, items endpoint, batch upload, unauthorized request rejection)

**Checkpoint**: User Story 3 complete - sync API ready for GearGraph integration

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integration, validation, and documentation

- [X] T023 [P] Add JSDoc comments to all exported functions in hooks/useBrandAutocomplete.ts and hooks/useCatalogSearch.ts
- [X] T024 [P] Add JSDoc comments to all exported functions in lib/supabase/catalog.ts
- [X] T025 Run npm run build to verify no TypeScript errors
- [X] T026 Run npm run lint to verify no ESLint errors (0 errors, warnings only for MVP placeholders)
- [ ] T027 Validate quickstart.md scenarios work end-to-end (setup, sync, search)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify environment immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (fuzzy) → US2 (semantic) → US3 (sync) in priority order
  - OR: US3 (sync) can run in parallel with US1/US2 since it writes to same tables but different files
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Fuzzy)**: Depends only on Foundational. Reads from catalog tables.
- **User Story 2 (P2 - Semantic)**: Extends US1's search API route (T015/T016 modify same file as T011). **MUST complete after US1** to avoid merge conflicts.
- **User Story 3 (P3 - Sync)**: Independent write endpoints. Can run in parallel with US1/US2 (different files).

### Within Each User Story

- API routes before hooks (hooks call routes)
- Core implementation before validation/testing
- Verify manually before marking complete

### Parallel Opportunities

**Foundational Phase**:
```
T005, T006, T007 can run in parallel (different files)
T004 must complete before T009
```

**User Story 1**:
```
T010, T011 can run in parallel (different route files)
T012, T013 depend on routes completing first
```

**Cross-Story Parallelism**:
```
US3 (sync endpoints) can run in parallel with US1 (search endpoints) - different files
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify environment)
2. Complete Phase 2: Foundational (migration, types, schemas)
3. Complete Phase 3: User Story 1 (fuzzy search)
4. **STOP and VALIDATE**: Test autocomplete manually
5. Deploy if ready - users can search catalog immediately

### Incremental Delivery

1. Setup + Foundational → Database ready
2. Add User Story 1 (Fuzzy) → Deploy (autocomplete works!)
3. Add User Story 2 (Semantic) → Deploy (smarter search!)
4. Add User Story 3 (Sync API) → Enable GearGraph automation
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers after Foundational phase:
- Developer A: User Story 1 + 2 (search endpoints + hooks)
- Developer B: User Story 3 (sync endpoints)
- Stories can merge independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Service Role Key is sensitive - never commit to repo, only use server-side
- Test with curl before integrating into UI components
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently

## Edge Cases Addressed

| Edge Case (from spec.md) | Addressed In |
|--------------------------|--------------|
| User types very fast (debouncing) | T012, T013 - 300ms debounce |
| Malformed JSON in sync API | T021 - 400 error handling |
| 2-character typo tolerance | T014 - validation step |
| Special characters in search | Handled by pg_trgm (no task needed) |
| Missing embeddings for semantic | Returns empty results (graceful degradation) |
| Slow/unavailable database | Standard Supabase error handling |
