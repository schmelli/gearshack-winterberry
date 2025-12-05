# Tasks: Grand Polish Sprint ("Nano Banana")

**Input**: Design documents from `/specs/007-grand-polish-sprint/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: No automated tests requested for this feature. Validation via quickstart.md manual testing scenarios.

**Organization**: Tasks are grouped by user story (US1-US9) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/` for pages, `components/` for UI, `hooks/` for logic, `types/` for interfaces
- **Styling**: Tailwind CSS only via className props

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and preparation

- [x] T001 Verify current branch is `007-grand-polish-sprint`
- [x] T002 Run `npm run lint` to establish baseline (no new errors allowed)
- [x] T003 Run `npm run build` to verify current state compiles

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and store actions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add LoadoutItemState interface to types/loadout.ts
- [x] T005 Add WeightSummary interface to types/loadout.ts
- [x] T006 Extend Loadout interface with `description: string | null` and `itemStates: LoadoutItemState[]` in types/loadout.ts
- [x] T007 Extend LoadoutFormData to include `description: string` in types/loadout.ts
- [x] T008 Add `setItemWorn` action signature to types/store.ts
- [x] T009 Add `setItemConsumable` action signature to types/store.ts
- [x] T010 Implement `setItemWorn` action in hooks/useStore.ts
- [x] T011 Implement `setItemConsumable` action in hooks/useStore.ts
- [x] T012 Add localStorage migration for existing loadouts (add default itemStates: [], description: null) in hooks/useStore.ts
- [x] T013 Add `calculateWeightSummary` utility function in lib/loadout-utils.ts
- [x] T014 Run `npm run lint` to verify no errors introduced
- [x] T015 Run `npm run build` to verify compilation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Global Layout Centering (Priority: P1) 🎯 MVP

**Goal**: Wrap all page content in a centered max-w-7xl container so content is balanced on wide screens

**Independent Test**: Open any page on 1920px+ viewport and verify content is horizontally centered with visible margins

### Implementation for User Story 1

- [x] T016 [US1] Modify app/layout.tsx to wrap {children} in a centered container: `<div className="container mx-auto max-w-7xl px-4 sm:px-6">`
- [x] T017 [US1] Verify Home page (/) displays centered content
- [x] T018 [US1] Verify Inventory page (/inventory) displays centered content
- [x] T019 [US1] Verify Loadouts page (/loadouts) displays centered content
- [x] T020 [US1] Verify Loadout detail page (/loadouts/[id]) displays centered content
- [x] T021 [US1] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Global layout centering complete - all pages display centered content

---

## Phase 4: User Story 2 - Site Header Redesign (Priority: P1)

**Goal**: Taller header (h-24/96px), 2x larger logo/title, right-aligned navigation

**Independent Test**: View header on desktop - logo ~80px, title ~text-3xl, nav links on right side

### Implementation for User Story 2

- [x] T022 [US2] Increase header height from h-18 to h-24 in components/layout/SiteHeader.tsx
- [x] T023 [US2] Increase logo container from h-10 w-10 to h-20 w-20 in components/layout/SiteHeader.tsx
- [x] T024 [US2] Update Image component dimensions from 40x40 to 80x80 in components/layout/SiteHeader.tsx
- [x] T025 [US2] Increase title text from text-xl to text-3xl in components/layout/SiteHeader.tsx
- [x] T026 [US2] Move navigation links to right side using ml-auto flex container in components/layout/SiteHeader.tsx
- [x] T027 [US2] Ensure logo blends with header background (remove bg-primary/10 or use mix-blend-multiply) in components/layout/SiteHeader.tsx
- [x] T028 [US2] Verify sticky header with backdrop-blur still works after changes
- [x] T029 [US2] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Header redesign complete - taller, larger branding, right-aligned nav

---

## Phase 5: User Story 3 - Footer Redesign (Priority: P2)

**Goal**: 4-column footer with Logo/About, Features, Resources, Connect sections on dark stone background

**Independent Test**: Scroll to bottom - verify 4-column layout on desktop, stacked on mobile, dark zinc-900 background

### Implementation for User Story 3

