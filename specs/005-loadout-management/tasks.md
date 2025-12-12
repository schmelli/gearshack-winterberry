# Tasks: Loadout Management

**Input**: Design documents from `/specs/005-loadout-management/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md
**Branch**: `005-loadout-management`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US5, US6)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure tooling

- [x] T001 Install zustand for state management: `npm install zustand`
- [x] T002 [P] Install recharts for chart visualization: `npm install recharts`
- [x] T003 [P] Add ScrollArea component from shadcn/ui: `npx shadcn@latest add scroll-area`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and store that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create Loadout types in `types/loadout.ts` (Loadout, LoadoutFormData, CategoryWeight, LoadoutSummary, WeightCategory, WEIGHT_THRESHOLDS)
- [x] T005 [P] Create Store types in `types/store.ts` (GearshackStore interface)
- [x] T006 Create zustand store in `hooks/useStore.ts` with persist middleware (FR-001, FR-002, FR-003). Include all actions: addItem, updateItem, deleteItem, createLoadout, updateLoadout, deleteLoadout, addItemToLoadout, removeItemFromLoadout, initializeWithMockData
- [x] T007 Create loadout utility functions in `lib/loadout-utils.ts` (getWeightCategory, calculateCategoryWeights, groupItemsByCategory)
- [x] T008 Migrate `hooks/useInventory.ts` to read from store instead of MOCK_GEAR_ITEMS
- [x] T009 Migrate `hooks/useGearEditor.ts` to write to store (addItem/updateItem)
- [x] T010 Add mock data initialization in store (initializeWithMockData) for FR-004
- [x] T011 Enable "Loadouts" navigation link in `components/layout/SiteHeader.tsx`

**Checkpoint**: Foundation ready - store persists to localStorage, existing inventory works with store

---

## Phase 3: User Story 5 - Persistent Data Storage (Priority: P1)

**Goal**: All gear items and loadouts persist across browser sessions

**Independent Test**: Create gear items and loadouts, refresh the browser, verify all data remains intact

**Note**: This story is implemented as part of Phase 2 (foundational). The zustand store with persist middleware provides FR-002, FR-003. T010 handles FR-004 (mock data migration).

**Checkpoint**: Data persistence verified - refresh browser, data intact

---

## Phase 4: User Story 1 - Create and Manage Loadouts (Priority: P1)

**Goal**: Users can create trip loadouts, view dashboard, edit loadouts

**Independent Test**: Navigate to /loadouts, create a new loadout with name and date, verify it appears in the dashboard

### Implementation for User Story 1

- [x] T012 [US1] Create `app/loadouts/page.tsx` - Dashboard page with empty state (FR-005, FR-008)
- [x] T013 [US1] Create `components/loadouts/LoadoutCard.tsx` - Card displaying name, date, weight, item count (FR-006)
- [x] T014 [US1] Create `app/loadouts/new/page.tsx` - New loadout form with name/date inputs (FR-024)
- [x] T016 [US1] Create `app/loadouts/[id]/page.tsx` - Loadout editor page skeleton (FR-009)
- [x] T017 [US1] Implement responsive card grid layout in dashboard (FR-005)
- [x] T018 [US1] Create Zod validation schema in `lib/validations/loadout-schema.ts`

**Checkpoint**: User Story 1 complete - can create loadouts, see them on dashboard, click to edit

---

## Phase 5: User Story 2 - Add Gear Items to Loadouts (Priority: P1)

**Goal**: Users can browse inventory and add/remove items from loadouts

**Independent Test**: Open a loadout in editor, search for item in picker, click to add, verify it appears grouped by category

### Implementation for User Story 2

- [x] T019 [P] [US2] Create `components/loadouts/LoadoutPicker.tsx` - Searchable inventory list (FR-013)
- [x] T020 [P] [US2] Create `components/loadouts/LoadoutList.tsx` - Items grouped by category (FR-012)
- [x] T021 [US2] Create `hooks/useLoadoutEditor.ts` - Search state, add/remove item logic
- [x] T022 [US2] Implement two-column grid layout in editor page (FR-010, FR-011)
- [x] T023 [US2] Add item to loadout on click with visual feedback (FR-014, FR-016)
- [x] T024 [US2] Remove item from loadout on click in List panel (FR-015)
- [x] T025 [US2] Implement search filtering in Picker (FR-013) - name and brand matching
- [x] T026 [US2] Implement duplicate prevention in addItemToLoadout action (FR-026)
- [x] T027 [US2] Show added items as disabled/checked in Picker

**Checkpoint**: User Story 2 complete - can add/remove items, search works, items grouped by category

---

## Phase 6: User Story 3 - Track Real-Time Weight Totals (Priority: P1)

**Goal**: Sticky weight bar shows total weight with color-coded feedback

**Independent Test**: Add items to loadout, observe sticky weight bar updating in real-time with appropriate colors

### Implementation for User Story 3

- [x] T028 [US3] Create `components/loadouts/WeightBar.tsx` - Sticky weight display (FR-017)
- [x] T029 [US3] Implement weight calculation hook/selector in `lib/loadout-utils.ts` (FR-018)
- [x] T030 [US3] Add color-coding based on weight thresholds (FR-019) - ultralight green, moderate amber, heavy red
- [x] T031 [US3] Integrate WeightBar into loadout editor page with sticky positioning
- [x] T032 [US3] Format weight display with locale-aware formatting (FR-020)

**Checkpoint**: User Story 3 complete - weight bar visible, updates instantly, colors indicate weight category

---

## Phase 7: User Story 4 - Visualize Weight Distribution (Priority: P2)

**Goal**: Donut chart shows weight breakdown by category

**Independent Test**: Add items from multiple categories, verify donut chart shows breakdown using theme colors

### Implementation for User Story 4

- [x] T033 [US4] Create `components/loadouts/WeightDonut.tsx` - recharts PieChart with donut config (FR-021)
- [x] T034 [US4] Configure chart colors using CSS variables (FR-022) - chart-1 through chart-5
- [x] T035 [US4] Add tooltip on segment hover showing category name and weight (FR-023)
- [x] T036 [US4] Integrate WeightDonut into loadout editor page
- [x] T037 [US4] Add mini donut preview to LoadoutCard component (FR-007)

**Checkpoint**: User Story 4 complete - donut chart renders, tooltips work, theme colors used

---

## Phase 8: User Story 6 - Delete Loadouts (Priority: P2)

**Goal**: Users can delete loadouts with confirmation

**Independent Test**: Create a loadout, delete it from dashboard, verify it no longer appears

### Implementation for User Story 6

- [x] T038 [US6] Create `components/loadouts/DeleteLoadoutDialog.tsx` - Confirmation dialog (FR-025)
- [x] T039 [US6] Add delete button to LoadoutCard with dialog trigger
- [x] T040 [US6] Wire up dialog confirm/cancel actions

**Checkpoint**: User Story 6 complete - delete with confirmation works, loadout removed

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and validation

- [x] T042 Run `npm run lint` and fix any ESLint errors
- [x] T043 Run `npm run build` and verify no TypeScript errors
- [ ] T044 Test responsive layout on mobile viewport (< 768px)
- [ ] T045 Validate all quickstart.md scenarios (14 scenarios)
- [ ] T046 Verify data persistence across browser refresh
- [x] T047 [P] Add loading states where appropriate
- [x] T048 [P] Add empty state messages for dashboard and loadout list

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 5 (Phase 3)**: Part of Foundational - persistence built into store
- **User Story 1 (Phase 4)**: Depends on Foundational completion
- **User Story 2 (Phase 5)**: Depends on US1 (needs editor page)
- **User Story 3 (Phase 6)**: Can start after Foundational, integrates with editor
- **User Story 4 (Phase 7)**: Can start after US2 (needs items in loadout)
- **User Story 6 (Phase 8)**: Can start after US1 (needs loadout cards)
- **Polish (Phase 9)**: Depends on all user stories

### Within Each User Story

- Create types/utilities first
- Create components second
- Integrate into pages last
- Story complete before starting dependent stories

### Parallel Opportunities

```text
Phase 1 - All tasks can run in parallel:
- T001, T002, T003 (npm install commands)

