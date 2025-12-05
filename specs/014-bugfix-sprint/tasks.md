# Tasks: Final Polish & Bugfix Sprint

**Input**: Design documents from `/specs/014-bugfix-sprint/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: Manual testing only (no automated tests in this feature)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify dependencies and prepare for implementation

- [X] T001 Verify Popover component is installed, if not run `npx shadcn@latest add popover`
- [X] T002 Verify Sonner toast is imported and available in the project

---

## Phase 2: User Story 1 - Stable Login Screen Experience (Priority: P1)

**Goal**: Replace auto-rotating background with single random static image, fix viewport coverage

**Independent Test**: Navigate to login page, verify ONE static background with no white bars at any viewport size

### Implementation for User Story 1

- [X] T003 [US1] Remove rotation interval and transition state from components/auth/BackgroundRotator.tsx
- [X] T004 [US1] Add useState with lazy initializer for random image selection on mount in components/auth/BackgroundRotator.tsx
- [X] T005 [US1] Update background container to use `fixed inset-0 w-screen h-screen` in components/auth/BackgroundRotator.tsx
- [X] T006 [US1] Ensure object-cover is applied to Image component in components/auth/BackgroundRotator.tsx
- [X] T007 [US1] Remove next image preloading logic (no longer needed) in components/auth/BackgroundRotator.tsx

**Checkpoint**: Login page shows static random background with full viewport coverage

---

## Phase 3: User Story 2 - Clear Gear Editor Validation Feedback (Priority: P1)

**Goal**: Add visible validation errors with toast notifications and required field indicators

**Independent Test**: Open gear editor, clear Name field, click Save - see red error text and toast

### Implementation for User Story 2

- [X] T008 [US2] Add red asterisk to Name field label in components/gear-editor/sections/GeneralInfoSection.tsx
- [X] T009 [US2] Import toast from sonner in hooks/useGearEditor.ts
- [X] T010 [US2] Modify handleSubmit to call form.trigger() before submission in hooks/useGearEditor.ts
- [X] T011 [US2] Add toast.error('Please fix errors before saving') when validation fails in hooks/useGearEditor.ts
- [X] T012 [US2] Ensure FormMessage displays red error text (verify shadcn styling) in components/gear-editor/sections/GeneralInfoSection.tsx

**Checkpoint**: Validation errors visible with toast notification on save attempt

---

## Phase 4: User Story 3 - Reliable Image Upload (Priority: P1)

**Goal**: Ensure image upload completes before form submission

**Independent Test**: Upload image in gear editor, click Save - image URL saved to Firestore

### Implementation for User Story 3

- [X] T013 [US3] Review current upload flow in components/gear-editor/sections/MediaSection.tsx
- [X] T014 [US3] Add isUploading prop/callback from MediaSection to parent form in components/gear-editor/sections/MediaSection.tsx
- [X] T015 [US3] Disable Save button or show loading state while upload in progress in components/gear-editor/GearEditorForm.tsx
- [X] T016 [US3] Ensure upload error toast displays actionable message in components/gear-editor/sections/MediaSection.tsx

**Checkpoint**: Image upload completes before save, error toast on failure

---

## Phase 5: User Story 4 - Visible Header Icons (Priority: P1)

**Goal**: Update all header icons to white color for visibility on Deep Forest Green

**Independent Test**: Load any page, verify bell, sync, and user icons are white/visible

### Implementation for User Story 4

- [X] T017 [P] [US4] Update SyncIndicator idle state icon to text-white in components/layout/SyncIndicator.tsx
- [X] T018 [P] [US4] Update SyncIndicator syncing state icon to text-white (keep animation) in components/layout/SyncIndicator.tsx
- [X] T019 [P] [US4] Update SyncIndicator error state icon to text-white or text-red-300 for contrast in components/layout/SyncIndicator.tsx
- [X] T020 [P] [US4] Update hover state styling for SyncIndicator button in components/layout/SyncIndicator.tsx
- [X] T021 [US4] Verify Bell icon already has text-white in components/layout/SiteHeader.tsx (fix if needed)
- [X] T022 [US4] Update UserMenu button/avatar trigger for visibility on dark background in components/layout/UserMenu.tsx

**Checkpoint**: All header icons visible with white coloring

---

## Phase 6: User Story 5 - Polished Gear Editor Tab Design (Priority: P2)

**Goal**: Apply pill-style design to gear editor tabs

**Independent Test**: Open gear editor, verify tabs have rounded-full muted background styling

### Implementation for User Story 5

- [X] T023 [US5] Update TabsList className to `bg-muted rounded-full p-1` in components/gear-editor/GearEditorForm.tsx
- [X] T024 [US5] Update TabsTrigger className for pill appearance with active state in components/gear-editor/GearEditorForm.tsx

**Checkpoint**: Tab navigation has modern pill styling

---

## Phase 7: User Story 6 - Image Search Placeholder (Priority: P3)

**Goal**: Replace disabled tooltip with clickable popover for image search

**Independent Test**: Click search icon in media section, see popover with "Coming in V2" message

### Implementation for User Story 6

- [X] T025 [US6] Import Popover components in components/gear-editor/sections/MediaSection.tsx
- [X] T026 [US6] Remove disabled prop and Tooltip wrapper from search button in components/gear-editor/sections/MediaSection.tsx
- [X] T027 [US6] Wrap search button with Popover and PopoverTrigger in components/gear-editor/sections/MediaSection.tsx
- [X] T028 [US6] Add PopoverContent with "Image Search coming in V2" message in components/gear-editor/sections/MediaSection.tsx

**Checkpoint**: Search icon opens popover on click

---

## Phase 8: Polish & Validation

**Purpose**: Final validation and cross-cutting concerns

- [X] T029 Run npm run lint and fix any errors
- [X] T030 Run npm run build and fix any errors
- [ ] T031 Manual testing: Verify all user story acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phases 2-7 (User Stories)**: Depend on Phase 1 completion
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Login Screen)**: Independent - no dependencies on other stories
- **US2 (Validation)**: Independent - modifies different files
- **US3 (Image Upload)**: Independent - modifies MediaSection and form
- **US4 (Header Icons)**: Independent - modifies header components only
- **US5 (Tab Design)**: Independent - modifies GearEditorForm only
- **US6 (Image Search)**: Independent - modifies MediaSection only

### Parallel Opportunities

**All P1 User Stories can run in parallel** (different component files):
- US1: BackgroundRotator.tsx
- US2: GeneralInfoSection.tsx + useGearEditor.ts
- US3: MediaSection.tsx + GearEditorForm.tsx
- US4: SyncIndicator.tsx + UserMenu.tsx + SiteHeader.tsx

**Within Phase 5 (US4)**:
- T017, T018, T019, T020 can run in parallel (same file but different cases)

---

## Parallel Example: All P1 Stories

```bash
# After Phase 1 completes, launch all P1 user stories in parallel:

