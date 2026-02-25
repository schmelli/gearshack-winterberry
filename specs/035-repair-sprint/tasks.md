# Tasks: Repair Sprint - Proxy Route & Navigation Fixes

**Input**: Design documents from `/specs/035-repair-sprint/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: No automated tests requested for this bug fix sprint. Manual testing via quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a Next.js web application with App Router structure:
- **App routes**: `app/[locale]/...`
- **Components**: `components/...`
- **Hooks**: `hooks/...`
- **i18n config**: `i18n/...`

---

## Phase 1: Setup (Verification)

**Purpose**: Verify existing fixes and ensure the development environment is ready

- [x] T001 Verify uncommitted changes are in place by running `git diff --stat`
- [x] T002 [P] Verify proxy route exists at app/api/proxy-image/route.ts
- [x] T003 [P] Verify i18n navigation exports exist at i18n/navigation.ts

---

## Phase 2: Foundational (Code Quality Gates)

**Purpose**: Ensure all changes pass linting and TypeScript compilation before proceeding

**⚠️ CRITICAL**: Must pass before testing any user stories

- [x] T004 Run `npm run lint` and fix any errors
- [x] T005 Run `npm run build` and fix any TypeScript errors

**Checkpoint**: Build passes - user story validation can begin

---

## Phase 3: User Story 1 - Save Gear Item with External Image (Priority: P1) 🎯 MVP

**Goal**: Users can save gear items with external images without "Failed to save" errors

**Independent Test**: Create/edit a gear item, select an external image from search, click Save. Item saves and appears in inventory with image displayed.

### Implementation for User Story 1

- [x] T006 [US1] Verify proxy route handles image URLs correctly in app/api/proxy-image/route.ts
- [x] T007 [US1] Verify useGearEditor hook uses locale-aware router from `@/i18n/navigation` in hooks/useGearEditor.ts
- [x] T008 [US1] Test image import flow: external URL → proxy → Firebase Storage

**Checkpoint**: User Story 1 complete - can save gear items with external images

---

## Phase 4: User Story 2 - Navigate to Edit Gear Item (Priority: P1)

**Goal**: Users can click Edit on any gear card and navigate to the edit page regardless of locale

**Independent Test**: Navigate to inventory in /de/, click Edit on any item, verify URL is /de/inventory/{id}/edit and edit form loads.

### Implementation for User Story 2

- [x] T009 [P] [US2] Verify GearCard uses Link from `@/i18n/navigation` in components/inventory-gallery/GearCard.tsx
- [x] T010 [P] [US2] Verify GearDetailModal uses Link from `@/i18n/navigation` in components/loadouts/GearDetailModal.tsx
- [x] T011 [P] [US2] Verify LoadoutCard uses Link from `@/i18n/navigation` in components/loadouts/LoadoutCard.tsx
- [x] T012 [P] [US2] Verify LoadoutHeader uses Link from `@/i18n/navigation` in components/loadouts/LoadoutHeader.tsx
- [x] T013 [US2] Manual test: Click Edit in /en/inventory and verify navigation

**Checkpoint**: User Story 2 complete - edit navigation works in all locales

---

## Phase 5: User Story 3 - Save and Return to Inventory (Priority: P2)

**Goal**: Post-save redirect preserves the current locale

**Independent Test**: Edit an item in /de/ locale, save it, verify redirect goes to /de/inventory (not /inventory).

### Implementation for User Story 3

- [x] T014 [US3] Verify useGearEditor uses useRouter from `@/i18n/navigation` for redirects in hooks/useGearEditor.ts
- [x] T015 [US3] Manual test: Save in /de/ locale and verify redirect to /de/inventory

**Checkpoint**: User Story 3 complete - save redirects preserve locale

---

## Phase 6: User Story 4 - Application Loads Without i18n Errors (Priority: P2)

**Goal**: No "invalid language tag" errors appear in browser console during navigation

**Independent Test**: Open browser console, navigate through the app in both locales, verify no i18n errors.

### Implementation for User Story 4

- [x] T016 [P] [US4] Verify SiteFooter uses Link from `@/i18n/navigation` in components/layout/SiteFooter.tsx
- [x] T017 [P] [US4] Verify loadouts page uses correct imports in app/[locale]/loadouts/page.tsx
- [x] T018 [P] [US4] Verify new loadout page uses correct imports in app/[locale]/loadouts/new/page.tsx
- [x] T019 [US4] Verify layout correctly awaits params and sets locale in app/[locale]/layout.tsx
- [x] T020 [US4] Manual test: Navigate through app with console open, verify no "invalid language tag" errors

**Checkpoint**: User Story 4 complete - no i18n errors

---

## Phase 7: Polish & Final Validation

**Purpose**: Final verification and commit

- [x] T021 Run `npm run build` one final time to confirm all fixes
- [x] T022 [P] Run quickstart.md validation steps (manual testing in both locales)
- [x] T023 Stage all changes with `git add -A`
- [x] T024 Commit changes with descriptive message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel (both P1 priority)
  - US3 and US4 can proceed in parallel after US1/US2 (both P2 priority)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - tests proxy and save flow
- **User Story 2 (P1)**: Independent - tests navigation links
- **User Story 3 (P2)**: Depends on US1 (both use useGearEditor) - tests redirect
- **User Story 4 (P2)**: Independent - tests general i18n stability

### Parallel Opportunities

**Within Phase 2**:
- T004 and T005 must be sequential (lint then build)

**Within User Story 2 (Phase 4)**:
- T009, T010, T011, T012 can all run in parallel (different files)

**Within User Story 4 (Phase 6)**:
- T016, T017, T018 can all run in parallel (different files)

**Across User Stories**:
- US1 and US2 can start simultaneously after Phase 2
- US3 and US4 can start simultaneously after US1/US2

---

## Parallel Example: User Story 2

```bash
# Launch all component verifications for User Story 2 together:
Task: "Verify GearCard uses Link from @/i18n/navigation in components/inventory-gallery/GearCard.tsx"
Task: "Verify GearDetailModal uses Link from @/i18n/navigation in components/loadouts/GearDetailModal.tsx"
Task: "Verify LoadoutCard uses Link from @/i18n/navigation in components/loadouts/LoadoutCard.tsx"
Task: "Verify LoadoutHeader uses Link from @/i18n/navigation in components/loadouts/LoadoutHeader.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Complete Phase 1: Setup (verification)
2. Complete Phase 2: Foundational (lint + build)
3. Complete Phase 3: User Story 1 (save with external images)
4. Complete Phase 4: User Story 2 (edit navigation)
5. **STOP and VALIDATE**: Both P1 stories should work

### Full Completion

1. Complete MVP (above)
2. Complete Phase 5: User Story 3 (redirect preservation)
3. Complete Phase 6: User Story 4 (i18n error-free)
4. Complete Phase 7: Polish & commit
5. **DONE**: All bugs fixed, changes committed

---

## Notes

- This is a bug fix sprint - most code changes are already in place as uncommitted changes
- Tasks focus on verification and validation rather than implementation
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Manual testing per quickstart.md is the primary validation method
- Commit after all validation passes
