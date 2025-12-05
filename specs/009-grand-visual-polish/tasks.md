# Tasks: Grand Visual Polish Sprint

**Input**: Design documents from `/specs/009-grand-visual-polish/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Manual testing only (no test framework configured per plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Optimized for parallel execution.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions (Next.js App Router)

- **Pages**: `app/` directory
- **Components**: `components/` directory
- **Hooks**: `hooks/` directory
- **Types**: `types/` directory
- **Utilities**: `lib/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and configuration for new features

- [x] T001 [P] Add `ActivityPriorities` interface and `ActivityPriorityMatrix` type to `types/loadout.ts`
- [x] T002 [P] Add `ACTIVITY_PRIORITY_MATRIX` config object to `lib/loadout-utils.ts`
- [x] T003 [P] Add `computeAveragePriorities` helper function to `hooks/useLoadoutEditor.ts` (business logic must reside in hooks per Constitution Principle I)
- [x] T003a [P] Create `useLoadoutInlineEdit` hook in `hooks/useLoadoutInlineEdit.ts` with isEditing state, description value, and handlers (startEdit, cancelEdit, saveEdit)

**Checkpoint**: Types, config, and hooks ready for component implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: N/A - This feature has no blocking foundational tasks. All user stories can proceed independently after Phase 1 Setup.

**Checkpoint**: Setup complete - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Professional Typography (Priority: P1) 🎯 MVP

**Goal**: Remove Rock Salt font from all non-logo elements; ensure all H1/H2 use sans-serif

**Independent Test**: Navigate to Inventory, Loadouts, Settings - verify all H1/H2 headings use sans-serif; only "Gearshack" logo uses Rock Salt

### Implementation for User Story 1

- [x] T004 [US1] Remove Rock Salt font from loadout title H1 in `components/loadouts/LoadoutHeader.tsx` (line 129) - change to `text-3xl font-bold`
- [x] T005 [US1] Audit `app/inventory/page.tsx` - verify H1 heading uses sans-serif (no Rock Salt)
- [x] T006 [US1] Audit `app/loadouts/page.tsx` - verify H1 heading uses sans-serif (no Rock Salt)
- [x] T007 [US1] Audit `app/settings/page.tsx` - verify H1 heading uses sans-serif (no Rock Salt)
- [x] T008 [US1] Run grep to confirm Rock Salt only appears in `SiteHeader.tsx`, `MobileNav.tsx`, and `app/login/page.tsx`

**Checkpoint**: Typography is consistent - Rock Salt only in logo, sans-serif everywhere else

---

## Phase 4: User Story 2 - Redesigned Site Header (Priority: P1)

**Goal**: Apply nature-inspired pastel green header with proper spacing and dark mode support

**Independent Test**: Load any page, verify header has light pastel green background (emerald-50); toggle dark mode and verify emerald-900 background

### Implementation for User Story 2

- [x] T009 [US2] Update header background in `components/layout/SiteHeader.tsx` - change `bg-background/80` to `bg-emerald-50/90 dark:bg-emerald-900/90`
- [x] T010 [US2] Update `supports-[backdrop-filter]` class in `components/layout/SiteHeader.tsx` to use emerald colors
- [x] T011 [US2] Verify header maintains vertical centering of logo and nav in `components/layout/SiteHeader.tsx`
- [x] T012 [US2] Test header appearance on mobile viewport - verify logo visible and nav collapses correctly

**Checkpoint**: Header has distinct nature-inspired appearance on all pages

---

## Phase 5: User Story 3 - Loadout Editor Column Layout (Priority: P1)

**Goal**: Verify column layout is correct (inventory left, loadout right with sticky positioning) - research confirmed current implementation already matches spec

**Independent Test**: Open any loadout for editing on desktop, verify inventory picker on left, loadout items on right (sticky)

### Implementation for User Story 3

- [x] T013 [US3] VERIFY (no change expected): Confirm inventory picker is in LEFT column (first grid child) in `app/loadouts/[id]/page.tsx` - per research.md this is already correct
- [x] T014 [US3] VERIFY (no change expected): Confirm loadout items list is in RIGHT column (second grid child) in `app/loadouts/[id]/page.tsx` - per research.md this is already correct
- [x] T015 [US3] Adjust sticky positioning from `md:top-24` to `md:top-28` in `app/loadouts/[id]/page.tsx` for header buffer
- [x] T016 [US3] Verify mobile layout stacks correctly (inventory above or in bottom sheet) in `app/loadouts/[id]/page.tsx`

