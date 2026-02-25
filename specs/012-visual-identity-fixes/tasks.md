# Tasks: Visual Identity Overhaul & Data Fixes

**Input**: Design documents from `/specs/012-visual-identity-fixes/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: Manual testing only (no automated tests in this feature)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update global theme variables that affect all user stories

- [X] T001 Update CSS variables in app/globals.css - set --primary to Deep Forest Green HSL and --background to Pale Mist HSL

---

## Phase 2: User Story 1 - Consistent Brand Identity (Priority: P1) 🎯 MVP

**Goal**: Apply Deep Forest Green (#405A3D) to header/footer with white text, update navigation styling

**Independent Test**: Load any page, verify header/footer show Deep Forest Green bg with white text, nav shows active indicator

### Implementation for User Story 1

- [X] T002 [P] [US1] Update SiteHeader background to bg-[#405A3D] and all text/icons to white in components/layout/SiteHeader.tsx
- [X] T003 [P] [US1] Update SiteFooter to match header styling (bg-[#405A3D], white text) in components/layout/SiteFooter.tsx
- [X] T004 [US1] Add active page indicator (border-b-2 border-white) to navigation in components/layout/SiteHeader.tsx
- [X] T005 [US1] Increase nav font size to text-lg and add font-bold in components/layout/SiteHeader.tsx
- [X] T006 [US1] Ensure logo displays in Rock Salt font, text-3xl, white color in components/layout/SiteHeader.tsx
- [X] T007 [US1] Update body/main background to Pale Mist (#FCFDF7) via CSS variable in app/globals.css

**Checkpoint**: Header/footer should display Deep Forest Green with white text, nav shows active page

---

## Phase 3: User Story 2 - Accurate Gear Item Names (Priority: P1) 🎯 MVP

**Goal**: Fix "Untitled Item" bug by extending name field resolution chain with brand/model fallbacks

**Independent Test**: Log in with legacy gear data, verify all items show actual names (not "Untitled Item")

### Implementation for User Story 2

- [X] T008 [P] [US2] Add productName and label as optional fields to FirestoreGearItemSchema in lib/validations/adapter.ts
- [X] T009 [P] [US2] Add model as optional field to FirestoreGearItemSchema in lib/validations/adapter.ts
- [X] T010 [US2] Add debug logging (console.log RAW LEGACY DOC) at start of adaptGearItem in lib/firebase/adapter.ts
- [X] T011 [US2] Extend name resolution to check productName, label, displayName fields in lib/firebase/adapter.ts
- [X] T012 [US2] Add brand+model fallback logic: if brand && model, use "{brand} {model}" in lib/firebase/adapter.ts
- [X] T013 [US2] Add brand-only fallback: if brand exists but no name, use "{brand} Item" in lib/firebase/adapter.ts

**Checkpoint**: All gear items should display actual names from database with fallbacks

---

## Phase 4: User Story 3 - Responsive Gear Card Sizing (Priority: P2)

**Goal**: Make density toggle actually change card and image sizes

**Independent Test**: Open inventory, toggle between compact/standard/detailed, verify visible size changes

### Implementation for User Story 3

- [X] T014 [US3] Create DENSITY_CONFIG object with card/image dimensions per mode in components/gear/GearCard.tsx
- [X] T015 [US3] Apply density-based card min-height classes (compact: 180px, standard: 280px, detailed: 400px) in components/gear/GearCard.tsx
- [X] T016 [US3] Apply density-based image sizing (compact: h-32 object-contain, standard: aspect-square, detailed: aspect-[4/3]) in components/gear/GearCard.tsx
- [X] T017 [US3] Control description/notes visibility based on density (show only in detailed mode) in components/gear/GearCard.tsx
- [X] T018 [US3] Add truncation with ellipsis for long names in compact mode in components/gear/GearCard.tsx

**Checkpoint**: Cards should visibly change size when switching density modes

---

## Phase 5: User Story 4 - Polished Modal Experience (Priority: P2)

**Goal**: Add backdrop overlay to modals, convert LoadoutMetadata to Dialog with icon season selector

**Independent Test**: Open Edit Gear modal (check backdrop), open Edit Loadout (check Dialog + season icons)

### Implementation for User Story 4

- [X] T019 [P] [US4] Update DialogOverlay to include bg-black/60 and backdrop-blur-sm in components/ui/dialog.tsx
- [X] T020 [P] [US4] Create SeasonSelector component with icon cards (Flower2/Sun/Leaf/Snowflake) in components/loadouts/SeasonSelector.tsx
- [X] T021 [US4] Verify LoadoutMetadataDialog uses Dialog component (not Sheet) in components/loadouts/LoadoutMetadataDialog.tsx
- [X] T022 [US4] Integrate SeasonSelector into LoadoutMetadataDialog replacing any dropdown in components/loadouts/LoadoutMetadataDialog.tsx
- [X] T023 [US4] Ensure Dialog has clean white styling with proper rounded corners in components/loadouts/LoadoutMetadataDialog.tsx

**Checkpoint**: All modals should have dark blurred backdrop, Edit Loadout shows icon-based season selector

---

## Phase 6: Polish & Validation

**Purpose**: Final validation and cross-cutting concerns

- [X] T024 Run npm run lint and fix any errors
- [X] T025 Run npm run build and fix any errors
- [X] T026 Manual testing: Verify all user story acceptance scenarios from spec.md
- [X] T027 Verify WCAG contrast compliance - white text on Deep Forest Green (7.2:1 ratio) - Verified 7.21:1 in research.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (US1 Brand Identity)**: Depends on Phase 1 for CSS variables
- **Phase 3 (US2 Data Fix)**: No dependencies on other stories - can run parallel with US1
- **Phase 4 (US3 Card Sizing)**: No dependencies on other stories - can run parallel
- **Phase 5 (US4 Modal Polish)**: No dependencies on other stories - can run parallel
- **Phase 6 (Polish)**: Depends on all user stories complete

### Parallel Opportunities

**Within Phase 2 (US1)**:
- T002 and T003 can run in parallel (different files)

**Within Phase 3 (US2)**:
- T008 and T009 can run in parallel (same file but different additions)

**Within Phase 5 (US4)**:
- T019 and T020 can run in parallel (different files)

**Cross-Story Parallel**:
- After T001 completes, US1, US2, US3, US4 can all begin in parallel

---

## Parallel Example: All User Stories

```bash
# After Phase 1 completes, launch all user stories in parallel:

