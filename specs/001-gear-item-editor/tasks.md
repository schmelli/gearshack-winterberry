# Tasks: Gear Item Editor

**Input**: Design documents from `/specs/001-gear-item-editor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec - test tasks omitted.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, and validation schemas

- [x] T001 Create types directory structure at types/
- [x] T002 [P] Create GearItem types and enums in types/gear.ts
- [x] T003 [P] Create taxonomy types (GearCategory, GearSubcategory, ProductType) in types/taxonomy.ts
- [x] T004 [P] Create Zod validation schemas in lib/validations/gear-schema.ts (copy from contracts/gear-item.schema.ts)
- [x] T005 [P] Create taxonomy validation schemas in lib/validations/taxonomy-schema.ts (copy from contracts/taxonomy.schema.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Convert GearGraph ontology TTL to JSON at lib/taxonomy/taxonomy-data.json
- [x] T007 Create taxonomy utility functions in lib/taxonomy/taxonomy-utils.ts
- [x] T008 [P] Create weight conversion utilities in lib/gear-utils.ts
- [x] T009 [P] Create form-to-entity conversion functions in lib/gear-utils.ts
- [x] T010 Install required shadcn/ui components (Tabs, Form, Input, Select, Card, Button, Textarea)
- [x] T011 Create components/gear-editor/ directory structure

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Add New Gear Item (Priority: P1) MVP

**Goal**: Users can create new gear items with name, weight, and basic fields

**Independent Test**: Open gear editor → fill name and weight → save → item appears in list

**Acceptance Criteria**:
- Form displays with organized field groups
- Name is required, weight must be positive (or zero)
- Validation errors display adjacent to fields
- Successful save returns to inventory

### Implementation for User Story 1

- [x] T012 [US1] Create useGearEditor hook with form initialization in hooks/useGearEditor.ts
- [x] T013 [US1] Add Zod resolver integration to useGearEditor in hooks/useGearEditor.ts
- [x] T014 [US1] Add form submission handler to useGearEditor in hooks/useGearEditor.ts
- [x] T015 [P] [US1] Create GeneralInfoSection component in components/gear-editor/sections/GeneralInfoSection.tsx
- [x] T016 [P] [US1] Create WeightSpecsSection component in components/gear-editor/sections/WeightSpecsSection.tsx
- [x] T017 [P] [US1] Create PurchaseSection component in components/gear-editor/sections/PurchaseSection.tsx
- [x] T018 [P] [US1] Create StatusSection component in components/gear-editor/sections/StatusSection.tsx
- [x] T019 [US1] Create GearEditorForm container with basic layout in components/gear-editor/GearEditorForm.tsx
- [x] T020 [US1] Create new gear page at app/inventory/new/page.tsx
- [x] T021 [US1] Add validation error display to all form fields in GearEditorForm.tsx

**Checkpoint**: User Story 1 complete - users can add new gear items with basic fields

---

## Phase 4: User Story 2 - Edit Existing Gear Item (Priority: P1)

**Goal**: Users can edit all fields of existing gear items with pre-filled values

**Independent Test**: Select existing item → open editor → see pre-filled values → modify → save → changes persist

**Acceptance Criteria**:
- All current values pre-filled in form
- Changes persist after save
- Cancel discards changes

### Implementation for User Story 2

- [x] T022 [US2] Add initialData support to useGearEditor in hooks/useGearEditor.ts
- [x] T023 [US2] Add gearItemToFormData conversion call in useGearEditor in hooks/useGearEditor.ts
- [x] T024 [US2] Create edit gear page at app/inventory/[id]/edit/page.tsx
- [x] T025 [US2] Add cancel handler with discard logic to useGearEditor in hooks/useGearEditor.ts
- [x] T026 [US2] Add isDirty tracking to useGearEditor in hooks/useGearEditor.ts
- [x] T027 [US2] Add unsaved changes warning (beforeunload) to useGearEditor in hooks/useGearEditor.ts

**Checkpoint**: User Stories 1 AND 2 complete - full CRUD for gear items

---

## Phase 5: User Story 3 - Navigate Complex Form (Priority: P2)

**Goal**: Form fields organized into tabs, data persists across tab navigation

**Independent Test**: Open editor → enter data in multiple tabs → switch tabs → data persists

**Acceptance Criteria**:
- Fields organized into 6 distinct sections/tabs
- Tab navigation preserves entered data
- Fewer than 10 fields visible at once

### Implementation for User Story 3

- [x] T028 [US3] Add Tabs container to GearEditorForm in components/gear-editor/GearEditorForm.tsx
- [x] T029 [US3] Create TabsList with 6 tabs (General, Classification, Weight, Purchase, Media, Status) in GearEditorForm.tsx
- [x] T030 [US3] Wrap each section in TabsContent in components/gear-editor/GearEditorForm.tsx
- [x] T031 [US3] Add responsive tab styling for mobile in components/gear-editor/GearEditorForm.tsx

**Checkpoint**: User Stories 1, 2, AND 3 complete - organized multi-tab form

---

## Phase 6: User Story 4 - Classify Gear with Taxonomy (Priority: P2)

**Goal**: Hierarchical Category → Subcategory → Product Type selection with cascading

**Independent Test**: Select category → subcategories filter → select subcategory → product types filter → change category → dependent selections clear

**Acceptance Criteria**:
- Subcategories filter based on selected Category
- Product Types filter based on selected Subcategory
- Changing parent clears children selections

### Implementation for User Story 4

- [x] T032 [US4] Create TaxonomySelect component in components/gear-editor/TaxonomySelect.tsx
- [x] T033 [US4] Add category dropdown with options from taxonomy-data.json in TaxonomySelect.tsx
- [x] T034 [US4] Add subcategory dropdown with filtered options in TaxonomySelect.tsx
- [x] T035 [US4] Add productType dropdown with filtered options in TaxonomySelect.tsx
- [x] T036 [US4] Implement cascading clear logic when parent changes in TaxonomySelect.tsx
- [x] T037 [P] [US4] Create ClassificationSection component in components/gear-editor/sections/ClassificationSection.tsx
- [x] T038 [US4] Integrate ClassificationSection into GearEditorForm tabs in GearEditorForm.tsx

**Checkpoint**: User Stories 1-4 complete - full taxonomy classification working

---

## Phase 7: User Story 5 - Manage Gear Media (Priority: P3)

**Goal**: Add primary image URL and gallery URLs with previews

**Independent Test**: Add image URL → preview displays → add gallery URLs → all display → invalid URL shows feedback

**Acceptance Criteria**:
- Primary image URL with preview
- Gallery image URLs (multiple) with previews
- Invalid URLs show appropriate feedback

### Implementation for User Story 5

- [x] T039 [P] [US5] Create ImagePreview component in components/gear-editor/ImagePreview.tsx
- [x] T040 [US5] Create MediaSection component in components/gear-editor/sections/MediaSection.tsx
- [x] T041 [US5] Add primary image URL input with preview in MediaSection.tsx
- [x] T042 [US5] Add gallery image URLs array input in MediaSection.tsx
- [x] T043 [US5] Add image load error handling with placeholder in ImagePreview.tsx
- [x] T044 [US5] Integrate MediaSection into GearEditorForm tabs in GearEditorForm.tsx

**Checkpoint**: All 5 user stories complete - full feature implemented

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [x] T045 [P] Create placeholder inventory list page at app/inventory/page.tsx
- [x] T046 [P] Add loading states to GearEditorForm in components/gear-editor/GearEditorForm.tsx
- [x] T047 [P] Add form submission loading indicator in GearEditorForm.tsx
- [x] T048 Review all components for accessibility (labels, aria attributes)
- [x] T049 Run npm run lint and fix any errors
- [x] T050 Run npm run build and verify no TypeScript errors
- [x] T051 Validate against quickstart.md scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
┌───────────────────────────────────────────────┐
│  Phase 3 (US1) → Phase 4 (US2)                │
│       ↓              ↓                         │
│  Phase 5 (US3)  Phase 6 (US4)  Phase 7 (US5) │
└───────────────────────────────────────────────┘
    ↓
Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Add) | Phase 2 | Foundational complete |
| US2 (Edit) | US1 | US1 complete (reuses form) |
| US3 (Tabs) | US1 | US1 complete (wraps sections) |
| US4 (Taxonomy) | Phase 2 | Foundational complete (uses taxonomy-data.json) |
| US5 (Media) | US1 | US1 complete (adds section) |

### Parallel Opportunities by Phase

**Phase 1 (Setup)**:
```
T002, T003, T004, T005 can run in parallel (different files)
```

**Phase 2 (Foundational)**:
```
T008, T009 can run in parallel (same file but independent functions)
```

**Phase 3 (US1)**:
```
T015, T016, T017, T018 can run in parallel (different section components)
```

**Phase 6 (US4)**:
```
T037 can run in parallel with T032-T036 (different file)
```

**Phase 7 (US5)**:
```
T039 can run in parallel with other US5 tasks (different file)
```

**Phase 8 (Polish)**:
```
T045, T046, T047 can run in parallel (different concerns)
```

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# Launch all section components in parallel:
Task: "Create GeneralInfoSection in components/gear-editor/sections/GeneralInfoSection.tsx"
Task: "Create WeightSpecsSection in components/gear-editor/sections/WeightSpecsSection.tsx"
Task: "Create PurchaseSection in components/gear-editor/sections/PurchaseSection.tsx"
Task: "Create StatusSection in components/gear-editor/sections/StatusSection.tsx"

# Then sequentially:
Task: "Create GearEditorForm container in components/gear-editor/GearEditorForm.tsx"
Task: "Create new gear page at app/inventory/new/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T011)
3. Complete Phase 3: User Story 1 (T012-T021)
4. **STOP and VALIDATE**: Can add new gear items with validation
5. Deploy/demo if ready

### Recommended Incremental Delivery

| Increment | Stories | What's Deliverable |
|-----------|---------|-------------------|
| MVP | US1 | Add new gear items |
| v0.2 | US1 + US2 | Full CRUD |
| v0.3 | US1-3 | Tabbed form UI |
| v0.4 | US1-4 | Taxonomy classification |
| v1.0 | US1-5 | Complete feature with media |

### File Creation Order

```
1. types/gear.ts
2. types/taxonomy.ts
3. lib/validations/gear-schema.ts
4. lib/validations/taxonomy-schema.ts
5. lib/taxonomy/taxonomy-data.json
6. lib/taxonomy/taxonomy-utils.ts
7. lib/gear-utils.ts
8. hooks/useGearEditor.ts
9. components/gear-editor/sections/*.tsx (parallel)
10. components/gear-editor/GearEditorForm.tsx
11. components/gear-editor/TaxonomySelect.tsx
12. components/gear-editor/ImagePreview.tsx
13. app/inventory/new/page.tsx
14. app/inventory/[id]/edit/page.tsx
15. app/inventory/page.tsx
```

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after completion
- Constitution requires: stateless UI components, logic in hooks, @/* imports
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- No backend persistence in scope - local state only for MVP
