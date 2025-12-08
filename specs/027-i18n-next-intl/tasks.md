# Tasks: Internationalization with next-intl

**Input**: Design documents from `/specs/027-i18n-next-intl/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: No automated tests requested - validation via lint, build, and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/[locale]/`, `components/`, `lib/` at repository root
- New configuration: `i18n/`, `messages/` at repository root
- Modified files: `app/[locale]/layout.tsx`, `components/layout/SiteHeader.tsx`

---

## Phase 1: Setup (Dependencies & Configuration)

**Purpose**: Install next-intl and create base configuration

- [x] T001 Install next-intl dependency: `npm install next-intl`
- [x] T002 [P] Create locale configuration in `i18n/config.ts` (DR-002)
- [x] T003 [P] Create request configuration in `i18n/request.ts` (DR-002)
- [x] T004 [P] Create navigation utilities in `i18n/navigation.ts` (DR-006)
- [x] T005 Update `next.config.ts` with next-intl plugin wrapper

**Checkpoint**: i18n configuration ready - translation files and middleware can be created

---

## Phase 2: Foundational (Translation Files & Middleware)

**Purpose**: Create translation files and routing middleware that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create English translation file in `messages/en.json` with Navigation, Hero, Common namespaces
- [x] T007 [P] Create German translation file in `messages/de.json` with translated strings
- [x] T008 [P] Create TypeScript declarations for type-safe messages in `global.d.ts` (DR-008)
- [x] T009 Create middleware for locale detection and routing in `middleware.ts` (DR-007)

**Checkpoint**: Translation infrastructure ready - migration can begin

---

## Phase 3: User Story 1 - English Default Experience (Priority: P1) 🎯 MVP

**Goal**: When users visit the app, they see the interface in English by default with locale-prefixed URLs

**Independent Test**: Navigate to `/` → verify redirect to `/en/` → verify header shows "Inventory", "Loadouts", "Community"

### The Great Migration

- [x] T010 [US1] Create `app/[locale]/` directory structure
- [x] T011 [US1] Move `app/page.tsx` to `app/[locale]/page.tsx`
- [x] T012 [P] [US1] Move `app/inventory/` to `app/[locale]/inventory/`
- [x] T013 [P] [US1] Move `app/loadouts/` to `app/[locale]/loadouts/`
- [x] T014 [P] [US1] Move `app/login/` to `app/[locale]/login/`
- [x] T015 [P] [US1] Move `app/settings/` to `app/[locale]/settings/`
- [x] T016 [US1] Move and update `app/layout.tsx` to `app/[locale]/layout.tsx` with NextIntlClientProvider (DR-004)
- [x] T017 [US1] Update layout to use dynamic `lang={locale}` attribute on html tag (FR-007)
- [x] T018 [US1] Add `generateStaticParams()` for static locale generation
- [x] T019 [US1] Verify existing providers (Theme, Auth, Sync) still work within new layout

**Checkpoint**: App works with `/en/` prefix - MVP complete with English default

---

## Phase 4: User Story 2 - German Language Switch (Priority: P2)

**Goal**: Users can switch the application language to German via a toggle in the header

**Independent Test**: Click language toggle → URL changes to `/de/...` → verify header shows "Inventar", "Ladungen", "Community"

### Implementation for User Story 2

- [x] T020 [US2] Create `components/layout/LanguageSwitcher.tsx` with locale toggle button (DR-005)
- [x] T021 [US2] Add LanguageSwitcher to `components/layout/SiteHeader.tsx` (before UserMenu)
- [x] T022 [US2] Import `useTranslations` hook in `components/layout/SiteHeader.tsx`
- [x] T023 [US2] Replace hardcoded navigation text with translation keys in SiteHeader
- [x] T024 [US2] Update `lib/constants/navigation.ts` to use translation keys instead of labels
- [x] T025 [US2] Replace `next/link` imports with `@/i18n/navigation` Link in SiteHeader

**Checkpoint**: Language switching works - users can toggle between EN/DE

---

## Phase 5: User Story 3 - Locale-Based URL Routing (Priority: P2)

**Goal**: Direct URL access (e.g., `/de/inventory`) works and language persists across navigation

**Independent Test**: Visit `/de/inventory` directly → page loads in German → click navigation → stays on `/de/...` paths

### Implementation for User Story 3