# US1: Brand Identity
Task: "Update SiteHeader background to bg-[#405A3D] in components/layout/SiteHeader.tsx"
Task: "Update SiteFooter to match header styling in components/layout/SiteFooter.tsx"

# US2: Data Fix (parallel with US1)
Task: "Add productName and label to Zod schema in lib/validations/adapter.ts"
Task: "Add debug logging in adaptGearItem in lib/firebase/adapter.ts"

# US3: Card Sizing (parallel with US1, US2)
Task: "Create DENSITY_CONFIG in components/gear/GearCard.tsx"

# US4: Modal Polish (parallel with US1, US2, US3)
Task: "Update DialogOverlay in components/ui/dialog.tsx"
Task: "Create SeasonSelector in components/loadouts/SeasonSelector.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: US1 Brand Identity (T002-T007)
3. Complete Phase 3: US2 Data Fix (T008-T013)
4. **STOP and VALIDATE**: Test brand colors + data display
5. Deploy/demo if ready

### Full Implementation

1. Setup → US1 + US2 in parallel → Validate MVP
2. Add US3 Card Sizing → Test density changes
3. Add US4 Modal Polish → Test modals
4. Final polish and validation

---

## Summary

| Phase | User Story | Tasks | Parallel? |
|-------|------------|-------|-----------|
| 1 | Setup | T001 | - |
| 2 | US1 Brand Identity | T002-T007 | T002, T003 parallel |
| 3 | US2 Data Fix | T008-T013 | T008, T009 parallel |
| 4 | US3 Card Sizing | T014-T018 | Sequential |
| 5 | US4 Modal Polish | T019-T023 | T019, T020 parallel |
| 6 | Polish | T024-T027 | Sequential |

**Total Tasks**: 27
**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (13 tasks)