- [x] T030 [US3] Replace current footer layout with 4-column grid structure in components/layout/SiteFooter.tsx
- [x] T031 [US3] Add dark stone background (bg-zinc-900 text-zinc-300) to footer in components/layout/SiteFooter.tsx
- [x] T032 [US3] Create Column 1: Logo and brief about text in components/layout/SiteFooter.tsx
- [x] T033 [US3] Create Column 2: Features section with placeholder links in components/layout/SiteFooter.tsx
- [x] T034 [US3] Create Column 3: Resources section with placeholder links in components/layout/SiteFooter.tsx
- [x] T035 [US3] Create Column 4: Connect section with placeholder links in components/layout/SiteFooter.tsx
- [x] T036 [US3] Add responsive classes: grid-cols-1 md:grid-cols-4 for mobile stacking in components/layout/SiteFooter.tsx
- [x] T037 [US3] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Footer redesign complete - 4-column layout with dark stone background

---

## Phase 6: User Story 4 - Advanced Weight Calculations (Priority: P1)

**Goal**: Display both Total Weight and Base Weight; allow marking items as worn/consumable

**Independent Test**: Add items to loadout, mark some as worn/consumable, verify Base Weight = Total - (Worn + Consumable)

### Implementation for User Story 4

- [x] T038 [P] [US4] Create useLoadoutItemState hook in hooks/useLoadoutItemState.ts for managing worn/consumable state
- [x] T039 [P] [US4] Create WornToggle inline component (shirt icon via lucide-react Shirt) within components/loadouts/LoadoutList.tsx
- [x] T040 [P] [US4] Create ConsumableToggle inline component (apple icon via lucide-react Apple) within components/loadouts/LoadoutList.tsx
- [x] T041 [US4] Add worn/consumable toggle buttons to items in components/loadouts/LoadoutList.tsx
- [x] T042 [US4] Wire toggles to setItemWorn and setItemConsumable store actions in LoadoutList.tsx
- [x] T043 [US4] Update LoadoutHeader to display both Total Weight and Base Weight using calculateWeightSummary in components/loadouts/LoadoutHeader.tsx
- [x] T044 [US4] Ensure weight display shows "0g" for empty loadouts (edge case)
- [x] T045 [US4] Verify real-time weight recalculation: Add 3 items (100g, 200g, 300g), mark 200g as worn, confirm Total=600g and Base=400g; then mark 300g as consumable, confirm Base=100g
- [x] T045b [US4] Verify edge case: Mark an item as BOTH worn AND consumable, confirm it is only excluded once from Base Weight (not double-subtracted)
- [x] T046 [US4] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Advanced weight calculations complete - worn/consumable tracking with Base Weight display

---

## Phase 7: User Story 5 - Loadout Metadata Editing (Priority: P2)

**Goal**: Edit loadout name, description, season, and trip date via sheet/dialog

**Independent Test**: Click edit icon next to loadout title, modify fields, save - verify changes persist

### Implementation for User Story 5

- [x] T047 [US5] Create LoadoutMetadataSheet component using Sheet from shadcn/ui in components/loadouts/LoadoutMetadataSheet.tsx
- [x] T048 [US5] Add form fields for name, description, season, tripDate in LoadoutMetadataSheet.tsx
- [x] T049 [US5] Wire form submission to updateLoadout store action in LoadoutMetadataSheet.tsx
- [x] T050 [US5] Add edit icon (pencil) next to loadout title in components/loadouts/LoadoutHeader.tsx
- [x] T051 [US5] Wire edit icon to open LoadoutMetadataSheet in LoadoutHeader.tsx
- [x] T052 [US5] Implement cancel button to discard unsaved changes in LoadoutMetadataSheet.tsx
- [x] T053 [US5] Verify changes reflect immediately in header after save
- [x] T054 [US5] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Loadout metadata editing complete - name, description, season, date all editable

---

## Phase 8: User Story 6 - Universal Card Interactions (Priority: P2)

**Goal**: Clicking gear card body opens GearDetailDialog everywhere (Inventory, Picker, Loadout List)

**Independent Test**: Click gear cards in Inventory, Loadout Picker, and Loadout List - all should open detail modal

### Implementation for User Story 6

- [x] T055 [P] [US6] Add onClick handler to GearCard body in components/inventory-gallery/GearCard.tsx
- [x] T056 [P] [US6] Add stopPropagation to any action buttons on GearCard (edit button) in GearCard.tsx
- [x] T057 [US6] Wire GearCard click to open GearDetailDialog on Inventory page in app/inventory/page.tsx
- [x] T058 [US6] Add card click handler in LoadoutPicker to open GearDetailDialog (verify existing or add)
- [x] T059 [US6] Add card click handler in LoadoutList to open GearDetailDialog in components/loadouts/LoadoutList.tsx
- [x] T060 [US6] Add stopPropagation to worn/consumable toggles in LoadoutList to prevent dialog open
- [x] T061 [US6] Add stopPropagation to Add/Remove buttons in picker and list
- [x] T062 [US6] Add edit icon (pencil) to GearDetailDialog header if not present
- [x] T063 [US6] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Universal card interactions complete - consistent click behavior everywhere

