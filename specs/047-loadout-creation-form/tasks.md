# Tasks: Loadout Creation - Step 1 Form

**Input**: Design documents from `/specs/047-loadout-creation-form/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Not requested - manual testing only per plan.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/[locale]/`, `hooks/`, `lib/`, `messages/`, `types/`
- Paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend existing schemas and store action to support new form fields

- [x] T001 [P] Extend Zod validation schema with loadoutCreationFormSchema in `lib/validations/loadout-schema.ts`
- [x] T002 [P] Add English i18n keys for LoadoutCreation namespace in `messages/en.json`
- [x] T003 [P] Add German i18n keys for LoadoutCreation namespace in `messages/de.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Extend createLoadout action signature in `hooks/useSupabaseStore.ts` to accept optional description, seasons, and activityTypes parameters
- [x] T005 Create useLoadoutCreationForm hook with react-hook-form integration in `hooks/useLoadoutCreationForm.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Complete Trip Definition Form (Priority: P1) 🎯 MVP

**Goal**: Display a form with four fields (Name, Description, Season, Activity Type) that users can complete in under 60 seconds

**Independent Test**: Navigate to `/loadouts/new`, fill all four fields, submit, and verify navigation to loadout editor with all data preserved

### Implementation for User Story 1

- [x] T006 [US1] Replace existing minimal form UI with enhanced 4-field layout in `app/[locale]/loadouts/new/page.tsx`
- [x] T007 [US1] Add Name input field with required validation and 100-char limit in `app/[locale]/loadouts/new/page.tsx`
- [x] T008 [US1] Add Description textarea field with optional 500-char limit in `app/[locale]/loadouts/new/page.tsx`
- [x] T009 [US1] Wire form submission to useLoadoutCreationForm hook in `app/[locale]/loadouts/new/page.tsx`
- [x] T010 [US1] Ensure all 4 fields visible without scrolling on 768px+ screens via Tailwind layout in `app/[locale]/loadouts/new/page.tsx`

**Checkpoint**: Basic form with Name and Description fields works end-to-end

---

## Phase 4: User Story 2 - Season Selection (Priority: P1)

**Goal**: Allow users to select one or more seasons (Spring, Summer, Fall, Winter) via toggle badges

**Independent Test**: Select each season option, verify visual toggle feedback, submit form, verify seasons passed to Step 2

### Implementation for User Story 2

- [x] T011 [US2] Add Season toggle badges section using existing SEASON_LABELS in `app/[locale]/loadouts/new/page.tsx`
- [x] T012 [US2] Implement multi-select toggle behavior for seasons (click toggles on/off) in `app/[locale]/loadouts/new/page.tsx`
- [x] T013 [US2] Connect season selection to form state via react-hook-form Controller in `app/[locale]/loadouts/new/page.tsx`

**Checkpoint**: Season selection works with visual feedback

---

## Phase 5: User Story 3 - Activity Type Selection (Priority: P1)

**Goal**: Allow users to select one or more activity types (Hiking, Camping, Climbing, Skiing, Backpacking) via toggle badges

**Independent Test**: Select each activity type, verify visual toggle feedback, submit form, verify activityTypes passed to Step 2

### Implementation for User Story 3

- [x] T014 [US3] Add Activity Type toggle badges section using existing ACTIVITY_TYPE_LABELS in `app/[locale]/loadouts/new/page.tsx`
- [x] T015 [US3] Implement multi-select toggle behavior for activities (click toggles on/off) in `app/[locale]/loadouts/new/page.tsx`
- [x] T016 [US3] Connect activity selection to form state via react-hook-form Controller in `app/[locale]/loadouts/new/page.tsx`

**Checkpoint**: Activity Type selection works with visual feedback

---

## Phase 6: User Story 4 - Cancel Creation Flow (Priority: P2)

**Goal**: Allow users to cancel and return to loadouts list without saving

**Independent Test**: Start filling form, click Cancel, verify navigation to `/loadouts` without any data saved

### Implementation for User Story 4

