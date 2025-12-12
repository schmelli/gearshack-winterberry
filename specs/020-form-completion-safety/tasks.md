# Tasks: Form Completion & Safety Sprint

**Input**: Design documents from `/specs/020-form-completion-safety/`
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Manual testing only (visual verification + CRUD operations)

**Organization**: Tasks grouped by layer for clean dependency management.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Type System (Priority: P1)

**Goal**: Add description field to type definitions

**Independent Test**: TypeScript compilation with new types

### Implementation for Types

- [X] T001 [US1] Add `description: string | null` to GearItem interface in types/gear.ts
- [X] T002 [US1] Add `description: string` to GearItemFormData interface in types/gear.ts
- [X] T003 [US1] Add `description: ''` to DEFAULT_GEAR_ITEM_FORM in types/gear.ts

**Checkpoint**: Types compile without errors

---

## Phase 2: Validation Schema (Priority: P1)

**Goal**: Add description to Zod schema

**Independent Test**: Form validation accepts description field

### Implementation for Schema

- [X] T004 [US1] Add `description: z.string().optional()` to gearItemFormSchema in lib/validations/gear-schema.ts

**Checkpoint**: Schema validates description field

---

## Phase 3: Conversion & Adapter (Priority: P1)

**Goal**: Handle description in data flow

**Independent Test**: Description persists through save/load cycle

### Implementation for Data Flow

- [ ] T005 [P] [US1] Add description to gearItemToFormData in lib/gear-utils.ts
- [ ] T006 [P] [US1] Add description to formDataToGearItem in lib/gear-utils.ts
- [ ] T007 [P] [US1] Add description to adaptGearItem in lib/firebase/adapter.ts
- [ ] T008 [P] [US1] Add description to prepareGearItemForFirestore in lib/firebase/adapter.ts

**Checkpoint**: Description flows through entire data pipeline

---

## Phase 4: Description UI (Priority: P1)

**Goal**: Add Textarea for description in form

**Independent Test**: Description field visible in General Info section

### Implementation for Description Field

- [ ] T009 [US1] Add Textarea import and description FormField between brand and brandUrl in components/gear-editor/sections/GeneralInfoSection.tsx

**Checkpoint**: Description Textarea appears in form

---

## Phase 5: Delete Logic (Priority: P1)

**Goal**: Add delete functionality to hook

**Independent Test**: Delete function available from hook

### Implementation for Delete Hook

- [ ] T010 [US2] Add isDeleting state and handleDelete function to useGearEditor in hooks/useGearEditor.ts
- [ ] T011 [US2] Update UseGearEditorReturn type to include handleDelete and isDeleting

**Checkpoint**: Hook provides delete functionality

---

## Phase 6: Delete UI (Priority: P1)

**Goal**: Add delete button with AlertDialog confirmation

**Independent Test**: Delete button with confirmation dialog in edit mode

### Implementation for Delete UI

- [ ] T012 [US2] Add AlertDialog and Trash2 imports to components/gear-editor/GearEditorForm.tsx
- [ ] T013 [US2] Update useGearEditor destructuring to include handleDelete and isDeleting
- [ ] T014 [US2] Add delete button with AlertDialog in CardFooter (only when isEditing)

**Checkpoint**: Delete confirmation flow works

---

## Phase 7: Validation

**Purpose**: Final validation and lint/build check

- [ ] T015 Run npm run lint and fix any errors
- [ ] T016 Run npm run build and fix any errors
- [ ] T017 Manual testing: Verify all acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Types)**: No dependencies - must complete first
- **Phase 2 (Schema)**: Depends on Phase 1 for types
- **Phase 3 (Data Flow)**: Depends on Phase 1 for types
- **Phase 4 (Description UI)**: Depends on Phases 1-3 for data support
- **Phase 5 (Delete Hook)**: Depends on Phase 1 for types
- **Phase 6 (Delete UI)**: Depends on Phase 5 for hook
- **Phase 7 (Validation)**: Depends on Phases 1-6 complete

### Parallel Opportunities

**T005, T006, T007, T008 can run in parallel** (different functions/files)
**T009 is sequential** (single file, depends on types)
**T010, T011 are sequential** (same file, related changes)
**T012, T013, T014 are sequential** (same file)

---

## Summary

| Phase | Description | Tasks | Sequential |
|-------|-------------|-------|------------|
| 1 | Type System | T001-T003 | Sequential |
| 2 | Validation Schema | T004 | Single task |
| 3 | Data Flow | T005-T008 | Parallel |
| 4 | Description UI | T009 | Single task |
| 5 | Delete Hook | T010-T011 | Sequential |
| 6 | Delete UI | T012-T014 | Sequential |
| 7 | Validation | T015-T017 | Sequential |

**Total Tasks**: 17
**MVP Scope**: T001-T014 (all features = 14 tasks)
