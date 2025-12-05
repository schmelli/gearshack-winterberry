# Tasks: Nature Vibe Polish

**Input**: Design documents from `/specs/004-nature-vibe-polish/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in spec - test tasks omitted.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create theme infrastructure

- [X] T001 Install next-themes package via `npm install next-themes`
- [X] T002 [P] Install shadcn switch component via `npx shadcn@latest add switch`
- [X] T003 [P] Create components/theme/ directory structure
- [X] T004 Create ThemeProvider component in components/theme/ThemeProvider.tsx
- [X] T005 [P] Create useThemePreference hook in hooks/useThemePreference.ts
- [X] T006 Wrap app with ThemeProvider in app/layout.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update global CSS variables that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Update --radius to 0.75rem in app/globals.css :root
- [X] T008 Update light mode primary color (forest green) in app/globals.css :root
- [X] T009 [P] Update light mode accent color (terracotta) in app/globals.css :root
- [X] T010 [P] Update light mode background color (stone) in app/globals.css :root
- [X] T011 [P] Update light mode border color (stone) in app/globals.css :root
- [X] T012 [P] Update light mode muted colors in app/globals.css :root
- [X] T013 Update dark mode primary color (lighter forest green) in app/globals.css .dark
- [X] T014 [P] Update dark mode accent color in app/globals.css .dark
- [X] T015 [P] Update dark mode background color (deep forest) in app/globals.css .dark
- [X] T016 [P] Update dark mode card and border colors in app/globals.css .dark
- [X] T017 [P] Update dark mode muted colors in app/globals.css .dark

**Checkpoint**: Foundation ready - all CSS variables updated, user story implementation can begin

---

## Phase 3: User Story 1 - Nature-Inspired Color Theme (Priority: P1) MVP

**Goal**: Users see earthy nature-inspired colors throughout the app instead of clinical black/white

**Independent Test**: Navigate to any page → backgrounds are stone-toned, navigation is forest green, buttons are terracotta

**Acceptance Criteria**:
- Stone/mist background visible on all pages
- Navigation links display in forest green
- Primary action buttons display in terracotta
- Cards have stone-colored borders

### Implementation for User Story 1

- [X] T018 [US1] Update Button primary variant to use accent color in components/ui/button.tsx
- [X] T019 [US1] Update navigation link colors to use primary in components/layout/SiteHeader.tsx
- [X] T020 [US1] Add hover underline effect to navigation links in components/layout/SiteHeader.tsx
- [X] T021 [US1] Update SiteFooter colors for theme consistency in components/layout/SiteFooter.tsx

**Checkpoint**: User Story 1 complete - nature color theme visible throughout app

---

## Phase 4: User Story 2 - Properly Aligned Header (Priority: P1)

**Goal**: Logo icon and brand text are perfectly vertically centered with backdrop blur effect

**Independent Test**: View header → logo and text aligned, scroll page → frosted glass blur effect visible

**Acceptance Criteria**:
- Logo and "Gearshack" text perfectly vertically centered
- Translucent header background with backdrop blur
- Content scrolls visibly behind header with blur

### Implementation for User Story 2

- [X] T022 [US2] Fix logo container alignment with explicit height in components/layout/SiteHeader.tsx
- [X] T023 [US2] Add leading-none to brand text for vertical alignment in components/layout/SiteHeader.tsx
- [X] T024 [US2] Update header background to translucent stone with blur in components/layout/SiteHeader.tsx
- [X] T025 [US2] Update logo background to use primary/10 tint in components/layout/SiteHeader.tsx

**Checkpoint**: User Stories 1 AND 2 complete - header polished and theme visible

---

## Phase 5: User Story 3 - Polished Gear Cards (Priority: P2)

**Goal**: Gear cards have theme-consistent borders, status badges, and placeholder icons

**Independent Test**: View inventory gallery → cards have stone borders, Active badge is green, Wishlist badge is terracotta, placeholders are muted forest green

**Acceptance Criteria**:
- Cards display subtle stone-colored borders
- Active status badge: forest green
- Wishlist status badge: terracotta
- Placeholder icons: muted forest green

### Implementation for User Story 3

- [X] T026 [US3] Add stone border class to Card component usage in components/inventory-gallery/GearCard.tsx
- [X] T027 [US3] Update STATUS_COLORS to use primary for active in components/inventory-gallery/StatusBadge.tsx
- [X] T028 [US3] Update STATUS_COLORS to use accent for wishlist in components/inventory-gallery/StatusBadge.tsx
- [X] T029 [US3] Update CategoryPlaceholder icon color to muted primary in components/inventory-gallery/CategoryPlaceholder.tsx

**Checkpoint**: User Stories 1, 2, AND 3 complete - cards fully themed

---

## Phase 6: User Story 4 - Friendlier Visual Style (Priority: P2)

**Goal**: All interactive elements have friendlier rounded corners (0.75rem)

**Independent Test**: View buttons, cards, inputs → all have noticeably more rounded corners

**Acceptance Criteria**:
- Buttons have 0.75rem radius
- Cards have consistent rounded corners
- Form inputs have matching radius

### Implementation for User Story 4

- [X] T030 [US4] Verify --radius update propagates to Button component (check components/ui/button.tsx)
- [X] T031 [US4] Verify Card component uses --radius variable (check components/ui/card.tsx)
- [X] T032 [US4] Verify Input component uses --radius variable (check components/ui/input.tsx)

**Checkpoint**: User Stories 1-4 complete - full visual polish applied

---

## Phase 7: User Story 5 - Dark Mode Toggle in Settings (Priority: P2)

**Goal**: Users can toggle dark mode from Settings page, preference persists

**Independent Test**: Navigate to Settings → toggle dark mode → app switches themes → close/reopen browser → preference remembered

**Acceptance Criteria**:
- Settings page accessible from user menu
- Appearance section with Light/Dark toggle
- Theme switches immediately on toggle
- Preference persists across sessions

### Implementation for User Story 5

- [X] T033 [US5] Create ThemeToggle component in components/theme/ThemeToggle.tsx
- [X] T034 [US5] Create Settings page with Appearance section in app/settings/page.tsx
- [X] T035 [US5] Verify Settings link works in user menu (confirmed: lib/constants/navigation.ts line 18 has `{ label: 'Settings', href: '/settings' }`)
- [X] T036 [US5] Test dark mode toggle switches theme immediately
- [X] T037 [US5] Test theme preference persists after browser refresh
- [X] T037b [US5] Verify dark mode colors match data-model.md CSS variables (deep forest background, lighter primary green, adjusted terracotta)

**Checkpoint**: All 5 user stories complete - full feature implemented

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [X] T038 [P] Verify WCAG AA contrast ratios in light mode using browser DevTools
- [X] T039 [P] Verify WCAG AA contrast ratios in dark mode using browser DevTools
- [X] T040 Test responsive layout on mobile viewport (< 768px)
- [X] T041 Run npm run lint and fix any errors
- [X] T042 Run npm run build and verify no TypeScript errors
- [ ] T043 Validate against quickstart.md test scenarios (13 scenarios)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
┌───────────────────────────────────────────────────────┐
│  Phase 3 (US1) → Phase 4 (US2) ← Both P1 priority    │
│                                                        │
│  Phase 5 (US3) can start after Phase 2                │
│  Phase 6 (US4) can start after Phase 2                │
│  Phase 7 (US5) depends on ThemeProvider from Phase 1  │
└───────────────────────────────────────────────────────┘
    ↓
Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Color Theme) | Phase 2 | CSS variables updated |
| US2 (Header) | Phase 2 | CSS variables updated |
| US3 (Cards) | US1 | Color theme established |
| US4 (Radius) | Phase 2 | --radius variable set |
| US5 (Dark Mode) | Phase 1 + Phase 2 | ThemeProvider + CSS variables |

### Parallel Opportunities by Phase

**Phase 1 (Setup)**:
```
T001, T002, T003 can run in parallel (different operations)
T004, T005 can run in parallel (different files)
```

**Phase 2 (Foundational)**:
```
T009-T012 can run in parallel (different CSS variables in :root)
T014-T017 can run in parallel (different CSS variables in .dark)
```

**Phase 3-4 (US1, US2)**:
```
US1 and US2 can run in parallel (different components)
```

**Phase 5-6 (US3, US4)**:
```
US3 and US4 can run in parallel (different concerns)
```

**Phase 8 (Polish)**:
```
T038, T039, T040 can run in parallel (different checks)
```

---

## Parallel Example: Setup Phase

```bash
# Install dependencies in parallel:
Task: "Install next-themes package"
Task: "Install shadcn switch component"
Task: "Create components/theme/ directory"

