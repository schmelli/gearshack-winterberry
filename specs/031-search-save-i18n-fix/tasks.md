# Tasks: Search Save Fix & i18n Repair Sprint

**Input**: Design documents from `/specs/031-search-save-i18n-fix/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No automated tests requested - validation via lint, build, and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/`, `components/`, `messages/` at repository root
- **UI Components**: `components/gear-editor/sections/`, `components/inventory-gallery/`
- **i18n Messages**: `messages/de.json`, `messages/en.json`

---

## Phase 1: Setup (Verification)

**Purpose**: Verify current state and understand the bugs

- [x] T001 Read current `handleSelectImage` implementation in `components/gear-editor/sections/MediaSection.tsx` to confirm bug location
- [x] T002 [P] Read `showingItems` translation in `messages/de.json` and `messages/en.json` to verify placeholders

**Checkpoint**: Bug locations confirmed

---

## Phase 2: User Story 1 - Save Gear Item with Search-Selected Image (Priority: P1) 🎯 MVP

**Goal**: Fix the save failure when users select images via Search by clearing local file state

**Independent Test**: Create new gear item → Enter "MSR" brand and "Hubba Hubba" name → Click Search → Select image → Fill required fields → Click Save → Verify success and redirect to inventory

### Implementation for User Story 1

- [x] T003 [US1] Update `handleSelectImage` to call `onFileSelect?.(null, null)` in `components/gear-editor/sections/MediaSection.tsx` (FR-003)
- [x] T004 [US1] Add `onFileSelect` to `handleSelectImage` dependency array in `components/gear-editor/sections/MediaSection.tsx`

**Checkpoint**: Search-selected images can be saved without errors

---

## Phase 3: User Story 2 - View Inventory Page Without i18n Crash (Priority: P1)

**Goal**: Fix the FORMATTING_ERROR that crashes the German Inventory page

**Independent Test**: Switch to German locale → Navigate to /de/inventory → Verify page loads → Apply search filter → Verify "Zeige X von Y Gegenständen" displays

### Implementation for User Story 2

- [x] T005 [US2] Verify `showingItems` in `messages/de.json` has correct placeholders `{filtered}` and `{total}` (FR-005)
- [x] T006 [P] [US2] Verify `showingItems` in `messages/en.json` has matching placeholders `{filtered}` and `{total}` (FR-005)
- [x] T007 [US2] Verify string replacement logic in `components/inventory-gallery/GalleryToolbar.tsx` uses correct variable names (FR-004)
- [x] T008 [US2] Fix `app/[locale]/inventory/page.tsx` - changed `t('itemsCount')` to `t('itemCount')` to match JSON key

**Checkpoint**: German Inventory page loads without FORMATTING_ERROR

---

## Phase 4: User Story 3 - Visual Feedback on Image Selection (Priority: P2)

**Goal**: Add Toast notification when user selects a search image for better UX

**Independent Test**: In Gear Editor → Search for images → Click any result → Verify "Image selected" toast appears

### Implementation for User Story 3

- [x] T009 [US3] Add `toast.info('Image selected')` to `handleSelectImage` in `components/gear-editor/sections/MediaSection.tsx` (FR-006)

**Checkpoint**: Toast feedback appears on image selection

---

## Phase 5: Polish & Validation

**Purpose**: Final verification and code quality

- [x] T010 [P] Run `npm run lint` - must pass with no errors
- [x] T011 [P] Run `npm run build` - must succeed
- [ ] T012 Manual test: Create new item with search-selected image → Verify save succeeds (SC-001)
- [ ] T013 Manual test: Navigate to /de/inventory → Verify no crash (SC-002)
- [ ] T014 Manual test: Apply filter in German inventory → Verify count text displays correctly (SC-003)
- [ ] T015 Manual test: Select search image → Verify toast appears (SC-004)
- [ ] T016 Manual test: Check browser console for errors during all operations (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **User Story 1 (Phase 2)**: Can start after Setup
- **User Story 2 (Phase 3)**: Can start in parallel with US1 (different files)
- **User Story 3 (Phase 4)**: Depends on US1 completion (same file, same function)
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - modifies MediaSection.tsx
- **User Story 2 (P1)**: Independent - modifies message files and verifies GalleryToolbar
- **User Story 3 (P2)**: Depends on US1 - modifies same function in MediaSection.tsx

### Task Dependencies Within Phases

```
Phase 1 (Setup):
T001, T002 (parallel - different files)

Phase 2 (US1 - Image Save):
T003 → T004 (sequential - same function)

Phase 3 (US2 - i18n):
T005, T006 (parallel - different files)
  ↓
T007 (depends on T005, T006 - verification)
  ↓
T008 (if error persists)

Phase 4 (US3 - Toast):
T009 (depends on T003, T004 - same function)

Phase 5 (Polish):
T010, T011 (parallel - lint and build)
T012-T016 (sequential manual tests)
```

### Parallel Opportunities

- T001 and T002 can run in parallel (Setup verification)
- T005 and T006 can run in parallel (message file verification)
- T010 and T011 can run in parallel (lint and build)
- US1 and US2 can be worked on in parallel (different files)

---

## Parallel Example: Setup Phase

```bash
# Launch verification tasks together:
Task: "Read handleSelectImage in MediaSection.tsx"
Task: "Read showingItems in de.json and en.json"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (verify bug locations)
2. Complete Phase 2: User Story 1 (fix image save)
3. Complete Phase 3: User Story 2 (fix i18n crash)
4. **STOP and VALIDATE**: Both P1 bugs should be fixed
5. These are critical bugs - deploy after validation

### Incremental Delivery

1. Setup → Bug locations confirmed
2. Add US1 → Image save works → Can deploy as hotfix
3. Add US2 → i18n crash fixed → Can deploy as hotfix
4. Add US3 → Toast feedback added → Polish enhancement
5. Polish → All validations pass → Production ready

### Single Developer Flow

Since US1 and US3 share the same file and function:
1. Complete T001, T002 (parallel verification)
2. Complete T003, T004, T009 together (all in handleSelectImage)
3. Complete T005, T006, T007, T008 (i18n verification/fix)
4. Run validation (T010-T016)

---

## Notes

- All changes are in existing files - no new files created
- US1 and US3 modify the same function (`handleSelectImage`) - combine edits
- US2 is primarily verification - may require no changes if translations are correct
- The `toast` import already exists in MediaSection.tsx (from sonner)
- Refer to quickstart.md for exact code changes