Phase 2 - Types can run in parallel:
- T004, T005 (types files)

Phase 4-8 - Some tasks marked [P] can run in parallel:
- T019, T020 (LoadoutPicker, LoadoutList)
- T047, T048 (loading states, empty states)
```

---

## Implementation Strategy

### Recommended Order (Single Developer)

1. **Phase 1**: Setup (T001-T003) - 5 minutes
2. **Phase 2**: Foundational (T004-T011) - Core infrastructure
3. **Phase 4**: User Story 1 (T012-T018) - Dashboard + create flow
4. **Phase 5**: User Story 2 (T019-T027) - Picker + list
5. **Phase 6**: User Story 3 (T028-T032) - Weight bar
6. **Phase 7**: User Story 4 (T033-T037) - Donut chart
7. **Phase 8**: User Story 6 (T038-T041) - Delete functionality
8. **Phase 9**: Polish (T042-T048) - Final validation

### MVP Milestone

After completing Phase 4 (US1), you have a working dashboard where users can create and view loadouts. This is the first demo-able milestone.

After completing Phase 5 (US2), users can add items to loadouts - core value proposition achieved.

---

## Notes

- All store actions auto-persist via zustand middleware
- Use existing shadcn/ui components (Card, Button, Dialog, Input)
- Weight thresholds: Ultralight < 4500g, Moderate 4500-9000g, Heavy > 9000g
- Chart colors use CSS variables: --chart-1 through --chart-5
- Mobile breakpoint: 768px (md: in Tailwind)
