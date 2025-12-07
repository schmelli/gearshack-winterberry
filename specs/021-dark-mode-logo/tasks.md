# Tasks: Dark Mode & Logo Rescue Sprint

**Input**: Design documents from `/specs/021-dark-mode-logo/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), quickstart.md (complete)

**Tests**: Not requested - visual verification and build validation only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (Next.js)**: `components/`, `app/`, `hooks/` at repository root
- All paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: No setup needed - all changes modify existing files

**Status**: SKIP - This feature modifies existing files only, no project initialization required.

---

## Phase 2: Foundational

**Purpose**: No foundational work needed - CSS-only changes

**Status**: SKIP - This feature has no blocking prerequisites. All user stories can proceed immediately.

---

## Phase 3: User Story 1 - View Site Logo Correctly (Priority: P1)

**Goal**: Fix logo visibility by removing CSS filters so the original branded logo image displays correctly

**Independent Test**: Navigate to any page and verify the logo displays with its original PNG colors (no white/inverted appearance)

### Implementation for User Story 1

- [x] T001 [US1] Remove `brightness-0 invert` CSS filter classes from logo Image in `components/layout/SiteHeader.tsx`

**Checkpoint**: Logo should display with original colors in both light and dark modes

---

## Phase 4: User Story 2 - View Gear Cards with Enhanced Dark Mode Depth (Priority: P1)

**Goal**: Add gradient backgrounds and subtle borders to gear cards in dark mode for visual depth

**Independent Test**: Toggle to dark mode, navigate to inventory gallery, verify gradient backgrounds and stone-700 borders

### Implementation for User Story 2

- [x] T002 [P] [US2] Add dark mode gradient to compact view image container in `components/inventory-gallery/GearCard.tsx` (line ~81)
- [x] T003 [P] [US2] Add dark mode gradient to standard/detailed view image container in `components/inventory-gallery/GearCard.tsx` (line ~157)
- [x] T004 [P] [US2] Add dark mode border `dark:border-stone-700` to compact card in `components/inventory-gallery/GearCard.tsx` (line ~75)
- [x] T005 [P] [US2] Add dark mode border `dark:border-stone-700` to standard/detailed card in `components/inventory-gallery/GearCard.tsx` (line ~149)

**Checkpoint**: Gear cards should have gradient backgrounds and subtle borders in dark mode, white background in light mode

---

## Phase 5: User Story 3 - View Improved Dark Mode Background (Priority: P2)

**Goal**: Update global dark mode background to deep forest/stone color matching brand identity

**Independent Test**: Toggle to dark mode and verify page background uses deep forest color instead of the current dark color

### Implementation for User Story 3

- [x] T006 [US3] Update `--background` CSS variable in `.dark` section to `oklch(0.10 0.02 155)` in `app/globals.css` (line ~109)

**Checkpoint**: Dark mode background should be a deep forest/stone color that matches the footer scheme

---

## Phase 6: User Story 4 - Upload Fix Verification (Priority: P3)

**Goal**: Verify the upload-update-redirect pattern is correctly implemented

**Independent Test**: Code review of useGearEditor.ts to confirm async pattern

### Verification for User Story 4

- [x] T007 [US4] Verify onSubmit function follows `await upload → update store → redirect` pattern in `hooks/useGearEditor.ts`

**Checkpoint**: Code review confirms correct implementation pattern (no code changes expected)

---

## Phase 7: Polish & Validation

**Purpose**: Final validation to ensure all changes pass quality gates

- [x] T008 Run `npm run lint` to verify no linting errors
- [x] T009 Run `npm run build` to verify successful production build
- [ ] T010 Run quickstart.md manual testing checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: SKIPPED - not needed
- **Foundational (Phase 2)**: SKIPPED - not needed
- **User Story 1 (Phase 3)**: Can start immediately - no dependencies
- **User Story 2 (Phase 4)**: Can start immediately - no dependencies on US1
- **User Story 3 (Phase 5)**: Can start immediately - no dependencies on US1/US2
- **User Story 4 (Phase 6)**: Can start immediately - verification only
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - modifies only SiteHeader.tsx
- **User Story 2 (P1)**: Independent - modifies only GearCard.tsx
- **User Story 3 (P2)**: Independent - modifies only globals.css
- **User Story 4 (P3)**: Independent - verification only, no changes

### Parallel Opportunities

All four user stories modify different files and have no dependencies on each other:

```
US1 (SiteHeader.tsx)  ─┐
US2 (GearCard.tsx)    ─┼─> All can run in parallel
US3 (globals.css)     ─┤
US4 (useGearEditor.ts)─┘
```

Within User Story 2, tasks T002-T005 are all marked [P] and can run in parallel (same file but different, non-overlapping locations).

---

## Parallel Example: All User Stories

```bash
# Launch all user stories in parallel:
Task: "T001 [US1] Remove brightness-0 invert from SiteHeader.tsx"
Task: "T002-T005 [US2] Add gradients and borders to GearCard.tsx"
Task: "T006 [US3] Update dark background in globals.css"
Task: "T007 [US4] Verify upload pattern in useGearEditor.ts"
```

---

## Implementation Strategy

### MVP First (All Stories - This is a Small Feature)

This feature is small enough that all user stories should be completed together:

1. Complete Phase 3: User Story 1 (logo fix)
2. Complete Phase 4: User Story 2 (gradient cards)
3. Complete Phase 5: User Story 3 (dark background)
4. Complete Phase 6: User Story 4 (verification)
5. Complete Phase 7: Validation
6. **STOP and VALIDATE**: Run lint, build, and manual testing

### Recommended Execution Order

Since all stories are independent, optimal execution is:
1. Run T001-T007 in parallel (or sequentially if single developer)
2. Run T008-T010 sequentially (validation must wait for all changes)

---

## Notes

- All tasks modify existing files - no new files created
- All user stories are independent and can be implemented in any order
- T002-T005 are marked [P] as they modify different parts of the same file
- T007 is verification only - if pattern is incorrect, log findings but feature scope says no refactoring needed
- Total: 10 tasks (7 implementation/verification + 3 validation)
