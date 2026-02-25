# Tasks: Client-Side Background Removal

**Input**: Design documents from `/specs/026-client-bg-removal/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: No automated tests requested - validation via lint, build, and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App**: `components/`, `hooks/`, `lib/` at repository root
- Single file modification: `components/gear-editor/sections/MediaSection.tsx`
- New utility: `lib/image-processing.ts`

---

## Phase 1: Setup (Dependencies & Components)

**Purpose**: Install dependencies and ensure required UI components exist

- [x] T001 Install @imgly/background-removal dependency: `npm install @imgly/background-removal`
- [x] T002 [P] Check if Switch component exists in `components/ui/switch.tsx`, add if missing: `npx shadcn@latest add switch`
- [x] T003 [P] Check if Label component exists in `components/ui/label.tsx`, add if missing: `npx shadcn@latest add label`

**Checkpoint**: Dependencies installed, shadcn/ui components available

---

## Phase 2: Foundational (Core Utility)

**Purpose**: Create the image processing utility that all user stories depend on

- [x] T004 Create `lib/image-processing.ts` with removeBackground() function (DR-002)
- [x] T005 Add blobToFile() helper function in `lib/image-processing.ts`

**Checkpoint**: Image processing utility ready - UI integration can begin

---

## Phase 3: User Story 1 - Automatic Background Removal (Priority: P1) 🎯 MVP

**Goal**: When users upload images with toggle ON (default), backgrounds are automatically removed and transparent PNG uploaded

**Independent Test**: Upload an image with a background → see "Removing background..." spinner → preview shows transparent result → save and verify PNG stored

### Implementation for User Story 1

- [x] T006 [US1] Add imports to `components/gear-editor/sections/MediaSection.tsx`: Switch, Label, removeBackground, blobToFile
- [x] T007 [US1] Add `isProcessingBg` state to ImageUploadInput in `components/gear-editor/sections/MediaSection.tsx` (line ~94)
- [x] T008 [US1] Update handleFileChange in `components/gear-editor/sections/MediaSection.tsx` to call removeBackground() after validation (lines 103-150)
- [x] T009 [US1] Add processing spinner overlay to ImagePreview section in `components/gear-editor/sections/MediaSection.tsx` (lines 178-203)
- [x] T010 [US1] Add "Removing background..." text with Loader2 icon during processing

**Checkpoint**: Background removal works with toggle defaulting to ON - MVP complete

---

## Phase 4: User Story 2 - Toggle Background Removal (Priority: P2)

**Goal**: Users can disable automatic background removal to upload original images

**Independent Test**: Toggle OFF "Auto-remove background" → upload image → verify original image used without processing

### Implementation for User Story 2

- [x] T011 [US2] Add `autoRemoveBg` state (default: true) to ImageUploadInput in `components/gear-editor/sections/MediaSection.tsx` (line ~94)
- [x] T012 [US2] Add Switch toggle UI with Label above mode buttons in `components/gear-editor/sections/MediaSection.tsx` (before line 206)
- [x] T013 [US2] Update handleFileChange to check `autoRemoveBg` before calling removeBackground() in `components/gear-editor/sections/MediaSection.tsx`
- [x] T014 [US2] Disable toggle during processing (isProcessingBg || isUploading)

**Checkpoint**: Toggle controls background removal behavior

---

## Phase 5: User Story 3 - Graceful Error Handling (Priority: P2)

**Goal**: Processing failures fall back to original image with user notification

**Independent Test**: Simulate processing error → verify original image used → toast notification shown

### Implementation for User Story 3

- [x] T015 [US3] Wrap removeBackground() call in try-catch in `components/gear-editor/sections/MediaSection.tsx`
- [x] T016 [US3] Add console.error logging for failed processing
- [x] T017 [US3] Add toast.info() notification when falling back to original image (FR-007)
- [x] T018 [US3] Ensure finally block sets isProcessingBg to false

**Checkpoint**: Errors handled gracefully with fallback and notification

---

## Phase 6: Polish & Validation

**Purpose**: Final verification and code quality

- [x] T019 [P] Run `npm run lint` - must pass with no errors
- [x] T020 [P] Run `npm run build` - must succeed
- [ ] T021 Manual test: Navigate to /inventory/new, verify toggle ON by default, upload image with background
- [ ] T022 Manual test: Verify "Removing background..." spinner appears during processing
- [ ] T023 Manual test: Verify transparent PNG in preview and persists after save
- [ ] T024 Manual test: Toggle OFF, upload image, verify no processing occurs
- [ ] T025 Manual test: Verify initial page load is fast (WASM loads lazily on first use)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - install packages first
- **Foundational (Phase 2)**: Depends on T001 - create utility before UI
- **User Story 1 (Phase 3)**: Depends on Phase 2 - core background removal
- **User Story 2 (Phase 4)**: Depends on Phase 2 - toggle controls processing
- **User Story 3 (Phase 5)**: Depends on Phase 2 - error handling
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 - Independent (adds toggle control)
- **User Story 3 (P2)**: Can start after Phase 2 - Independent (adds error handling)

### Task Dependencies Within MediaSection.tsx

```
T006 (imports)
  ↓
T007 + T011 (state) - both add state, must be together
  ↓
T008 + T013 (handleFileChange) - sequential edits to same function
  ↓
T009 + T010 (spinner overlay) - add processing UI
  ↓
T012 (toggle UI) - add Switch component
  ↓
T014 + T015-T018 (refinements) - error handling and disable states
```

### Parallel Opportunities

- T002 and T003 can run in parallel (different component files)
- T004 and T005 must be sequential (same file)
- T019 and T020 can run in parallel (lint and build independent)
- T021-T025 must be sequential (manual testing flow)

---

## Parallel Example: Setup Phase

```bash
# Run in parallel:
npm install @imgly/background-removal &
npx shadcn@latest add switch &
npx shadcn@latest add label &
wait
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 (T006-T010)
4. **STOP and VALIDATE**: Test auto background removal
5. If working, deploy - this is the MVP!

### Incremental Delivery

1. Setup + Foundational → Utility ready
2. Add User Story 1 → Background removal works (MVP!)
3. Add User Story 2 → Toggle control added
4. Add User Story 3 → Error handling added
5. Polish → Lint, build, manual tests

### Single Developer Flow

Since all changes are in 2 files (lib/image-processing.ts + MediaSection.tsx):
1. Complete T001-T005 (dependencies + utility)
2. Work through T006-T018 sequentially in MediaSection.tsx
3. Run lint/build/manual tests

---

## Notes

- All implementation changes are in `components/gear-editor/sections/MediaSection.tsx` (~80 lines changed)
- New file: `lib/image-processing.ts` (~20 lines)
- No changes to hooks/useImageUpload.ts or Firebase upload logic
- WASM assets lazy-load from CDN on first use (no bundle impact)
- Toggle state resets to ON on component mount (no persistence per spec)