# US1: Login Screen (BackgroundRotator)
Task: "Remove rotation and add static image in components/auth/BackgroundRotator.tsx"

# US2: Validation Feedback (GeneralInfoSection + useGearEditor)
Task: "Add required asterisk in components/gear-editor/sections/GeneralInfoSection.tsx"
Task: "Add validation toast in hooks/useGearEditor.ts"

# US3: Image Upload (MediaSection)
Task: "Add upload state coordination in components/gear-editor/sections/MediaSection.tsx"

# US4: Header Icons (SyncIndicator + UserMenu)
Task: "Update icon colors in components/layout/SyncIndicator.tsx"
Task: "Update button styling in components/layout/UserMenu.tsx"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup
2. Complete Phases 2-5: All P1 user stories (can run in parallel)
3. **STOP and VALIDATE**: Test login, validation, upload, and header icons
4. Deploy/demo if ready

### Full Implementation

1. Setup → P1 Stories in parallel → Validate MVP
2. Add US5 Tab Design → Test tabs
3. Add US6 Image Search → Test popover
4. Final polish and validation

---

## Summary

| Phase | User Story | Tasks | Parallel? |
|-------|------------|-------|-----------|
| 1 | Setup | T001-T002 | Sequential |
| 2 | US1 Login Screen | T003-T007 | Sequential (same file) |
| 3 | US2 Validation | T008-T012 | Some parallel |
| 4 | US3 Image Upload | T013-T016 | Sequential |
| 5 | US4 Header Icons | T017-T022 | T017-T020 parallel |
| 6 | US5 Tab Design | T023-T024 | Sequential (same file) |
| 7 | US6 Image Search | T025-T028 | Sequential (same file) |
| 8 | Polish | T029-T031 | Sequential |

**Total Tasks**: 31
**MVP Scope**: Phases 1-5 (P1 stories = 22 tasks)
