# Tasks: Storage Path Alignment & Loadout Crash Fix

**Input**: Design documents from `/specs/015-storage-path-fix/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: Manual testing only (no automated tests in this feature)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - Storage Path Fix (Priority: P1)

**Goal**: Align storage path with Firebase Security Rules

**Independent Test**: Upload an image in gear editor, verify upload succeeds without permission errors

### Implementation for User Story 1

- [X] T001 [US1] Update BASE_PATH from 'user-uploads' to 'userBase' in lib/validations/storage.ts
- [X] T002 [US1] Update GEAR_SUBDIR from 'gear' to 'inventory' in lib/validations/storage.ts
- [X] T003 [US1] Add console.log for storage path debugging in lib/firebase/storage.ts

**Checkpoint**: Image uploads succeed without permission errors

---

## Phase 2: User Story 2 - LoadoutCard Crash Prevention (Priority: P1)

**Goal**: Verify guard clause exists and handles invalid IDs

**Independent Test**: Navigate to loadouts page with legacy data, verify no crashes

### Implementation for User Story 2

- [X] T004 [US2] Verify guard clause exists in components/loadouts/LoadoutCard.tsx (read-only check)

**Checkpoint**: Loadouts page loads without crashes

---

## Phase 3: User Story 3 - Error Message Improvements (Priority: P2)

**Goal**: Add specific error messages for different failure types

**Independent Test**: Trigger upload errors and verify specific messages

### Implementation for User Story 3

- [X] T005 [US3] Import StorageUploadError in hooks/useImageUpload.ts
- [X] T006 [US3] Replace generic error catch with specific error code handling in hooks/useImageUpload.ts

**Checkpoint**: Specific error messages shown for different failure types

---

## Phase 4: Validation

**Purpose**: Final validation and lint/build check

- [X] T007 Run npm run lint and fix any errors
- [X] T008 Run npm run build and fix any errors
- [ ] T009 Manual testing: Verify all user story acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies - can start immediately
- **Phase 2 (US2)**: Independent - just verification
- **Phase 3 (US3)**: Independent - modifies different section of useImageUpload.ts
- **Phase 4 (Validation)**: Depends on Phases 1-3 complete

### Parallel Opportunities

**T001 and T002 modify same file sequentially (same STORAGE_CONFIG object)**
**T005 and T006 modify same file sequentially (same catch block)**

---

## Summary

| Phase | User Story | Tasks | Parallel? |
|-------|------------|-------|-----------|
| 1 | US1 Storage Path | T001-T003 | Sequential (same file) |
| 2 | US2 Loadout Crash | T004 | Read-only verification |
| 3 | US3 Error Messages | T005-T006 | Sequential (same file) |
| 4 | Validation | T007-T009 | Sequential |

**Total Tasks**: 9
**MVP Scope**: Phase 1 (P1 critical fix = 3 tasks)