---

## Phase 9: User Story 7 - Smooth Animations (Priority: P3)

**Goal**: Dialogs fade in/out smoothly, Sheets slide in/out smoothly

**Independent Test**: Open and close any Dialog or Sheet - observe smooth 200-300ms animations

### Implementation for User Story 7

- [x] T064 [P] [US7] Verify Dialog component has enter/exit animations in components/ui/dialog.tsx
- [x] T065 [P] [US7] Verify Sheet component has slide enter/exit animations in components/ui/sheet.tsx
- [x] T066 [US7] Add or enhance data-[state=open]/data-[state=closed] transitions to Dialog if needed
- [x] T067 [US7] Add or enhance slide animations to Sheet if needed
- [x] T068 [US7] Test animation smoothness on GearDetailDialog
- [x] T069 [US7] Test animation smoothness on LoadoutMetadataSheet
- [x] T070 [US7] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Smooth animations complete - professional entrance/exit transitions

---

## Phase 10: User Story 8 - Loadouts Dashboard Search (Priority: P2)

**Goal**: Search/filter toolbar on Loadouts page with name search and season filter

**Independent Test**: Navigate to /loadouts, type in search field to filter by name, use season filter

### Implementation for User Story 8

- [x] T071 [US8] Create useLoadoutSearch hook in hooks/useLoadoutSearch.ts
- [x] T072 [US8] Implement searchQuery state and name filtering logic in useLoadoutSearch.ts
- [x] T073 [US8] Implement seasonFilter state and season filtering logic in useLoadoutSearch.ts
- [x] T074 [US8] Add clearFilters and hasActiveFilters helpers to useLoadoutSearch.ts
- [x] T075 [US8] Remove generic "Loadouts" title from app/loadouts/page.tsx
- [x] T076 [US8] Add search/filter toolbar with Input and Select components to app/loadouts/page.tsx
- [x] T077 [US8] Wire search input to setSearchQuery from useLoadoutSearch in loadouts/page.tsx
- [x] T078 [US8] Wire season filter Select to setSeasonFilter from useLoadoutSearch in loadouts/page.tsx
- [x] T079 [US8] Display filteredLoadouts from hook instead of all loadouts
- [x] T080 [US8] Add empty state message when search returns no results
- [x] T081 [US8] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Loadouts dashboard search complete - real-time filtering by name and season

---

## Phase 11: User Story 9 - Loadout Editor Polish (Priority: P3)

**Goal**: Sticky category headers during scroll, add button micro-feedback

**Independent Test**: Scroll through loadout with multiple categories - headers stick. Click Add button - brief visual feedback

### Implementation for User Story 9

- [x] T082 [P] [US9] Add sticky positioning to category headers in LoadoutList scroll area
- [x] T083 [P] [US9] Add sticky positioning to category headers in LoadoutPicker scroll area (if applicable)
- [x] T084 [US9] Ensure sticky headers have proper z-index and background for readability
- [x] T085 [US9] Add micro-interaction to Add button in picker (brief color change or checkmark flash ~200ms)
- [x] T086 [US9] Use useState + setTimeout pattern for temporary button state change
- [x] T087 [US9] Run `npm run lint` and `npm run build` to verify

**Checkpoint**: Loadout editor polish complete - sticky headers and add button feedback

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cross-story integration

- [x] T088 Run complete quickstart.md scenarios 1-16 for manual validation
- [x] T089 Verify no console errors during all scenarios
- [x] T090 Run `npm run lint` - ensure zero errors/warnings
- [x] T091 Run `npm run build` - ensure successful production build
- [ ] T092 Test mobile responsive layout on all modified components
- [ ] T093 Verify dark mode compatibility (if next-themes active)
- [ ] T094 Code cleanup - remove any unused imports or commented code

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if multiple subagents)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 12)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Dependencies | Can Parallelize With |
|-------|----------|--------------|---------------------|
| US1 - Global Layout | P1 | Foundational only | US2, US3 |
| US2 - Site Header | P1 | Foundational only | US1, US3 |
| US3 - Footer Redesign | P2 | Foundational only | US1, US2 |
| US4 - Weight Calculations | P1 | Foundational (needs types) | US5, US6 |
| US5 - Metadata Editing | P2 | Foundational (needs types) | US4, US6 |
| US6 - Card Interactions | P2 | Foundational only | US4, US5, US7, US8 |
| US7 - Smooth Animations | P3 | Foundational only | All others |
| US8 - Dashboard Search | P2 | Foundational only | US4, US5, US6, US7 |
| US9 - Editor Polish | P3 | Foundational only | All others |

