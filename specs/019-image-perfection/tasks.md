# Tasks: Image Perfection Sprint

**Input**: Design documents from `/specs/019-image-perfection/`
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Manual testing only (visual verification)

**Organization**: Tasks grouped by layer for clean dependency management.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Type System Foundation (Priority: P1)

**Goal**: Add nobgImages types to enable TypeScript support

**Independent Test**: TypeScript compilation with new types

### Implementation for Types

- [X] T001 [US3] Add NobgImage and NobgImages interfaces to types/gear.ts
- [X] T002 [US3] Add nobgImages optional field to GearItem interface in types/gear.ts

**Checkpoint**: Types compile without errors

---

## Phase 2: Helper Function (Priority: P1)

**Goal**: Create image selection utility

**Independent Test**: Helper function exists and exports correctly

### Implementation for Helper

- [X] T003 [US2] Add getOptimizedImageUrl helper function to lib/gear-utils.ts

**Checkpoint**: Helper function importable from @/lib/gear-utils

---

## Phase 3: Adapter & Validation (Priority: P1)

**Goal**: Pass through nobgImages from Firestore

**Independent Test**: Adapter includes nobgImages in returned GearItem

### Implementation for Adapter

- [X] T004 [P] [US3] Add nobgImages to Zod schema in lib/validations/adapter.ts
- [X] T005 [P] [US3] Pass through nobgImages field in adaptGearItem in lib/firebase/adapter.ts

**Checkpoint**: nobgImages flows through from Firestore documents

---

## Phase 4: GearCard Component (Priority: P1)

**Goal**: Update GearCard to use object-contain, bg-white, and optimized images

**Independent Test**: Visual verification of image display

### Implementation for GearCard

- [X] T006 [US1/US2] Import getOptimizedImageUrl and update image source logic in components/inventory-gallery/GearCard.tsx
- [X] T007 [US1] Change compact view container to bg-white in components/inventory-gallery/GearCard.tsx
- [X] T008 [US1] Change standard/detailed view to object-contain and bg-white in components/inventory-gallery/GearCard.tsx

**Checkpoint**: All GearCard density modes show images without cropping

---

## Phase 5: GearDetailModal Component (Priority: P2)

**Goal**: Update modal to match GearCard styling

**Independent Test**: Visual verification of modal image display

### Implementation for Modal

- [X] T009 [US4] Import getOptimizedImageUrl and update image source in components/loadouts/GearDetailModal.tsx
- [X] T010 [US4] Change modal image container to bg-white and object-contain in components/loadouts/GearDetailModal.tsx

**Checkpoint**: Modal shows images without cropping

---

## Phase 6: Validation

**Purpose**: Final validation and lint/build check

- [X] T011 Run npm run lint and fix any errors
- [X] T012 Run npm run build and fix any errors
- [ ] T013 Manual testing: Verify all user story acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Types)**: No dependencies - must complete first
- **Phase 2 (Helper)**: Depends on Phase 1 for GearItem type
- **Phase 3 (Adapter)**: Depends on Phase 1 for types
- **Phase 4 (GearCard)**: Depends on Phase 2 for helper function
- **Phase 5 (Modal)**: Depends on Phase 2 for helper function
- **Phase 6 (Validation)**: Depends on Phases 1-5 complete

### Parallel Opportunities

**T004, T005 can run in parallel** (different files)
**T006, T007, T008 are sequential** (same file)
**T009, T010 are sequential** (same file)
**Phases 4 and 5 can run in parallel** (different components)

---

## Summary

| Phase | Description | Tasks | Sequential |
|-------|-------------|-------|------------|
| 1 | Type System | T001-T002 | Sequential |
| 2 | Helper Function | T003 | Single task |
| 3 | Adapter/Validation | T004-T005 | Parallel |
| 4 | GearCard | T006-T008 | Sequential |
| 5 | Modal | T009-T010 | Sequential |
| 6 | Validation | T011-T013 | Sequential |

**Total Tasks**: 13
**MVP Scope**: T001-T010 (all component updates = 10 tasks)
