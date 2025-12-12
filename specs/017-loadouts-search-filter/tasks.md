# Tasks: Loadouts Search, Filter, and Sort

**Input**: Design documents from `/specs/017-loadouts-search-filter/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: Manual testing only (visual verification)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Type Definitions (Priority: Setup)

**Goal**: Add SortOption type to support sorting functionality

**Independent Test**: TypeScript compilation passes

### Implementation for Type Definitions

- [X] T001 [P] [Setup] Add LoadoutSortOption type and SORT_OPTION_LABELS to types/loadout.ts

**Checkpoint**: `npm run lint` passes

---

## Phase 2: Hook Extension (Priority: P1)

**Goal**: Extend useLoadoutSearch with activity filter and sorting

**Independent Test**: Hook returns new state and sorted/filtered results

### Implementation for Hook Extension

- [X] T002 [US1/US2/US3] Extend useLoadoutSearch hook with activityFilter, sortOption state and filtering/sorting logic in hooks/useLoadoutSearch.ts

**Checkpoint**: Hook API includes new state and returns sorted results

---

## Phase 3: Toolbar Component (Priority: P1)

**Goal**: Create LoadoutToolbar component matching GalleryToolbar style

**Independent Test**: Component renders search, activity filter, sort dropdown, clear button

### Implementation for Toolbar Component

- [X] T003 [US1/US2/US3/US4] Create LoadoutToolbar component in components/loadouts/LoadoutToolbar.tsx

**Checkpoint**: Component renders with all controls

---

## Phase 4: Page Integration (Priority: P1)

**Goal**: Integrate toolbar into loadouts page, replacing inline toolbar

**Independent Test**: Navigate to /loadouts and verify toolbar appears with all functionality

### Implementation for Page Integration

- [X] T004 [US1/US2/US3/US4] Update app/loadouts/page.tsx to use LoadoutToolbar component
- [X] T005 [US4] Remove old inline search/filter toolbar from app/loadouts/page.tsx

**Checkpoint**: Loadouts page shows new toolbar with search, activity filter, and sort

---

## Phase 5: Validation

**Purpose**: Final validation and lint/build check

- [X] T006 Run npm run lint and fix any errors
- [X] T007 Run npm run build and fix any errors
- [ ] T008 Manual testing: Verify all user story acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Types)**: No dependencies - can start immediately
- **Phase 2 (Hook)**: Depends on Phase 1 (needs SortOption type)
- **Phase 3 (Toolbar)**: Depends on Phase 1 (needs SortOption type)
- **Phase 4 (Integration)**: Depends on Phases 2 and 3 (needs hook and component)
- **Phase 5 (Validation)**: Depends on Phase 4 complete

### Parallel Opportunities

**T003 can run in parallel with T002** after T001 (different files):
- T002: useLoadoutSearch.ts
- T003: LoadoutToolbar.tsx

**T004 and T005 are sequential** (same file)

---

## Summary

| Phase | Description | Tasks | Parallel? |
|-------|-------------|-------|-----------|
| 1 | Type Definitions | T001 | Independent |
| 2 | Hook Extension | T002 | After T001 |
| 3 | Toolbar Component | T003 | After T001, parallel with T002 |
| 4 | Page Integration | T004-T005 | After T002, T003 |
| 5 | Validation | T006-T008 | Sequential |

**Total Tasks**: 8
**MVP Scope**: T001-T005 (core functionality = 5 tasks)