**Checkpoint**: Loadout editor has correct column order with sticky right panel

---

## Phase 6: User Story 4 - Loadout Header Inline Editing (Priority: P2)

**Goal**: Enable inline description editing without modal; position description in header whitespace

**Independent Test**: View a loadout, click description or Edit button, verify inline textarea appears (no modal)

### Implementation for User Story 4

- [x] T017 [US4] SKIP - Typography already fixed by T004 (US1); verify title uses sans-serif before proceeding with inline editing
- [x] T018 [US4] Add description display to header right-side in `components/loadouts/LoadoutHeader.tsx` (utilizing whitespace)
- [x] T019 [US4] Import and use `useLoadoutInlineEdit` hook in `components/loadouts/LoadoutHeader.tsx` (no local useState - Constitution Principle I)
- [x] T020 [US4] Implement expandable textarea UI in `components/loadouts/LoadoutHeader.tsx` using state from `useLoadoutInlineEdit` hook
- [x] T021 [US4] Wire save/cancel buttons to `useLoadoutInlineEdit` hook handlers in `components/loadouts/LoadoutHeader.tsx`
- [x] T022 [US4] Update `app/loadouts/[id]/page.tsx` to pass description update handler to LoadoutHeader
- [x] T023 [US4] Handle empty description edge case with placeholder text in `components/loadouts/LoadoutHeader.tsx`

**Checkpoint**: Users can edit loadout description inline without modal

---

## Phase 7: User Story 5 - Activity Matrix Visualization (Priority: P2)

**Goal**: Display 4-bar progress visualization for activity priorities

**Independent Test**: While editing a loadout, select different activities, verify progress bars show differentiated values

### Implementation for User Story 5

- [x] T024 [P] [US5] Create `ActivityMatrix` component in `components/loadouts/ActivityMatrix.tsx` with 4 progress bars
- [x] T025 [US5] Import and use shadcn Progress component in `components/loadouts/ActivityMatrix.tsx`
- [x] T026 [US5] Implement priority averaging logic when multiple activities selected in `components/loadouts/ActivityMatrix.tsx`
- [x] T027 [US5] Add CSS transitions for smooth value updates in `components/loadouts/ActivityMatrix.tsx`
- [x] T028 [US5] Integrate ActivityMatrix into `components/loadouts/LoadoutHeader.tsx` near activity badges
- [x] T029 [US5] Handle edge case: no activities selected (show neutral/default values) in `components/loadouts/ActivityMatrix.tsx`

**Checkpoint**: Activity Matrix displays and updates with activity selection

---

## Phase 8: User Story 6 - Full-Width Footer (Priority: P2)

**Goal**: Update footer to emerald-900 with reduced padding

**Independent Test**: Scroll to footer on any page, verify emerald-900 background spans full width, padding is reduced

### Implementation for User Story 6

- [x] T030 [P] [US6] Update footer background in `components/layout/SiteFooter.tsx` from `bg-zinc-900` to `bg-emerald-900`
- [x] T031 [P] [US6] Update footer text color in `components/layout/SiteFooter.tsx` from `text-zinc-300` to `text-emerald-100`
- [x] T032 [US6] Reduce footer vertical padding in `components/layout/SiteFooter.tsx` from `py-12` to `py-8`
- [x] T033 [US6] Update footer copyright bar border color in `components/layout/SiteFooter.tsx` from `border-zinc-800` to `border-emerald-800`
- [x] T034 [US6] Verify footer content respects max-w-7xl container constraint in `components/layout/SiteFooter.tsx`

**Checkpoint**: Footer has nature-themed appearance with proper sizing

---

## Phase 9: User Story 7 - Component Overlap Fixes (Priority: P2)

**Goal**: Fix Edit/Close button overlap in GearDetailModal; verify GearCard image display

**Independent Test**: Open gear detail modal, verify Edit icon is clearly separated from Close button

### Implementation for User Story 7

