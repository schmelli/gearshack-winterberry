# Tasks: Integrated Image Search

**Input**: Design documents from `/specs/030-integrated-image-search/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No automated tests requested - validation via lint, build, and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/`, `components/`, `types/` at repository root
- **Server Actions**: `app/actions/`
- **UI Components**: `components/gear-editor/sections/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and prepare environment

- [x] T001 Verify AspectRatio component exists in `components/ui/aspect-ratio.tsx` (add via shadcn if missing)
- [x] T002 Verify SERPER_API_KEY is configured in `.env.local`

**Checkpoint**: Environment ready for implementation

---

## Phase 2: User Story 1+4 - Search, Select, and Secure API (Priority: P1) 🎯 MVP

**Goal**: Core search functionality with secure API key management. User clicks search, sees image grid, clicks to select. API key never exposed to client.

**Independent Test**: Open gear editor, enter brand "MSR" and name "Hubba Hubba", click search button, verify image grid appears, click an image to select it. Verify no API key in browser Network tab.

**Note**: US1 (core search) and US4 (API security) are combined because the Server Action implements both requirements simultaneously.

### Implementation for User Stories 1 + 4

- [x] T003 [US1] Create Server Action with ImageSearchResult type and searchGearImages function in `app/actions/image-search.ts` (FR-011, FR-012)
- [x] T004 [US1] Add search state (searchResults, isSearching, searchError) to ImageUploadInput in `components/gear-editor/sections/MediaSection.tsx`
- [x] T005 [US1] Add handleImageSearch function that constructs query from brand+name and calls Server Action in `components/gear-editor/sections/MediaSection.tsx` (FR-001, FR-002, FR-003)
- [x] T006 [US1] Add handleSelectImage function that populates form field and closes grid in `components/gear-editor/sections/MediaSection.tsx` (FR-006, FR-007, FR-014)
- [x] T007 [US1] Add handleDismissSearch function to close results grid in `components/gear-editor/sections/MediaSection.tsx`
- [x] T008 [US1] Replace Popover with functional Search Button in `components/gear-editor/sections/MediaSection.tsx` (FR-001)
- [x] T009 [US1] Add 3x3 image results grid with AspectRatio thumbnails in `components/gear-editor/sections/MediaSection.tsx` (FR-004, FR-005, FR-013, FR-015)

**Checkpoint**: Core image search works - users can search and select images. API key is secure.

---

## Phase 3: User Story 2 - Loading Feedback (Priority: P1)

**Goal**: Visual feedback during search prevents user confusion

**Independent Test**: Click search button, verify loading spinner appears immediately, disappears when results load.

### Implementation for User Story 2

- [x] T010 [US2] Add loading spinner to Search Button (shows Loader2 when isSearching=true) in `components/gear-editor/sections/MediaSection.tsx` (FR-008)
- [x] T011 [US2] Disable Search Button while isSearching or isProcessingBg or isUploading in `components/gear-editor/sections/MediaSection.tsx`

**Checkpoint**: Loading state provides clear feedback during search

---

## Phase 4: User Story 3 - Error Handling (Priority: P2)

**Goal**: Graceful error states with helpful messages

**Independent Test**: Test with no brand/name entered, verify helpful message. Test with query that returns no results, verify "No images found" message.

### Implementation for User Story 3

- [x] T012 [US3] Add validation check for empty query with user-friendly message in handleImageSearch in `components/gear-editor/sections/MediaSection.tsx` (FR-003)
- [x] T013 [US3] Add "No images found" message when search returns empty array in `components/gear-editor/sections/MediaSection.tsx` (FR-009)
- [x] T014 [US3] Add error display area in search results grid section in `components/gear-editor/sections/MediaSection.tsx` (FR-010)

**Checkpoint**: Error states show helpful, actionable messages

---

## Phase 5: Polish & Validation

**Purpose**: Final verification and code quality

- [x] T015 [P] Run `npm run lint` - must pass with no errors
- [x] T016 [P] Run `npm run build` - must succeed
- [ ] T017 Manual test: Verify search button shows loading spinner (SC-001)
- [ ] T018 Manual test: Verify 3x3 grid displays with hover effects (FR-015)
- [ ] T019 Manual test: Verify clicking image populates form field (FR-007)
- [ ] T020 Manual test: Verify grid closes after selection (FR-014)
- [ ] T021 Manual test: Verify "Enter brand or name" message for empty query (FR-003)
- [ ] T022 Manual test: Verify no API key visible in browser DevTools Network tab (SC-003)
- [ ] T023 Manual test: Verify selected image displays in preview area

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify prerequisites first
- **User Stories 1+4 (Phase 2)**: Depends on Setup - creates Server Action and core UI
- **User Story 2 (Phase 3)**: Depends on Phase 2 (needs search button and state to exist)
- **User Story 3 (Phase 4)**: Depends on Phase 2 (needs handleImageSearch to add validation)
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **User Stories 1+4 (P1)**: Can start after Setup - Foundation of feature
- **User Story 2 (P1)**: Can start after US1+4 - Adds loading state to existing UI
- **User Story 3 (P2)**: Can start after US1+4 - Adds error handling to existing logic

### Task Dependencies Within Phases

```
Phase 1 (Setup):
T001, T002 (parallel - independent checks)

Phase 2 (US1+4 - Core Search):
T003 (Server Action - must be first)
  ↓
T004 (add state to component)
  ↓
T005, T006, T007 (handlers - depend on state, can be parallel)
  ↓
T008 (replace Popover - depends on handlers)
  ↓
T009 (grid UI - depends on handlers and Server Action import)

Phase 3 (US2 - Loading):
T010, T011 (parallel - different parts of button)

Phase 4 (US3 - Errors):
T012 (validation in handler)
  ↓
T013, T014 (parallel - different UI areas)

Phase 5 (Polish):
T015, T016 (parallel - lint and build)
T017-T023 (sequential manual tests)
```

### Parallel Opportunities

- T001 and T002 can run in parallel (Setup checks)
- T005, T006, T007 can run in parallel (different handlers in same file - careful with merge)
- T010 and T011 can run in parallel (different button concerns)
- T013 and T014 can run in parallel (different UI areas)
- T015 and T016 can run in parallel (lint and build)

---

## Parallel Example: Phase 2 Handlers

```bash
# After T004 completes (state added), launch handlers together:
Task: "Add handleImageSearch function in MediaSection.tsx"
Task: "Add handleSelectImage function in MediaSection.tsx"
Task: "Add handleDismissSearch function in MediaSection.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1+4 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: User Stories 1+4 (T003-T009)
3. **STOP and VALIDATE**: Test core search functionality
4. If working, this is a functional MVP!

### Incremental Delivery

1. Setup → Prerequisites verified
2. Add US1+4 → Core search works (MVP!)
3. Add US2 → Loading feedback improves UX
4. Add US3 → Error handling completes experience
5. Polish → Lint, build, manual validation

### Single Developer Flow

Since all changes are in 2 files:
1. Complete T001-T002 (verify prerequisites)
2. Create Server Action (T003)
3. Update MediaSection.tsx in one session (T004-T014)
4. Run validation (T015-T023)

---

## Notes

- All UI changes are in a single file: `components/gear-editor/sections/MediaSection.tsx`
- Server Action is a new file: `app/actions/image-search.ts`
- The existing Popover placeholder (lines ~280-298) is replaced with the search button
- Search results grid goes after the URL input (after `{mode === 'url' && (...)}` block)
- Uses existing shadcn/ui components (Button, AspectRatio, Loader2 icon)
- Refer to quickstart.md for detailed code snippets
