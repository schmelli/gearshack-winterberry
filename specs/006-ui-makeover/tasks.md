# Tasks: UI/UX Makeover

**Input**: Design documents from `/specs/006-ui-makeover/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md
**Branch**: `006-ui-makeover`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and add shadcn/ui components

- [x] T001 Install sonner for toast notifications: `npm install sonner`
- [x] T002 [P] Add Toggle component from shadcn/ui: `npx shadcn@latest add toggle`
- [x] T003 [P] Add Badge component from shadcn/ui: `npx shadcn@latest add badge`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type extensions and core hooks that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Extend Loadout type with ActivityType and Season in `types/loadout.ts` (add types, labels, extend interface)
- [x] T005 [P] Add updateLoadoutMetadata action to store in `hooks/useStore.ts`
- [x] T006 [P] Add DEFAULT_WEIGHT_GOAL_GRAMS constant to `lib/loadout-utils.ts`
- [x] T007 Add Toaster provider to `app/layout.tsx`

**Checkpoint**: Foundation ready - type extensions, store action, and toast provider in place

---

## Phase 3: User Story 1 - Improved Loadout Editor Layout (Priority: P1)

**Goal**: Reverse layout so picker is on left (source) and loadout is on right (destination) with sticky positioning

**Independent Test**: Open a loadout in the editor, verify inventory picker is on the left, loadout list is on the right with sticky behavior, and the layout feels natural for adding items.

### Implementation for User Story 1

- [x] T008 [US1] Reverse grid columns in `app/loadouts/[id]/page.tsx` - change from `grid-cols-[3fr_2fr]` to `grid-cols-[2fr_3fr]` (FR-002, FR-003)
- [x] T009 [US1] Add sticky positioning to loadout list container in `app/loadouts/[id]/page.tsx` - add `sticky top-24` (FR-003)
- [x] T010 [US1] Add max-width container with horizontal padding to editor content in `app/loadouts/[id]/page.tsx` (FR-001)
- [x] T011 [US1] Add mobile layout detection and "Add Items" button in `app/loadouts/[id]/page.tsx` (FR-004, FR-005)
- [x] T012 [US1] Create mobile item picker sheet using Sheet component in `app/loadouts/[id]/page.tsx` (FR-005)

**Checkpoint**: User Story 1 complete - layout reversed, sticky works, mobile sheet functional

---

## Phase 4: User Story 2 - Enhanced Header and Metadata Display (Priority: P1)

**Goal**: Polished header with Rock Salt title, interactive activity/season badges, and weight progress bar

**Independent Test**: Create a loadout, verify the header displays with styled title, interactive badges, and weight progress bar.

### Implementation for User Story 2

- [x] T013 [P] [US2] Create `hooks/useLoadoutMetadata.ts` - hook for managing badge toggle state
- [x] T014 [P] [US2] Create `components/ui/toggle-badge.tsx` - reusable ToggleBadge component
- [x] T015 [US2] Create `components/loadouts/LoadoutHeader.tsx` - Rock Salt title, trip date, badges container (FR-006)
- [x] T016 [US2] Add activity badge toggles to LoadoutHeader (FR-007, FR-010)
- [x] T017 [US2] Add season badge toggles to LoadoutHeader (FR-008, FR-010)
- [x] T018 [US2] Create weight progress bar component in LoadoutHeader (FR-009)
- [x] T019 [US2] Integrate LoadoutHeader into `app/loadouts/[id]/page.tsx` replacing current header section
- [x] T020 [US2] Wire up metadata persistence via updateLoadoutMetadata action (FR-010)

**Checkpoint**: User Story 2 complete - styled header, toggleable badges, weight progress bar all functional

---

## Phase 5: User Story 3 - Interactive Donut Chart (Priority: P2)

**Goal**: Donut chart with hover tooltips, click filtering, and center weight display

**Independent Test**: Add items from multiple categories, hover over chart segments to see tooltips, click segments to filter the loadout list.

### Implementation for User Story 3

- [x] T021 [P] [US3] Create `hooks/useChartFilter.ts` - hook for chart segment filter state (selectedCategoryId, toggleCategory, clearFilter)
- [x] T022 [US3] Add onClick handler to Cell components in `components/loadouts/WeightDonut.tsx` (FR-012)
- [x] T023 [US3] Add center label showing total weight to `components/loadouts/WeightDonut.tsx` using recharts Label component (FR-013)
- [x] T024 [US3] Add selected segment visual highlight in `components/loadouts/WeightDonut.tsx`
- [x] T025 [US3] Add filterCategoryId prop to `components/loadouts/LoadoutList.tsx` and implement filtering logic (FR-012)
- [x] T026 [US3] Integrate useChartFilter hook into `app/loadouts/[id]/page.tsx` and wire up chart-to-list filtering
- [x] T027 [US3] Verify tooltips work correctly and theme colors (chart-1 through chart-5 CSS variables) are used - no random colors (FR-011, FR-014)

**Checkpoint**: User Story 3 complete - chart hover shows tooltips, click filters list, center displays total weight

---

## Phase 6: User Story 4 - Gear Card Image and Detail View (Priority: P2)

**Goal**: Gear cards show images with fallback, clicking card body opens detail modal

**Independent Test**: View gear cards in the picker, verify image display with fallback, click card body to open detail modal.

### Implementation for User Story 4

- [x] T028 [P] [US4] Create `components/loadouts/GearDetailModal.tsx` - Dialog with large image, name, brand, description, specs (FR-017)
- [x] T029 [US4] Add image display with aspect-ratio container to gear cards in `components/loadouts/LoadoutPicker.tsx` (FR-015)
- [x] T030 [US4] Add Package icon fallback for items without images in `components/loadouts/LoadoutPicker.tsx` (FR-016)
- [x] T031 [US4] Add click handler on card body to open detail modal in `components/loadouts/LoadoutPicker.tsx` (FR-017)
- [x] T032 [US4] Ensure add button click does NOT trigger modal (event.stopPropagation) in `components/loadouts/LoadoutPicker.tsx` (FR-018)
- [x] T033 [US4] Integrate GearDetailModal into picker component with open/close state

**Checkpoint**: User Story 4 complete - images display with fallback, detail modal opens on card click, add button works independently

---

## Phase 7: User Story 5 - Polished Header Navigation (Priority: P2)

**Goal**: Site header with improved vertical alignment and adequate spacing

**Independent Test**: View the site header, verify vertical alignment is correct, height provides breathing room, and all elements align to baseline.

### Implementation for User Story 5

- [x] T034 [US5] Increase header height in `components/layout/SiteHeader.tsx` - change h-16 to h-18 or add py-4 (FR-020)
- [x] T035 [US5] Verify all elements use items-center for vertical centering in `components/layout/SiteHeader.tsx` (FR-019)
- [x] T036 [US5] Adjust logo container spacing for visual balance in `components/layout/SiteHeader.tsx` (FR-021)
- [x] T037 [US5] Verify nav links align to consistent baseline in `components/layout/SiteHeader.tsx` (FR-021)

**Checkpoint**: User Story 5 complete - header elements properly aligned with adequate breathing room

---

## Phase 8: User Story 6 - Feedback and Empty States (Priority: P3)

**Goal**: Toast notifications for actions and helpful empty state guidance

**Independent Test**: Add an item and verify toast appears, view empty loadout and verify placeholder UI displays.

### Implementation for User Story 6

- [x] T038 [US6] Add toast.success() call when item added in `hooks/useLoadoutEditor.ts` or `app/loadouts/[id]/page.tsx` (FR-022)
- [x] T039 [US6] Create empty state component with "Your pack is empty" message and guidance in `components/loadouts/LoadoutList.tsx` (FR-023)
- [x] T040 [US6] Style empty state to be immediately visible without scroll

**Checkpoint**: User Story 6 complete - toast appears on add, empty state provides helpful guidance

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and validation

- [x] T041 Run `npm run lint` and fix any ESLint errors
- [x] T042 Run `npm run build` and verify no TypeScript errors
- [ ] T043 [P] Test mobile layout on viewport < 768px
- [ ] T044 [P] Test sticky behavior with long inventory list (50+ items)
- [ ] T045 Validate all 16 quickstart.md scenarios
- [ ] T046 Verify performance targets: toast <300ms, filter <100ms, sheet <200ms

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion, can run in PARALLEL with US1
- **User Story 3 (Phase 5)**: Depends on Foundational, best after US1/US2 (uses chart in editor)
- **User Story 4 (Phase 6)**: Depends on Foundational, can run in PARALLEL with US1-US3
- **User Story 5 (Phase 7)**: Depends on Foundational, can run in PARALLEL with US1-US4 (different file)
- **User Story 6 (Phase 8)**: Depends on Foundational, best after US2 (toast needs editor)
- **Polish (Phase 9)**: Depends on all user stories

### User Story Independence

| Story | Can Parallel With | File Dependencies |
|-------|-------------------|-------------------|
| US1 | US2, US4, US5 | `app/loadouts/[id]/page.tsx` (shared with US2, US3, US6) |
| US2 | US1, US4, US5 | `app/loadouts/[id]/page.tsx`, new components |
| US3 | US4, US5 | `components/loadouts/WeightDonut.tsx`, `LoadoutList.tsx` |
| US4 | US1, US2, US3, US5 | `components/loadouts/LoadoutPicker.tsx`, new modal |
| US5 | US1, US2, US3, US4, US6 | `components/layout/SiteHeader.tsx` (independent!) |
| US6 | US5 | `hooks/useLoadoutEditor.ts`, `LoadoutList.tsx` |

### Within Each User Story

- Create hooks/types first (marked [P] when independent)
- Create components second
- Integrate into pages last
- Story complete before dependent stories

---

## Parallel Agent Execution Strategy

### Maximum Parallelism: 3 Agents

**Optimal Parallel Groups After Foundational Phase:**

```text
PARALLEL GROUP A (can start immediately after Phase 2):
├── Agent 1: US1 (Layout) - T008-T012
├── Agent 2: US4 (Gear Cards) - T028-T033
└── Agent 3: US5 (Site Header) - T034-T037