# Create components in parallel:
Task: "Create ThemeProvider component"
Task: "Create useThemePreference hook"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T017)
3. Complete Phase 3: User Story 1 (T018-T021)
4. Complete Phase 4: User Story 2 (T022-T025)
5. **STOP and VALIDATE**: Nature theme visible, header aligned
6. Deploy/demo if ready

### Recommended Incremental Delivery

| Increment | Stories | What's Deliverable |
|-----------|---------|-------------------|
| MVP | US1 + US2 | Nature color theme + polished header |
| v0.2 | + US3 | + Themed gear cards |
| v0.3 | + US4 | + Friendlier rounded corners |
| v1.0 | + US5 | + Dark mode with settings toggle |

### File Modification Order

```
1. npm install (T001, T002)
2. components/theme/ThemeProvider.tsx (T004)
3. hooks/useThemePreference.ts (T005)
4. app/layout.tsx (T006)
5. app/globals.css (T007-T017) - ALL CSS variable changes
6. components/layout/SiteHeader.tsx (T019-T025)
7. components/layout/SiteFooter.tsx (T021)
8. components/inventory-gallery/GearCard.tsx (T026)
9. components/inventory-gallery/StatusBadge.tsx (T027-T028)
10. components/inventory-gallery/CategoryPlaceholder.tsx (T029)
11. components/theme/ThemeToggle.tsx (T033)
12. app/settings/page.tsx (T034)
```

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after completion
- Constitution requires: stateless UI components, shadcn/ui, @/* imports
- Commit after each phase or logical group
- Stop at any checkpoint to validate independently
- US1 and US2 are both P1 priority - complete together for MVP

---

## Parallel Execution Guide (Agent-Ready)

### Batch 1: Initial Setup (3 parallel agents)
```
Agent A: T001 - npm install next-themes
Agent B: T002 - npx shadcn@latest add switch
Agent C: T003 - mkdir -p components/theme
```
**Wait for all to complete before Batch 2**

### Batch 2: Theme Infrastructure (2 parallel agents)
```
Agent A: T004 - Create ThemeProvider.tsx
Agent B: T005 - Create useThemePreference.ts hook
```
**Wait for both to complete**

### Batch 3: App Integration (Sequential)
```
T006 - Wrap app with ThemeProvider in layout.tsx
```
**Must complete before CSS changes**

### Batch 4: Light Mode CSS (5 parallel agents)
```
Agent A: T007 + T008 - Update --radius and primary color in :root
Agent B: T009 - Update accent color in :root
Agent C: T010 - Update background color in :root
Agent D: T011 - Update border color in :root
Agent E: T012 - Update muted colors in :root
```
**All modify app/globals.css but different sections - can be sequential in same file**

### Batch 5: Dark Mode CSS (4 parallel agents)
```
Agent A: T013 - Update dark primary color in .dark
Agent B: T014 - Update dark accent color in .dark
Agent C: T015 - Update dark background color in .dark
Agent D: T016 + T017 - Update dark card/border/muted colors in .dark
```
**All modify app/globals.css .dark section**

### Batch 6: User Stories 1 & 2 (2 parallel agents)
```
Agent A (US1): T018, T019, T020, T021 - Color theme components
  - button.tsx, SiteHeader.tsx, SiteFooter.tsx

Agent B (US2): T022, T023, T024, T025 - Header alignment
  - SiteHeader.tsx only
```
**Note: Both touch SiteHeader.tsx - coordinate or merge US2 into US1 agent**

### Batch 7: User Stories 3 & 4 (2 parallel agents)
```
Agent A (US3): T026, T027, T028, T029 - Card styling
  - GearCard.tsx, StatusBadge.tsx, CategoryPlaceholder.tsx

Agent B (US4): T030, T031, T032 - Radius verification
  - button.tsx, card.tsx, input.tsx (read-only verification)
```
**Fully independent - different files**

### Batch 8: User Story 5 (Sequential)
```
T033 - Create ThemeToggle.tsx
T034 - Create Settings page
T035 - Verify Settings link (read-only)
T036, T037, T037b - Manual testing
```
**Sequential due to component dependencies**

### Batch 9: Final Polish (3 parallel agents)
```
Agent A: T038 - WCAG light mode contrast check
Agent B: T039 - WCAG dark mode contrast check
Agent C: T040 - Mobile responsive testing
```
**Wait for all to complete**

### Batch 10: Build Verification (Sequential)
```
T041 - npm run lint
T042 - npm run build
T043 - Validate quickstart.md scenarios
```
**Must run sequentially - each depends on prior passing**

---

## Maximum Parallelism Summary

| Batch | Agents | Tasks | Blocking? |
|-------|--------|-------|-----------|
| 1 | 3 | T001, T002, T003 | Yes - setup required |
| 2 | 2 | T004, T005 | Yes - provider required |
| 3 | 1 | T006 | Yes - app integration |
| 4 | 5 | T007-T012 | Yes - CSS foundation |
| 5 | 4 | T013-T017 | No - can overlap with Batch 6 |
| 6 | 2 | T018-T025 | No - can overlap with Batch 5 |
| 7 | 2 | T026-T032 | No |
| 8 | 1 | T033-T037b | Yes - settings page |
| 9 | 3 | T038-T040 | No |
| 10 | 1 | T041-T043 | Yes - final gate |

**Total Tasks**: 44 (including T037b)
**Maximum Concurrent Agents**: 5 (Batch 4)
**Minimum Sequential Batches**: 10