### Parallel Opportunities Summary

**Highly Parallelizable Groups**:

1. **Layout/Branding Group** (No shared files):
   - US1 (Global Layout) - app/layout.tsx
   - US2 (Site Header) - components/layout/SiteHeader.tsx
   - US3 (Footer Redesign) - components/layout/SiteFooter.tsx

2. **Loadout Features Group** (Different files):
   - US4 (Weight Calculations) - hooks/useLoadoutItemState.ts, LoadoutList.tsx, LoadoutHeader.tsx
   - US5 (Metadata Editing) - LoadoutMetadataSheet.tsx (NEW), LoadoutHeader.tsx (minor)
   - US8 (Dashboard Search) - hooks/useLoadoutSearch.ts, app/loadouts/page.tsx

3. **Polish Group** (Independent files):
   - US7 (Animations) - components/ui/dialog.tsx, components/ui/sheet.tsx
   - US9 (Editor Polish) - LoadoutList.tsx, LoadoutPicker.tsx sticky headers

**File Conflicts to Watch**:
- LoadoutHeader.tsx: US4 (weight display) and US5 (edit icon) - sequence these
- LoadoutList.tsx: US4 (toggles), US6 (card click), US9 (sticky headers) - sequence these

---

## Parallel Execution Examples

### Example: 3 Subagents After Foundational Phase

```text
Agent A: Layout/Branding
├── T016-T021 (US1 - Global Layout)
├── T022-T029 (US2 - Site Header)
└── T030-T037 (US3 - Footer Redesign)

Agent B: Loadout Logic
├── T038-T046 (US4 - Weight Calculations)
├── T047-T054 (US5 - Metadata Editing)
└── T071-T081 (US8 - Dashboard Search)

Agent C: Interactions & Polish
├── T055-T063 (US6 - Card Interactions)
├── T064-T070 (US7 - Animations)
└── T082-T087 (US9 - Editor Polish)
```

### Example: 2 Subagents After Foundational Phase

```text
Agent A: P1 Priority Stories + Layout
├── T016-T021 (US1 - Global Layout) [P1]
├── T022-T029 (US2 - Site Header) [P1]
├── T038-T046 (US4 - Weight Calculations) [P1]
└── T030-T037 (US3 - Footer Redesign) [P2]

Agent B: P2 & P3 Stories
├── T047-T054 (US5 - Metadata Editing) [P2]
├── T055-T063 (US6 - Card Interactions) [P2]
├── T071-T081 (US8 - Dashboard Search) [P2]
├── T064-T070 (US7 - Animations) [P3]
└── T082-T087 (US9 - Editor Polish) [P3]
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete US1 (Global Layout) + US2 (Site Header) + US4 (Weight Calculations)
4. **STOP and VALIDATE**: Test these 3 P1 stories independently
5. Deploy/demo if ready with core polish

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test layout/header → Demo (Visual MVP!)
3. Add US4 → Test weight calculations → Demo (Feature MVP!)
4. Add US3 + US5 + US6 + US8 → Test P2 features → Demo
5. Add US7 + US9 → Test polish → Final Demo

### Single Agent Sequential Strategy

For single-agent execution, follow priority order:
1. Phases 1-2 (Setup + Foundational)
2. Phase 3 (US1 - Layout)
3. Phase 4 (US2 - Header)
4. Phase 6 (US4 - Weight Calculations)
5. Phase 5 (US3 - Footer)
6. Phase 7 (US5 - Metadata)
7. Phase 8 (US6 - Card Interactions)
8. Phase 10 (US8 - Dashboard Search)
9. Phase 9 (US7 - Animations)
10. Phase 11 (US9 - Editor Polish)
11. Phase 12 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable per quickstart.md scenarios
- Commit after each phase or user story completion
- Stop at any checkpoint to validate story independently
- Watch for file conflicts when parallelizing (see Dependencies section)
