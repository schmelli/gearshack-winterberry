# Tasks: Image Management Sprint

**Input**: Design documents from `/specs/024-image-management/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: No automated tests requested - validation via lint, build, and manual testing.

**Organization**: Tasks enable all 3 user stories with a single code change (shared implementation).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App**: `components/`, `hooks/`, `lib/` at repository root
- Single file modification: `components/gear-editor/sections/MediaSection.tsx`

---

## Phase 1: Setup (Verification)

**Purpose**: Verify prerequisites before implementation

- [x] T001 Read spec.md and understand the 3 user stories
- [x] T002 Read plan.md and understand implementation strategy
- [x] T003 Read research.md and understand the 5 decision records

---

## Phase 2: Foundational (No Changes Needed)

**Purpose**: Verify existing infrastructure supports the feature

**✅ ALREADY COMPLETE**: Research confirmed no changes needed:

- `lib/gear-utils.ts` line 152 already converts empty string to null
- `hooks/useGearEditor.ts` already handles form submission correctly
- `lib/firebase/adapter.ts` already handles null values in Firestore

**Checkpoint**: Foundational infrastructure is already in place - proceed to implementation

---

## Phase 3: User Story 1 - Remove Primary Image (Priority: P1) 🎯 MVP

**Goal**: Add a remove button to the primary image preview that clears the image

**Independent Test**: Open gear item with image → click remove → image clears, upload interface appears

### Implementation for User Story 1

- [x] T004 [US1] Wrap ImagePreview in relative container in `components/gear-editor/sections/MediaSection.tsx` (line ~178)
- [x] T005 [US1] Add remove Button with X icon inside relative container in `components/gear-editor/sections/MediaSection.tsx`
- [x] T006 [US1] Implement onClick handler: stopPropagation + onChange('') + onFileSelect(null, null) + handleClearFile()
- [x] T007 [US1] Add styling: `absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground`
- [x] T008 [US1] Add accessibility: `aria-label="Remove image"` and ensure keyboard navigation works

**Checkpoint**: Remove button visible and functional - clears image immediately on click

---

## Phase 4: User Story 2 - Replace Primary Image (Priority: P1)

**Goal**: Enable users to upload/paste a new image after removing the current one

**Independent Test**: Remove image → paste URL or upload file → new image appears

### Implementation for User Story 2

**✅ NO ADDITIONAL TASKS NEEDED**: The existing upload/URL interface already handles replacement:

- After remove clears the form field, the upload/URL input interface becomes visible (FR-007)
- Pasting a URL or uploading a file works as designed
- The remove button implementation in Phase 3 enables this workflow automatically

**Checkpoint**: After removing image, user can immediately upload or paste a new image URL

---

## Phase 5: User Story 3 - Persist Image Removal (Priority: P2)

**Goal**: Ensure removed images stay removed after save and reload

**Independent Test**: Remove image → save → reload page → image should still be removed

### Implementation for User Story 3

**✅ NO ADDITIONAL TASKS NEEDED**: Research confirmed existing save logic handles this:

- `formDataToGearItem()` converts empty string to null (line 152 in gear-utils.ts)
- Firestore update correctly persists null value
- Form loads null as empty string on edit

**Checkpoint**: Saved removals persist correctly on page reload

---

## Phase 6: Polish & Validation

**Purpose**: Final verification and validation

- [x] T009 Verify X icon is imported from lucide-react in MediaSection.tsx (line 26)
- [x] T010 Run `npm run lint` - must pass with no errors
- [x] T011 Run `npm run build` - must succeed
- [ ] T012 Manual test: Navigate to /inventory/[id]/edit with existing image and verify remove button visible in top-right corner
- [ ] T013 Manual test: Click remove button and verify image clears immediately, upload interface appears
- [ ] T014 Manual test: Upload new image and save, verify replacement persists
- [ ] T015 Manual test: Remove image, save, reload page - verify image stays removed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - read documentation first
- **Foundational (Phase 2)**: Already complete - no action needed
- **User Story 1 (Phase 3)**: The only implementation phase - all code changes here
- **User Story 2 (Phase 4)**: Automatically enabled by Phase 3 implementation
- **User Story 3 (Phase 5)**: Already supported by existing save logic
- **Polish (Phase 6)**: Depends on Phase 3 completion

### Task Dependencies Within Phase 3

```
T004 (wrap in container)
  ↓
T005 (add button) + T006 (onClick handler) + T007 (styling) + T008 (accessibility)
  ↓
All User Stories enabled
```

### Parallel Opportunities

- T004-T008 must be sequential (same component, same lines)
- T010-T011 can run in parallel (lint and build are independent)
- T012-T015 must be sequential (manual testing flow)

---

## Parallel Example: Validation Tasks

```bash
# Can run simultaneously:
npm run lint &
npm run build &
wait
```

---

## Implementation Strategy

### MVP First (Phase 3 Only)

1. Complete Phase 1: Read documentation (5 min)
2. Skip Phase 2: Already complete
3. Complete Phase 3: Add remove button (15 min)
4. **STOP and VALIDATE**: Test all 3 user stories work
5. Complete Phase 6: Lint, build, and manual testing

### Key Insight

This feature has a single implementation task (T004-T008) that enables all 3 user stories:

| User Story | Implementation | Enabled By |
|------------|----------------|------------|
| US1: Remove Image | T004-T008 | Remove button added |
| US2: Replace Image | None needed | Existing upload/URL interface |
| US3: Persist Removal | None needed | Existing save logic |

**Total new code**: ~20 lines in one file

---

## Notes

- All code changes are in a single file: `components/gear-editor/sections/MediaSection.tsx`
- No new files needed
- No changes to hooks, utilities, or Firestore adapter
- The 5 implementation tasks (T004-T008) are in the same component section, so not parallelizable
- Validation tasks can partially parallelize (lint + build)