- [x] T026 [US3] Update `components/layout/MobileNav.tsx` to use locale-aware Link from `@/i18n/navigation`
- [x] T027 [US3] Update `components/layout/UserMenu.tsx` to use locale-aware Link
- [x] T028 [US3] Update any remaining Link imports in layout components to use `@/i18n/navigation`
- [x] T029 [US3] Verify middleware redirects unknown locales to default (FR-009)

**Checkpoint**: URL-based locale routing fully functional

---

## Phase 6: User Story 4 - Provider Integration (Priority: P3)

**Goal**: Authentication, data sync, and theme switching continue to work correctly after i18n integration

**Independent Test**: Log in → create/edit gear item → switch language → verify session and data persist

### Implementation for User Story 4

- [ ] T030 [US4] Test authentication flow with locale switching
- [ ] T031 [US4] Test data sync operations after language change
- [ ] T032 [US4] Verify theme preference persists across locale changes
- [ ] T033 [US4] Fix any provider issues discovered during testing

**Checkpoint**: All existing functionality works with i18n

---

## Phase 7: Polish & Validation

**Purpose**: Final verification and code quality

- [x] T034 [P] Run `npm run lint` - must pass with no errors
- [x] T035 [P] Run `npm run build` - must succeed
- [ ] T036 Manual test: Navigate to `/` → verify redirect to `/en/`
- [ ] T037 Manual test: Verify header shows translated text in both languages
- [ ] T038 Manual test: Verify language switcher toggles between EN/DE
- [ ] T039 Manual test: Verify direct URL access (e.g., `/de/loadouts`) works
- [ ] T040 Manual test: Verify locale persists during navigation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - install packages and create config first
- **Foundational (Phase 2)**: Depends on T005 (next.config update) - create translations and middleware
- **User Story 1 (Phase 3)**: Depends on Phase 2 - The Great Migration
- **User Story 2 (Phase 4)**: Depends on T016 (layout with NextIntlClientProvider)
- **User Story 3 (Phase 5)**: Depends on T020-T025 (LanguageSwitcher and translations)
- **User Story 4 (Phase 6)**: Depends on User Stories 1-3 complete
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P2)**: Can start after T016 completes - Builds on US1 foundation
- **User Story 3 (P2)**: Can start after US2 - Extends locale awareness to all links
- **User Story 4 (P3)**: Integration validation - Requires US1-3 complete

### Task Dependencies Within Phases

```
Phase 1:
T001 (install)
  ↓
T002, T003, T004 (parallel - different files)
  ↓
T005 (next.config depends on i18n files)

Phase 2:
T006 (en.json)
  ↓
T007 (de.json - can parallel with T006)
T008 (global.d.ts - depends on en.json for types)
T009 (middleware - depends on config)

Phase 3 (Migration):
T010 (create dir)
  ↓
T011, T012, T013, T014, T015 (parallel moves)
  ↓
T016 (layout - depends on all moves)
  ↓
T017, T018, T019 (sequential layout updates)

Phase 4-5:
T020 → T021 → T022 → T023 → T024 → T025 (mostly sequential, same files)
T026, T027, T028 (parallel - different components)
```

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different config files)
- T006 and T007 can run in parallel (translation files)
- T012, T013, T014, T015 can run in parallel (move different route folders)
- T026, T027, T028 can run in parallel (different component files)
- T034 and T035 can run in parallel (lint and build independent)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T009)
3. Complete Phase 3: User Story 1 (T010-T019)
4. **STOP and VALIDATE**: Test English default experience
5. If working, deploy - this is the MVP!

### Incremental Delivery

1. Setup + Foundational → i18n infrastructure ready
2. Add User Story 1 → App works with `/en/` prefix (MVP!)
3. Add User Story 2 → Language switching works
4. Add User Story 3 → Full locale-aware navigation
5. Add User Story 4 → Integration validated
6. Polish → Lint, build, manual tests

### Single Developer Flow

Since changes span multiple files but must be coordinated:
1. Complete T001-T009 (infrastructure)
2. Do migration T010-T019 in one session (to avoid broken state)
3. Add language switching T020-T025
4. Update remaining components T026-T029
5. Run validation T030-T040

---

## Notes

- All route moves must happen together to avoid broken imports
- Keep `app/globals.css` and `app/favicon.ico` at app/ level (not in [locale])
- The layout.tsx migration is critical - must wrap providers correctly
- Use `@/i18n/navigation` Link consistently after migration
- Middleware handles redirects for `/` and unknown locales
