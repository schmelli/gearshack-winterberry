# Tasks: Inventory Gallery

**Input**: Design documents from `/specs/002-inventory-gallery/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in spec - test tasks omitted.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create types and component directory structure

- [x] T001 Create inventory types file at types/inventory.ts with ViewDensity, FilterState, UseInventoryReturn types
- [x] T002 [P] Create components/inventory-gallery/ directory structure
- [x] T003 [P] Add formatWeightForDisplay function to lib/gear-utils.ts (g/kg smart formatting)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create useInventory hook with mock data (10-15 items) in hooks/useInventory.ts
- [x] T005 [P] Add filtering logic (searchQuery, categoryFilter) to useInventory in hooks/useInventory.ts
- [x] T006 [P] Add view density state with sessionStorage persistence to useInventory in hooks/useInventory.ts
- [x] T007 Create CategoryPlaceholder component with icon mapping in components/inventory-gallery/CategoryPlaceholder.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Browse Gear Collection (Priority: P1) MVP

**Goal**: Users can visually browse their gear collection in a responsive grid of cards

**Independent Test**: Navigate to /inventory → see responsive grid of gear cards with image/placeholder, brand, and name

**Acceptance Criteria**:
- Responsive grid displays (1 col mobile, 2-3 tablet, 4+ desktop)
- Cards show image or category placeholder
- Edit button navigates to /inventory/[id]/edit

### Implementation for User Story 1

- [x] T008 [P] [US1] Create GearCard component shell in components/inventory-gallery/GearCard.tsx
- [x] T009 [US1] Add card image section with CategoryPlaceholder fallback to GearCard in components/inventory-gallery/GearCard.tsx
- [x] T010 [US1] Add brand and name display to GearCard in components/inventory-gallery/GearCard.tsx
- [x] T011 [US1] Add Edit button with Link to /inventory/[id]/edit in GearCard in components/inventory-gallery/GearCard.tsx
- [x] T012 [P] [US1] Create GalleryGrid component with responsive CSS Grid in components/inventory-gallery/GalleryGrid.tsx
- [x] T013 [US1] Update app/inventory/page.tsx to use GalleryGrid with useInventory hook
- [x] T014 [US1] Add empty state for 0 items with "Add Gear" CTA in app/inventory/page.tsx

**Checkpoint**: User Story 1 complete - users can browse gear in responsive gallery

---

## Phase 4: User Story 2 - Switch View Density (Priority: P2)

**Goal**: Users can control card information density (Compact/Standard/Detailed)

**Independent Test**: Click view density controls → card content changes appropriately → persists during session

**Acceptance Criteria**:
- Compact: Image, Brand, Name only
- Standard (default): + Category, Weight, Status Badge
- Detailed: + Notes snippet
- Selection persists in session

### Implementation for User Story 2

- [x] T015 [US2] Create ViewDensityToggle component in components/inventory-gallery/ViewDensityToggle.tsx
- [x] T016 [US2] Add Standard view fields (category, weight, status) to GearCard in components/inventory-gallery/GearCard.tsx
- [x] T017 [US2] Add Detailed view fields (notes snippet) to GearCard in components/inventory-gallery/GearCard.tsx
- [x] T018 [US2] Add viewDensity prop conditional rendering logic to GearCard in components/inventory-gallery/GearCard.tsx
- [x] T019 [US2] Integrate ViewDensityToggle into inventory page in app/inventory/page.tsx

**Checkpoint**: User Stories 1 AND 2 complete - gallery with density controls

---

## Phase 5: User Story 3 - Search and Filter Gear (Priority: P2)

**Goal**: Users can find gear using text search and category filter

**Independent Test**: Type in search box or select category → gallery filters in real-time → clear filters shows all

**Acceptance Criteria**:
- Text search filters by Name and Brand (case-insensitive)
- Category dropdown populated from taxonomy
- AND logic when both filters applied
- Empty state when no matches

### Implementation for User Story 3

- [x] T020 [US3] Create GalleryToolbar component shell in components/inventory-gallery/GalleryToolbar.tsx
- [x] T021 [US3] Add search Input to GalleryToolbar in components/inventory-gallery/GalleryToolbar.tsx
- [x] T022 [US3] Add category Select dropdown to GalleryToolbar in components/inventory-gallery/GalleryToolbar.tsx
- [x] T023 [US3] Add Clear Filters button to GalleryToolbar in components/inventory-gallery/GalleryToolbar.tsx
- [x] T024 [US3] Add item count display (filtered/total) to GalleryToolbar in components/inventory-gallery/GalleryToolbar.tsx
- [x] T025 [US3] Add filter empty state message to GalleryGrid in components/inventory-gallery/GalleryGrid.tsx
- [x] T026 [US3] Integrate GalleryToolbar into inventory page in app/inventory/page.tsx

**Checkpoint**: User Stories 1, 2, AND 3 complete - full gallery with search/filter

---

## Phase 6: User Story 4 - View Item Details on Card (Priority: P3)

**Goal**: Cards display weight formatting, status badges, and category labels correctly

**Independent Test**: View cards in Standard/Detailed mode → verify weight shows g/kg, status has colored badge, category label displays

**Acceptance Criteria**:
- Weight: g for < 1000g, kg for >= 1000g
- Status: visually distinct colored badges
- Category: label from taxonomy displayed
- Long text truncated with ellipsis

### Implementation for User Story 4

- [x] T027 [US4] Create StatusBadge component in components/inventory-gallery/StatusBadge.tsx
- [x] T028 [US4] Integrate StatusBadge into GearCard in components/inventory-gallery/GearCard.tsx
- [x] T029 [US4] Add weight formatting using formatWeightForDisplay to GearCard in components/inventory-gallery/GearCard.tsx
- [x] T030 [US4] Add category label using getCategoryLabel to GearCard in components/inventory-gallery/GearCard.tsx
- [x] T031 [US4] Add text truncation styles to GearCard in components/inventory-gallery/GearCard.tsx

**Checkpoint**: All 4 user stories complete - full feature implemented

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [x] T032 [P] Add loading state to useInventory hook in hooks/useInventory.ts
- [x] T033 [P] Add image error handling (fallback to placeholder) in GearCard in components/inventory-gallery/GearCard.tsx
- [x] T034 Review all components for accessibility (labels, aria attributes)
- [x] T035 Run npm run lint and fix any errors
- [x] T036 Run npm run build and verify no TypeScript errors
- [x] T037 Validate against quickstart.md test scenarios

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
│  Phase 5 (US3)  Phase 6 (US4)                 │
└───────────────────────────────────────────────┘
    ↓
Phase 7 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Browse) | Phase 2 | Foundational complete |
| US2 (Density) | US1 | US1 complete (extends GearCard) |
| US3 (Search) | Phase 2 | Foundational complete (uses useInventory) |
| US4 (Details) | US2 | US2 complete (enhances card display) |

### Parallel Opportunities by Phase

**Phase 1 (Setup)**:
```
T002, T003 can run in parallel (different files)
```

**Phase 2 (Foundational)**:
```
T005, T006 can run in parallel (same file but independent functions)
T007 can run in parallel with T004-T006 (different file)
```

**Phase 3 (US1)**:
```
T008, T012 can run in parallel (different components)
```

**Phase 7 (Polish)**:
```
T032, T033 can run in parallel (different files)
```

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch foundational tasks in parallel where possible:
Task: "Add filtering logic to useInventory in hooks/useInventory.ts"
Task: "Add view density state to useInventory in hooks/useInventory.ts"
Task: "Create CategoryPlaceholder component in components/inventory-gallery/CategoryPlaceholder.tsx"

# Then sequentially after T004 completes:
Task: "Create useInventory hook with mock data in hooks/useInventory.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007)
3. Complete Phase 3: User Story 1 (T008-T014)
4. **STOP and VALIDATE**: Can browse gear in responsive gallery
5. Deploy/demo if ready

### Recommended Incremental Delivery

| Increment | Stories | What's Deliverable |
|-----------|---------|-------------------|
| MVP | US1 | Browse gear in gallery |
| v0.2 | US1 + US2 | + View density toggle |
| v0.3 | US1-3 | + Search and filter |
| v1.0 | US1-4 | Complete feature with polished cards |

### File Creation Order

```
1. types/inventory.ts
2. components/inventory-gallery/ (directory)
3. lib/gear-utils.ts (extend)
4. hooks/useInventory.ts
5. components/inventory-gallery/CategoryPlaceholder.tsx
6. components/inventory-gallery/GearCard.tsx
7. components/inventory-gallery/GalleryGrid.tsx
8. app/inventory/page.tsx (update)
9. components/inventory-gallery/ViewDensityToggle.tsx
10. components/inventory-gallery/GalleryToolbar.tsx
11. components/inventory-gallery/StatusBadge.tsx
```

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after completion
- Constitution requires: stateless UI components, logic in hooks, @/* imports
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Reuse existing: GearItem type, taxonomy-utils, taxonomy-data.json from Sprint 1