- [x] T035 [P] [US7] Move Edit icon to left of title in `components/loadouts/GearDetailModal.tsx` (before DialogTitle)
- [x] T036 [US7] Update DialogHeader layout in `components/loadouts/GearDetailModal.tsx` to `flex items-center gap-2`
- [x] T037 [US7] Verify close button is easily accessible in `components/loadouts/GearDetailModal.tsx`
- [x] T038 [P] [US7] Verify GearCard displays primaryImageUrl correctly in `components/inventory-gallery/GearCard.tsx`
- [x] T039 [US7] Add fallback for missing images in `components/inventory-gallery/GearCard.tsx` if not present

**Checkpoint**: Modal buttons are clearly separated; images display correctly

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cross-viewport testing

- [x] T040 Run `npm run lint` and fix any ESLint errors
- [x] T041 Run `npm run build` and fix any TypeScript errors
- [ ] T042 [P] Test all changes on mobile viewport (375px)
- [ ] T043 [P] Test all changes on tablet viewport (768px)
- [ ] T044 [P] Test all changes on desktop viewport (1024px+)
- [ ] T045 Test dark mode toggle - verify header/footer colors switch correctly
- [ ] T046 Run quickstart.md validation checklist manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A for this feature
- **User Stories (Phases 3-9)**: All depend on Setup (Phase 1) completion
  - User stories can proceed in parallel (if using multiple agents)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Depends On | Can Parallel With |
|-------|----------|------------|-------------------|
| US1 - Typography | P1 | Phase 1 only | US2, US3 |
| US2 - Header | P1 | Phase 1 only | US1, US3 |
| US3 - Layout | P1 | Phase 1 only | US1, US2 |
| US4 - Inline Editing | P2 | US1 (typography) | US5, US6, US7 |
| US5 - Activity Matrix | P2 | Phase 1 only | US4, US6, US7 |
| US6 - Footer | P2 | Phase 1 only | US4, US5, US7 |
| US7 - Overlaps | P2 | Phase 1 only | US4, US5, US6 |

### Within Each User Story

- Audit/verify tasks before modification tasks
- Component changes before page integration
- Core implementation before edge cases

---

## Parallel Execution Examples

### Maximum Parallelism (3 Agents - P1 Stories)

After Phase 1 (Setup) completes:

```text
Agent 1: US1 - Typography (T004-T008)
Agent 2: US2 - Header Redesign (T009-T012)
Agent 3: US3 - Column Layout (T013-T016)

Then after P1 stories complete:
Agent 1: US4 - Inline Editing (T017-T023)
Agent 2: US5 - Activity Matrix (T024-T029)
Agent 3: US6 - Footer (T030-T034) + US7 - Overlaps (T035-T039)
```

### Within Phase 1 (Setup) - Parallel Tasks

```text
Agent 1: T001 - types/loadout.ts
Agent 2: T002 - lib/loadout-utils.ts (ACTIVITY_PRIORITY_MATRIX)
Agent 3: T003 - lib/loadout-utils.ts (computeAveragePriorities) - depends on T002
```

### Within US6 (Footer) - Parallel Tasks

```text
Agent 1: T030 - Background color
Agent 2: T031 - Text color
```

### Within US7 (Overlaps) - Parallel Tasks

```text
Agent 1: T035 - GearDetailModal edit icon
Agent 2: T038 - GearCard image verification
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete US1: Typography (T004-T008)
3. Complete US2: Header (T009-T012)
4. Complete US3: Layout (T013-T016)
5. **STOP and VALIDATE**: Test typography, header, and layout
6. Deploy/demo MVP with visual polish

### Incremental Delivery

1. Setup → Types and config ready
2. Add US1 + US2 + US3 → Core visual polish (MVP!)
3. Add US4 → Inline editing enhancement
4. Add US5 → Activity matrix visualization
5. Add US6 → Footer theming
6. Add US7 → Component fixes
7. Polish phase → Final validation

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 47 |
| **Phase 1 (Setup)** | 4 tasks (includes T003a hook) |
| **Phase 2 (Foundational)** | 0 tasks |
| **US1 - Typography** | 5 tasks |
| **US2 - Header** | 4 tasks |
| **US3 - Layout** | 4 tasks (T013-T014 are verification only) |
| **US4 - Inline Editing** | 7 tasks (T017 is SKIP) |
| **US5 - Activity Matrix** | 6 tasks |
| **US6 - Footer** | 5 tasks |
| **US7 - Overlaps** | 5 tasks |
| **Phase 10 (Polish)** | 7 tasks |
| **Parallelizable Tasks** | 12 tasks marked [P] |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Manual testing required per quickstart.md checklist
