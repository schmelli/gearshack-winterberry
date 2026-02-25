# Tasks: Ontology Import & Category Internationalization

**Input**: Design documents from `/specs/043-ontology-i18n-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in specification. Manual verification via Supabase Dashboard.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Next.js App Router with standalone scripts
- **Scripts**: `scripts/` at repository root
- **Types**: `types/` at repository root
- **Hooks**: `hooks/` at repository root
- **Utils**: `lib/utils/` at repository root
- **Migrations**: `supabase/migrations/` at repository root

---

## Phase 1: Setup

**Purpose**: Project initialization and dependency setup

- [x] T001 Install tsx as devDependency by running `npm install --save-dev tsx`
- [x] T002 [P] Add seed:ontology script to package.json: `"seed:ontology": "tsx scripts/seed-ontology.ts"`
- [x] T003 [P] Create scripts/data directory for ontology JSON: `mkdir -p scripts/data`

---

## Phase 2: Foundational (Database Schema)

**Purpose**: Database schema changes that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Copy migration SQL from specs to supabase/migrations/20251211_categories_i18n.sql
- [ ] T005 Apply migration to Supabase database (via Dashboard SQL Editor or `supabase db push`) ⚠️ MANUAL
- [x] T006 Update types/database.ts to add slug and i18n fields to categories table type

**Checkpoint**: Schema ready with slug/i18n columns - user story implementation can now begin

---

## Phase 3: User Story 2 - Import Complete Gear Ontology (Priority: P2) 🎯 MVP

**Goal**: Create seed script to import 3-level hierarchy from JSON into database

**Independent Test**: Run `npm run seed:ontology` and verify all categories appear in Supabase Dashboard with correct parent-child relationships

**Why P2 first?**: The import script (US2) must exist before we can see localized labels (US1). The seed script creates the data that US1 will display.

### Implementation for User Story 2

- [x] T007 [P] [US2] Create types/category.ts with Category, CategoryI18n, and OntologyItem interfaces per data-model.md
- [x] T008 [P] [US2] Create Zod validation schema for ontology JSON in scripts/seed-ontology.ts (OntologySchema, OntologyItemSchema) with slug normalization (lowercase, underscores only)
- [x] T009 [US2] Implement Supabase admin client in scripts/seed-ontology.ts using SUPABASE_SERVICE_ROLE_KEY
- [x] T010 [US2] Implement deleteAllCategories() function in scripts/seed-ontology.ts using TRUNCATE CASCADE (per FR-009 replace strategy)
- [x] T011 [US2] Implement processLevel1Categories() function to upsert main categories (level=1, parent_id=NULL) using `{ onConflict: 'slug' }`
- [x] T012 [US2] Implement processLevel2Categories() function to upsert subcategories with parent slug lookup using `{ onConflict: 'slug' }`
- [x] T013 [US2] Implement processLevel3Categories() function to upsert product types with parent slug lookup using `{ onConflict: 'slug' }`
- [x] T014 [US2] Implement main() function orchestrating: validate JSON → delete existing → upsert L1 → L2 → L3
- [x] T015 [US2] Add error handling with clear messages for: missing file, invalid JSON, missing parent slug
- [x] T016 [US2] Add console logging for progress: starting, deleted count, inserted count per level, completion

**Checkpoint**: Seed script can import ontology JSON into empty or populated categories table

---

## Phase 4: User Story 3 - Idempotent Ontology Updates (Priority: P3)

**Goal**: Ensure re-running import script updates existing entries without creating duplicates

**Independent Test**: Run seed script twice consecutively, verify category count remains the same

### Implementation for User Story 3

- [x] T017 [US3] Verify upsert behavior by running seed script twice and confirming no duplicates (validation task)
- [x] T018 [US3] Add dry-run mode flag (--dry-run) to validate JSON without database changes
- [x] T019 [US3] Add summary logging showing: upserted count, unchanged count, error count

**Checkpoint**: Script is idempotent - running twice produces identical results

---

## Phase 5: User Story 1 - View Categories in Preferred Language (Priority: P1)

**Goal**: Frontend displays category labels in user's locale (German or English)

**Independent Test**: Switch app locale between /en and /de, verify category selectors show translated labels

**Note**: Depends on US2 being complete (categories must exist in database with i18n data)

### Implementation for User Story 1

- [x] T020 [P] [US1] Create lib/utils/category-helpers.ts with getLocalizedLabel(category, locale) function
- [x] T021 [P] [US1] Create lib/supabase/categories.ts with fetchCategories() query function
- [x] T022 [US1] Create hooks/useCategories.ts hook: fetch categories from Supabase, transform with locale from next-intl
- [x] T023 [US1] Update components/gear-editor/sections/ClassificationSection.tsx to use useCategories hook
- [x] T024 [US1] Handle NULL category gracefully in GearCard and ClassificationSection (show "Uncategorized" or empty)
- [x] T025 [US1] Add getCategoryHierarchy(categories, locale) helper to build nested structure for cascading selects

**Checkpoint**: German users see German category names, English users see English names

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T026 [P] Verify all categories imported by checking Supabase Dashboard (SC-001: 200-300 entries) ⚠️ MANUAL
- [ ] T027 [P] Test locale switching in browser to verify German labels appear (SC-002) ⚠️ MANUAL
- [ ] T028 Run seed script twice and verify no duplicates (SC-003) ⚠️ MANUAL
- [ ] T029 Update quickstart.md with any changes discovered during implementation ⚠️ OPTIONAL
- [x] T030 Run `npm run lint` to ensure no linting errors
- [x] T031 Run `npm run build` to verify production build succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 2 (Phase 3)**: Depends on Foundational - seed script needs schema changes
- **User Story 3 (Phase 4)**: Depends on User Story 2 - validates and enhances existing script
- **User Story 1 (Phase 5)**: Depends on User Story 2 - frontend needs populated categories
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (Database Schema)
    ↓
Phase 3: User Story 2 - Import Script (Creates the data)
    ↓
    ├── Phase 4: User Story 3 - Idempotent Updates (Validates & enhances US2)
    │
    └── Phase 5: User Story 1 - Frontend Localization (Consumes US2 data)
            ↓
        Phase 6: Polish
```

