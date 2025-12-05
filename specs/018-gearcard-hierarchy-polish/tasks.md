# Tasks: GearCard Hierarchy & Polish Sprint

**Input**: Design documents from `/specs/018-gearcard-hierarchy-polish/`
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Manual testing only (visual verification)

**Organization**: Tasks grouped by view mode for clear implementation order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different sections, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Visual Polish Foundation (Priority: P2 - but done first for base)

**Goal**: Add shadows and borders to establish visual polish base

**Independent Test**: View any card and verify shadow/border styling

### Implementation for Visual Polish

- [X] T001 [US4] Update Card className to include shadow-sm and border-stone-200 in components/inventory-gallery/GearCard.tsx

**Checkpoint**: Cards have subtle shadow and stone border

---

## Phase 2: Compact View Redesign (Priority: P1)

**Goal**: Transform compact view to horizontal layout

**Independent Test**: Switch to compact view and verify horizontal layout

### Implementation for Compact View

- [X] T002 [US1] Update DENSITY_CONFIG compact settings for horizontal layout in components/inventory-gallery/GearCard.tsx
- [X] T003 [US1] Implement horizontal card structure for compact view with image left, text right in components/inventory-gallery/GearCard.tsx
- [X] T004 [US1] Update compact image styling to white background, h-24 w-24, object-contain in components/inventory-gallery/GearCard.tsx

**Checkpoint**: Compact cards display horizontally with ~2:1 aspect ratio

---

## Phase 3: Standard/Detailed View Swap (Priority: P1/P2)

**Goal**: Swap standard and detailed layouts for correct hierarchy

**Independent Test**: Toggle between standard and detailed views and verify correct layouts

### Implementation for View Swap

- [X] T005 [US2] Update DENSITY_CONFIG standard to use large square image (aspect-square) in components/inventory-gallery/GearCard.tsx
- [X] T006 [US3] Update DENSITY_CONFIG detailed to use extra-large image (aspect-[4/3]) and show description in components/inventory-gallery/GearCard.tsx
- [X] T007 [US2/US3] Ensure standard shows Brand/Name/Category/Weight/Status and detailed adds description in components/inventory-gallery/GearCard.tsx

**Checkpoint**: Standard has square image, detailed has 4:3 image + description

---

## Phase 4: Validation

**Purpose**: Final validation and lint/build check

- [X] T008 Run npm run lint and fix any errors
- [X] T009 Run npm run build and fix any errors
- [ ] T010 Manual testing: Verify all user story acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Polish)**: No dependencies - establishes base styling
- **Phase 2 (Compact)**: Depends on Phase 1 for base styles
- **Phase 3 (Swap)**: Depends on Phase 1 for base styles
- **Phase 4 (Validation)**: Depends on Phases 1-3 complete

### Parallel Opportunities

**T002, T003, T004 are sequential** (same section of file)
**T005, T006, T007 are sequential** (same section of file)

---

## Summary

| Phase | Description | Tasks | Sequential |
|-------|-------------|-------|------------|
| 1 | Visual Polish | T001 | Single task |
| 2 | Compact View | T002-T004 | Sequential |
| 3 | View Swap | T005-T007 | Sequential |
| 4 | Validation | T008-T010 | Sequential |

**Total Tasks**: 10
**MVP Scope**: T001-T007 (all view modes = 7 tasks)
