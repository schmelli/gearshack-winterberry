# Tasks: Stabilization Sprint - i18n, Image Domains & MIME Fixes

**Input**: Design documents from `/specs/036-stabilization-sprint/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not required - this is a bug fix sprint with manual validation via quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify current state and confirm no blocking issues

- [x] T001 Verify current branch is `036-stabilization-sprint` and clean working state
- [x] T002 Run `npm run lint` to establish baseline lint status
- [x] T003 Run `npm run build` to establish baseline build status

---

## Phase 2: Foundational (Verification)

**Purpose**: Confirm existing configuration is correct before making fixes

- [x] T004 Verify `next.config.ts` has wildcard hostname pattern `hostname: '**'` for images
- [x] T005 [P] Verify i18n message format in `messages/en.json` for showingItems key
- [x] T006 [P] Verify i18n message format in `messages/de.json` for showingItems key

**Checkpoint**: Configuration verified - user story fixes can proceed

---

## Phase 3: User Story 1 - View Inventory Page Without Errors (Priority: P1)

**Goal**: Fix the FORMATTING_ERROR crash on inventory page by passing correct parameters to i18n `t()` function

**Independent Test**: Navigate to /en/inventory and /de/inventory. The page loads without errors and displays "Showing X of Y items" correctly.

### Implementation for User Story 1

- [x] T007 [US1] Read current implementation in `app/[locale]/inventory/page.tsx` to understand filteredCount/itemCount values
- [x] T008 [US1] Update `app/[locale]/inventory/page.tsx` to pass `{ filtered: filteredCount, total: itemCount }` to `t('showingItems', ...)`
- [x] T009 [US1] Update `app/[locale]/inventory/page.tsx` to pass `{ count: itemCount }` to `t('itemCount', ...)`
- [x] T010 [US1] Read current implementation in `components/inventory-gallery/GalleryToolbar.tsx`
- [x] T011 [US1] Update `components/inventory-gallery/GalleryToolbar.tsx` to use pre-formatted translation strings directly (remove `.replace()` calls)
- [x] T012 [US1] Run `npm run build` to verify no TypeScript errors
- [ ] T013 [US1] Manual test: Navigate to /en/inventory and verify message displays correctly
- [ ] T014 [US1] Manual test: Navigate to /de/inventory and verify German message displays correctly

**Checkpoint**: User Story 1 complete - inventory page loads without i18n errors

---

## Phase 4: User Story 2 - Display External Product Images (Priority: P1)

**Goal**: Confirm external images from any HTTPS domain display correctly

**Independent Test**: View a gear item with an image from fjellsport.no or any external domain. Image displays without errors.

### Implementation for User Story 2

- [x] T015 [US2] Confirm `next.config.ts` already has `hostname: '**'` pattern (from T004 verification)
- [ ] T016 [US2] Manual test: View a gear item with an external image URL and confirm it displays
- [ ] T017 [US2] Manual test: Try adding a gear item with an image from rei.com or similar external domain

**Checkpoint**: User Story 2 complete - external images display without domain errors

---

## Phase 5: User Story 3 - Upload Externally-Sourced Images (Priority: P1)

**Goal**: Fix MIME type validation in image import to ensure Firebase Storage accepts uploaded files

**Independent Test**: Use image search to import an image, save the gear item. The image uploads and displays correctly.

### Implementation for User Story 3

- [x] T018 [US3] Read current implementation in `hooks/useGearEditor.ts` to locate `importExternalImage` function
- [x] T019 [US3] Update `hooks/useGearEditor.ts` to validate content-type header before creating File object
- [x] T020 [US3] Ensure content-type validation: if not starting with `image/`, default to `image/jpeg`
- [x] T021 [US3] Run `npm run build` to verify no TypeScript errors
- [ ] T022 [US3] Manual test: Search for an image, import it, and save the gear item
- [ ] T023 [US3] Manual test: Verify the saved image displays correctly when viewing the item

**Checkpoint**: User Story 3 complete - imported images upload successfully

---

## Phase 6: Polish & Verification

**Purpose**: Final validation across all fixes

- [x] T024 Run `npm run lint` and fix any issues
- [x] T025 Run `npm run build` and verify successful completion
- [ ] T026 Execute quickstart.md Test 1: i18n Error Fix validation
- [ ] T027 Execute quickstart.md Test 2: External Image Display validation
- [ ] T028 Execute quickstart.md Test 3: Image Upload MIME Type validation
- [x] T029 Commit all changes with descriptive message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phases 3-5)**: Depend on Foundational phase completion
  - All three user stories can proceed in parallel (different files)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Modifies `app/[locale]/inventory/page.tsx` and `components/inventory-gallery/GalleryToolbar.tsx`
- **User Story 2 (P1)**: Verification only - no code changes needed (already configured)
- **User Story 3 (P1)**: Modifies `hooks/useGearEditor.ts`

All three stories affect different files and can be implemented in parallel.

### Parallel Opportunities

- T005, T006: Both can run in parallel (different locale files)
- US1, US2, US3: All affect different files, can be implemented in parallel
- T007-T014, T015-T017, T018-T023: Can all proceed simultaneously

---

## Parallel Example: All User Stories

```bash
# These can all start simultaneously after Phase 2:
Agent 1: User Story 1 tasks (T007-T014) - inventory page i18n fix
Agent 2: User Story 2 tasks (T015-T017) - verification only
Agent 3: User Story 3 tasks (T018-T023) - MIME type validation fix
```

---

## Implementation Strategy

### MVP First (All Stories Are P1)

Since all three user stories are P1 priority bugs, they should all be fixed in this sprint:

1. Complete Phase 1: Setup verification
2. Complete Phase 2: Configuration verification
3. Complete Phases 3-5: All user stories (can be parallel)
4. Complete Phase 6: Final validation
5. Commit and push

### Single Developer Approach

1. T001-T006: Quick verification (5 min)
2. T007-T014: Fix i18n parameters (15 min)
3. T015-T017: Verify image domains (5 min)
4. T018-T023: Fix MIME type validation (10 min)
5. T024-T029: Final validation and commit (10 min)

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 29 |
| Phase 1 (Setup) | 3 |
| Phase 2 (Foundational) | 3 |
| User Story 1 Tasks | 8 |
| User Story 2 Tasks | 3 |
| User Story 3 Tasks | 6 |
| Phase 6 (Polish) | 6 |
| Parallelizable Tasks | 5 |

**Files Modified**:
- `app/[locale]/inventory/page.tsx` (US1)
- `components/inventory-gallery/GalleryToolbar.tsx` (US1)
- `hooks/useGearEditor.ts` (US3)

**Files Verified Only**:
- `next.config.ts` (US2 - already configured correctly)
- `messages/en.json` (verification)
- `messages/de.json` (verification)