- [x] T017 [US4] Add Cancel button ("Abbrechen") below submit button in `app/[locale]/loadouts/new/page.tsx`
- [x] T018 [US4] Wire Cancel button to router.push('/loadouts') via useLoadoutCreationForm hook in `app/[locale]/loadouts/new/page.tsx`

**Checkpoint**: Cancel navigation works correctly

---

## Phase 7: User Story 5 - German Language Display (Priority: P2)

**Goal**: All form text displays in German for German locale users

**Independent Test**: View form in German locale, verify all labels, buttons, and options are in German

### Implementation for User Story 5

- [x] T019 [US5] Replace hardcoded English strings with useTranslations('LoadoutCreation') calls in `app/[locale]/loadouts/new/page.tsx`
- [x] T020 [US5] Add localized season labels (Frühling, Sommer, Herbst, Winter) lookup in `app/[locale]/loadouts/new/page.tsx`
- [x] T021 [US5] Add localized activity labels (Wandern, Camping, Klettern, Skifahren, Trekking) lookup in `app/[locale]/loadouts/new/page.tsx`

**Checkpoint**: All form text displays correctly in German

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T022 [P] Verify form validation error messages display correctly for empty name
- [x] T023 [P] Verify form completion time is under 60 seconds with manual test
- [x] T024 Run `npm run lint` and fix any linting errors
- [x] T025 Run `npm run build` and verify no TypeScript errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1, US2, US3 are all P1 priority and modify the same file - execute sequentially
  - US4, US5 are P2 priority and can proceed after core form works
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core form structure
- **User Story 2 (P1)**: Depends on US1 - Adds Season field to existing form
- **User Story 3 (P1)**: Depends on US2 - Adds Activity Type field to existing form
- **User Story 4 (P2)**: Can start after US1 - Cancel button is independent
- **User Story 5 (P2)**: Depends on US1-US4 - i18n wraps all existing strings

### File Modification Summary

| File | Tasks | Notes |
|------|-------|-------|
| `lib/validations/loadout-schema.ts` | T001 | New schema, parallel with i18n |
| `messages/en.json` | T002 | Parallel with schema and de.json |
| `messages/de.json` | T003 | Parallel with schema and en.json |
| `hooks/useSupabaseStore.ts` | T004 | Must complete before hook |
| `hooks/useLoadoutCreationForm.ts` | T005 | New file, depends on T001, T004 |
| `app/[locale]/loadouts/new/page.tsx` | T006-T021 | Main UI file, sequential tasks |

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can all run in parallel (different files)
- **Phase 2**: T004, T005 must run sequentially (T005 depends on T004)
- **Phase 3-7**: Tasks within each story are sequential (same file)
- **Phase 8**: T022, T023 can run in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all setup tasks together:
Task: "Extend Zod validation schema in lib/validations/loadout-schema.ts"
Task: "Add English i18n keys in messages/en.json"
Task: "Add German i18n keys in messages/de.json"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 - Core form (T006-T010)
4. Complete Phase 4: User Story 2 - Seasons (T011-T013)
5. Complete Phase 5: User Story 3 - Activities (T014-T016)
6. **STOP and VALIDATE**: Test form submission end-to-end
7. Deploy/demo if ready

### Full Implementation

1. Complete MVP (Phases 1-5)
2. Add Phase 6: Cancel button (T017-T018)
3. Add Phase 7: German translations (T019-T021)
4. Complete Phase 8: Polish (T022-T025)

### Critical Path

```
T001 ─┬─► T004 ─► T005 ─► T006 ─► T007 ─► T008 ─► T009 ─► T010 ─► T011...
T002 ─┤
T003 ─┘
```

---

## Notes

- All user story tasks modify `app/[locale]/loadouts/new/page.tsx` - execute sequentially within stories
- Existing types from `types/loadout.ts` are reused - no modifications needed
- No new API endpoints - uses existing Supabase store actions
- Manual testing per plan.md - no automated test tasks
- Commit after each phase checkpoint for clean history
