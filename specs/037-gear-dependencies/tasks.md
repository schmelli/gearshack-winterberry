# Tasks: Smart Gear Dependencies

**Input**: Design documents from `/specs/037-gear-dependencies/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated tests requested (manual testing per Technical Context)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/`, `components/`, `hooks/`, `lib/`, `types/` at repository root
- Paths follow existing Feature-Sliced Light architecture

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Data layer foundation - types, validation, and persistence

- [x] T001 [P] Add `dependencyIds: string[]` field to GearItem interface in types/gear.ts
- [x] T002 [P] Add `dependencyIds: string[]` field to GearItemFormData interface in types/gear.ts
- [x] T003 [P] Add `dependencyIds: []` to DEFAULT_GEAR_ITEM_FORM in types/gear.ts
- [x] T004 Add Zod validation for dependencyIds in lib/validations/gear-schema.ts
- [x] T005 Add snake_case conversion for dependency_ids in lib/firebase/adapter.ts (transformGearItemFromFirestore)
- [x] T006 Add camelCase to snake_case conversion in lib/firebase/adapter.ts (prepareGearItemForFirestore)

**Checkpoint**: Data model ready - dependency field exists in types and persists to Firestore

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utility functions that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create lib/dependency-utils.ts with createItemsMap() helper function
- [x] T008 Implement resolveDependencies() with DFS traversal and visited set in lib/dependency-utils.ts
- [x] T009 Implement validateDependencyLink() for circular reference detection in lib/dependency-utils.ts
- [x] T010 Implement checkMissingDependencies() for loadout comparison in lib/dependency-utils.ts
- [x] T011 Implement cleanBrokenDependencies() for stale link removal in lib/dependency-utils.ts
- [x] T012 Export all utility functions from lib/dependency-utils.ts with proper TypeScript types

**Checkpoint**: Foundation ready - utility functions tested and working

---

## Phase 3: User Story 1 - Link Accessories to Main Gear (Priority: P1) MVP

**Goal**: Users can link accessory items to a main gear item in the Gear Editor

**Independent Test**: Open a gear item in editor, add dependency links to other items, save, and verify links persist when reopening

### Implementation for User Story 1

- [x] T013 [P] [US1] Create DependenciesSection.tsx component shell in components/gear-editor/sections/
- [x] T014 [US1] Implement item search/filter combobox in DependenciesSection.tsx using shadcn/ui Command
- [x] T015 [US1] Implement dependency selection with validateDependencyLink() check in DependenciesSection.tsx
- [x] T016 [US1] Display linked dependencies as removable badges in DependenciesSection.tsx
- [x] T017 [US1] Add circular dependency warning Alert in DependenciesSection.tsx
- [x] T018 [US1] Add "Dependencies" tab to TABS array in components/gear-editor/GearEditorForm.tsx
- [x] T019 [US1] Add TabsContent for dependencies tab with DependenciesSection in GearEditorForm.tsx
- [x] T020 [US1] Handle dependencyIds in form state initialization in hooks/useGearEditor.ts
- [x] T021 [US1] Handle dependencyIds in form submission/save in hooks/useGearEditor.ts
- [x] T022 [US1] Add broken link cleanup on item load with toast notification in hooks/useGearEditor.ts

**Checkpoint**: User Story 1 complete - Can create, view, and remove dependency links in Gear Editor

---

## Phase 4: User Story 2 - Dependency Detection in Loadout Builder (Priority: P2)

**Goal**: When adding an item with dependencies to a loadout, system detects and shows missing accessories

**Independent Test**: Add a gear item with existing dependencies to a loadout and verify modal appears with missing accessories

**Dependencies**: Requires User Story 1 (links must exist to be detected)

### Implementation for User Story 2

- [x] T023 [P] [US2] Create useDependencyPrompt.ts hook shell in hooks/
- [x] T024 [US2] Implement state management (isOpen, pendingDependencies, triggeringItem) in useDependencyPrompt.ts
- [x] T025 [US2] Implement triggerCheck() to detect and resolve transitive dependencies in useDependencyPrompt.ts
- [x] T026 [US2] Implement selection state (toggleSelection, selectAll, deselectAll) in useDependencyPrompt.ts
- [x] T027 [P] [US2] Create DependencyPromptDialog.tsx component shell in components/loadouts/
- [x] T028 [US2] Implement Dialog with dependency list and checkboxes in DependencyPromptDialog.tsx
- [x] T029 [US2] Add "Add All", "Add Selected", "Skip" footer buttons in DependencyPromptDialog.tsx
- [x] T030 [US2] Display direct vs transitive dependency labels in DependencyPromptDialog.tsx