PARALLEL GROUP B (after Group A models complete):
├── Agent 1: US2 (Header/Badges) - T013-T020
├── Agent 2: US3 (Interactive Chart) - T021-T027
└── Agent 3: US6 (Feedback) - T038-T040
```

### Task-Level Parallelism

**Phase 1 Setup (all parallel):**
```text
Agent 1: T001 (npm install sonner)
Agent 2: T002 (shadcn toggle)
Agent 3: T003 (shadcn badge)
```

**Phase 2 Foundational (first 3 parallel, then T007):**
```text
Agent 1: T004 (types/loadout.ts)
Agent 2: T005 (hooks/useStore.ts)
Agent 3: T006 (lib/loadout-utils.ts)
---wait---
Agent 1: T007 (app/layout.tsx - needs sonner installed)
```

**Phase 4 US2 (parallel hooks/components, then integration):**
```text
Agent 1: T013 (hooks/useLoadoutMetadata.ts)
Agent 2: T014 (components/ui/toggle-badge.tsx)
---wait---
Agent 1: T015-T20 (LoadoutHeader creation and integration)
```

**Phase 5 US3 (parallel hook, then sequential chart work):**
```text
Agent 1: T021 (hooks/useChartFilter.ts)
---wait---
Agent 1: T022-T27 (chart modifications - same file)
```

**Phase 6 US4 (parallel modal, then picker integration):**
```text
Agent 1: T028 (GearDetailModal.tsx)
---wait---
Agent 1: T029-T33 (LoadoutPicker modifications)
```

---

## Implementation Strategy

### Recommended Order (Single Developer)

1. **Phase 1**: Setup (T001-T003) - 5 minutes
2. **Phase 2**: Foundational (T004-T007) - Type extensions, store action, toaster
3. **Phase 3**: User Story 1 (T008-T012) - Layout reversal, sticky, mobile
4. **Phase 4**: User Story 2 (T013-T020) - Header with badges and progress bar
5. **Phase 5**: User Story 3 (T021-T027) - Interactive donut chart
6. **Phase 6**: User Story 4 (T028-T033) - Gear card images and detail modal
7. **Phase 7**: User Story 5 (T034-T037) - Site header polish
8. **Phase 8**: User Story 6 (T038-T040) - Toast and empty states
9. **Phase 9**: Polish (T041-T046) - Validation and cleanup

### MVP Milestone

After completing **Phase 3 (US1)** and **Phase 4 (US2)**, you have the core UX improvements:
- Reversed layout (natural flow)
- Enhanced header with badges
- Weight progress tracking

This is the first demo-able milestone covering P1 requirements.

### Full P2 Milestone

After completing **Phases 5-7 (US3-US5)**, all P2 enhancements are live:
- Interactive chart filtering
- Gear card images with detail modal
- Polished site header

---

## Notes

- All shadcn/ui components use existing Dialog, Sheet, Button, Card, ScrollArea
- Rock Salt font already configured via CSS variable `--font-rock-salt`
- GearItem already has `primaryImageUrl` and `notes` fields
- Mobile breakpoint: 768px (md: in Tailwind)
- Weight goal default: 4500g (ultralight)
- Sonner toast API: `toast.success("Message")`