### Within Each User Story

- Types/schemas before implementation code
- Core functions before orchestration
- Error handling integrated with implementation
- Logging added last

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001 (npm install) → T002 + T003 can run in parallel
```

**Phase 3 (User Story 2)**:
```
T007 + T008 can run in parallel (different files)
T011 + T012 + T013 are sequential (depend on each other's parent lookups)
```

**Phase 5 (User Story 1)**:
```
T020 + T021 can run in parallel (different files)
T024 + T025 can run in parallel (different components)
```

---

## Parallel Example: User Story 2

```bash
# Launch types and schema in parallel:
Task: "Create types/category.ts with interfaces"
Task: "Create Zod validation schema in seed-ontology.ts"

# Then sequential processing functions:
Task: "Implement processLevel1Categories()"  # Must complete first
Task: "Implement processLevel2Categories()"  # Uses L1 slugs
Task: "Implement processLevel3Categories()"  # Uses L2 slugs
```

---

## Implementation Strategy

### MVP First (User Stories 2 + 1)

1. Complete Phase 1: Setup (dependencies)
2. Complete Phase 2: Foundational (database schema)
3. Complete Phase 3: User Story 2 (seed script - creates data)
4. Complete Phase 5: User Story 1 (frontend localization - displays data)
5. **STOP and VALIDATE**: Import ontology, test locale switching
6. Deploy if ready

### Full Feature

1. Complete MVP above
2. Add Phase 4: User Story 3 (idempotent updates)
3. Complete Phase 6: Polish
4. Final validation against all success criteria

### Suggested MVP Scope

**Minimum viable**: User Stories 2 + 1 (Phases 1-3, 5)
- Users can see localized categories
- Developers can import ontology

**Defer for polish**: User Story 3 (Phase 4)
- Idempotent updates are nice-to-have for initial release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 2 is prerequisite for User Story 1 (data must exist before display)
- Service role key required in .env.local for seed script
- Run `npm run lint` and `npm run build` after each phase
- Commit after each task or logical group