**Checkpoint**: User Story 2 complete - Modal appears when adding items with dependencies

---

## Phase 5: User Story 3 - Add Dependencies to Loadout (Priority: P3)

**Goal**: Users can add all or selected dependencies to their loadout from the prompt

**Independent Test**: Trigger dependency modal and verify Add All/Add Selected/Skip all work correctly

**Dependencies**: Requires User Story 2 (modal must exist)

### Implementation for User Story 3

- [x] T031 [US3] Implement onAddAll() handler in useDependencyPrompt.ts
- [x] T032 [US3] Implement onAddSelected() handler in useDependencyPrompt.ts
- [x] T033 [US3] Implement onSkip() handler in useDependencyPrompt.ts
- [x] T034 [US3] Implement onCancel() handler in useDependencyPrompt.ts
- [x] T035 [US3] Integrate useDependencyPrompt into useLoadoutEditor.ts addItem flow
- [x] T036 [US3] Modify LoadoutPicker.tsx to use dependency-aware add handler
- [x] T037 [US3] Add DependencyPromptDialog to loadout detail page app/[locale]/loadouts/[id]/page.tsx
- [x] T038 [US3] Add toast notifications for dependency add outcomes in useDependencyPrompt.ts

**Checkpoint**: User Story 3 complete - Full dependency management flow working end-to-end

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, UX improvements, and validation

- [x] T039 [P] Handle transitive dependency display with indentation/grouping in DependencyPromptDialog.tsx
- [x] T040 [P] Add empty state message when no items available for linking in DependenciesSection.tsx
- [x] T041 Show broken link warnings in DependenciesSection.tsx for deleted dependencies
- [x] T042 Prevent duplicate items when same accessory linked to multiple parents in useDependencyPrompt.ts
- [x] T043 Run npm run lint and fix any TypeScript/ESLint errors
- [x] T044 Run npm run build and verify no build errors
- [ ] T045 Manual testing: Execute all acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (types must exist for utils)
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (utils needed for validation)
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion, integrates with US1 data
- **User Story 3 (Phase 5)**: Depends on Phase 4 completion (modal must exist)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKING for all user stories
    ↓
Phase 3 (US1: Link Accessories) ← MVP
    ↓ (data exists)
Phase 4 (US2: Detection)
    ↓ (modal exists)
Phase 5 (US3: Add to Loadout)
    ↓
Phase 6 (Polish)
```

### Within Each User Story

- Component shell before implementation
- UI components before hook integration
- Hook logic before page integration
- Core implementation before polish

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# Can run T001, T002, T003 in parallel (different sections of same file)
Task: T001 "Add dependencyIds to GearItem"
Task: T002 "Add dependencyIds to GearItemFormData"
Task: T003 "Add to DEFAULT_GEAR_ITEM_FORM"
```

**Phase 3 (US1)**:
```bash
# T013 can start immediately after Phase 2
Task: T013 "Create DependenciesSection.tsx shell"
```

**Phase 4 (US2)**:
```bash
# T023 and T027 can run in parallel (different files)
Task: T023 "Create useDependencyPrompt.ts hook shell"
Task: T027 "Create DependencyPromptDialog.tsx shell"
```

**Phase 6 (Polish)**:
```bash
# T039 and T040 can run in parallel (different files)
Task: T039 "Handle transitive display in DependencyPromptDialog"
Task: T040 "Add empty state in DependenciesSection"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types and persistence)
2. Complete Phase 2: Foundational (utility functions)
3. Complete Phase 3: User Story 1 (Gear Editor integration)
4. **STOP and VALIDATE**: Test creating/viewing/removing dependency links
5. Deploy/demo if ready - users can start linking gear!

### Incremental Delivery

1. Complete Setup + Foundational → Data model ready
2. Add User Story 1 → Test independently → **MVP Ready!**
3. Add User Story 2 → Test detection → Deploy/Demo
4. Add User Story 3 → Test full flow → Deploy/Demo
5. Each story adds value without breaking previous stories

### Single Developer Strategy

Follow phases in order:
1. Phase 1 → Phase 2 → Phase 3 (MVP checkpoint)
2. Phase 4 → Phase 5 → Phase 6

Estimated: ~3-4 hours for MVP (Phase 1-3), ~2-3 hours for remaining phases

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Manual testing only (no automated tests per Technical Context)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `npm run lint` and `npm run build` before marking phases complete
