# Tasks: Final Header Polish Sprint

**Input**: Design documents from `/specs/016-header-polish-sprint/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: Manual testing only (visual verification)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - Logo Visibility (Priority: P1)

**Goal**: Make logo visible on dark green header using CSS filter

**Independent Test**: Navigate to any page and verify white logo visible on green header

### Implementation for User Story 1

- [X] T001 [P] [US1] Add brightness-0 invert classes to logo Image in components/layout/SiteHeader.tsx

**Checkpoint**: Logo is white/visible against green header

---

## Phase 2: User Story 2 - Avatar Fallback Visibility (Priority: P1)

**Goal**: Make avatar initials visible on dark green header

**Independent Test**: Log in without profile photo and verify initials visible

### Implementation for User Story 2

- [X] T002 [P] [US2] Update AvatarFallback colors to bg-white/20 text-white in components/profile/AvatarWithFallback.tsx

**Checkpoint**: Avatar initials visible in header

---

## Phase 3: User Story 3 - Loadouts Page Cleanup (Priority: P2)

**Goal**: Remove redundant H1 title and description paragraph

**Independent Test**: Navigate to /loadouts and verify toolbar is first content element

### Implementation for User Story 3

- [X] T003 [US3] Remove H1 and paragraph from page header in app/loadouts/page.tsx
- [X] T004 [US3] Simplify header div to justify-end in app/loadouts/page.tsx

**Checkpoint**: Loadouts page starts with toolbar

---

## Phase 4: Validation

**Purpose**: Final validation and lint/build check

- [X] T005 Run npm run lint and fix any errors
- [X] T006 Run npm run build and fix any errors
- [ ] T007 Manual testing: Verify all user story acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies - can start immediately
- **Phase 2 (US2)**: No dependencies - can start immediately
- **Phase 3 (US3)**: No dependencies - can start immediately
- **Phase 4 (Validation)**: Depends on Phases 1-3 complete

### Parallel Opportunities

**T001 and T002 can run in parallel** (different files):
- T001: SiteHeader.tsx
- T002: AvatarWithFallback.tsx

**T003 and T004 are sequential** (same file)

---

## Summary

| Phase | User Story | Tasks | Parallel? |
|-------|------------|-------|-----------|
| 1 | US1 Logo | T001 | Can run with T002 |
| 2 | US2 Avatar | T002 | Can run with T001 |
| 3 | US3 Loadouts | T003-T004 | Sequential (same file) |
| 4 | Validation | T005-T007 | Sequential |

**Total Tasks**: 7
**MVP Scope**: T001-T002 (P1 visual fixes = 2 tasks)
