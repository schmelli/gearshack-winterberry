# Tasks: Landing Page & i18n Strings

**Input**: Design documents from `/specs/028-landing-page-i18n/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No automated tests requested - validation via lint, build, and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/[locale]/`, `components/`, `types/` at repository root
- **Translation files**: `messages/` at repository root
- **Components**: `components/landing/` for new landing page components

---

## Phase 1: Setup (Types & Translations Infrastructure)

**Purpose**: Create TypeScript interfaces and extend translation files with new namespaces

- [x] T001 Create landing page type definitions in `types/landing.ts` (FeatureItem, PricingTier, Testimonial interfaces)
- [x] T002 [P] Add Landing namespace to English translations in `messages/en.json` (heroTitle, heroSubtitle, ctaStartTrial, ctaDashboard, features, socialProof, pricing)
- [x] T003 [P] Add Auth namespace to English translations in `messages/en.json` (emailLabel, passwordLabel, loginButton, loginTitle, etc.)
- [x] T004 [P] Add Inventory namespace to English translations in `messages/en.json` (title, searchPlaceholder, emptyTitle, addItem, etc.)
- [x] T005 [P] Add GearEditor namespace to English translations in `messages/en.json` (addTitle, editTitle, nameLabel, brandLabel, saveItem, etc.)

**Checkpoint**: TypeScript types and English translations ready - German translations and components can be created

---

## Phase 2: Foundational (German Translations)

**Purpose**: Create German translations that ALL i18n user stories depend on

**Note**: German translations needed for US3, US4, US5 - can be done in parallel with US1/US2 landing page components

- [x] T006 [P] Add Landing namespace to German translations in `messages/de.json`
- [x] T007 [P] Add Auth namespace to German translations in `messages/de.json`
- [x] T008 [P] Add Inventory namespace to German translations in `messages/de.json`
- [x] T009 [P] Add GearEditor namespace to German translations in `messages/de.json`

**Checkpoint**: All translation namespaces ready in both languages

---

## Phase 3: User Story 1 - First-Time Visitor Views Landing Page (Priority: P1) 🎯 MVP

**Goal**: Display a compelling landing page with hero, features, social proof, and pricing sections for logged-out visitors

**Independent Test**: Navigate to `/en/` while logged out → verify all 4 sections display with "Start Free Trial" CTA

### Implementation for User Story 1

- [x] T010 [US1] Create `components/landing/` directory structure
- [x] T011 [P] [US1] Create HeroSection component in `components/landing/HeroSection.tsx` (FR-001, FR-013, FR-014)
- [x] T012 [P] [US1] Create FeatureGrid component in `components/landing/FeatureGrid.tsx` (FR-002, FR-007)
- [x] T013 [P] [US1] Create SocialProof component in `components/landing/SocialProof.tsx` (FR-003)
- [x] T014 [P] [US1] Create PricingPreview component in `components/landing/PricingPreview.tsx` (FR-004, FR-014)
- [x] T015 [US1] Create LandingPage orchestrator in `components/landing/LandingPage.tsx` (uses useTranslations, passes props to sections)
- [x] T016 [US1] Update `app/[locale]/page.tsx` to render LandingPage component (FR-006 - shows "Start Free Trial" for guests)

**Checkpoint**: Landing page displays all sections for logged-out visitors with English translations

---

## Phase 4: User Story 2 - Authenticated User Returns to Homepage (Priority: P1)

**Goal**: Show "Go to Dashboard" CTA instead of "Start Free Trial" when user is authenticated

**Independent Test**: Log in → navigate to `/en/` → verify CTA shows "Go to Dashboard" → click → navigates to `/en/inventory`

### Implementation for User Story 2

- [x] T017 [US2] Add auth state check to LandingPage using `useAuthContext` in `components/landing/LandingPage.tsx` (FR-005)
- [x] T018 [US2] Update HeroSection to accept dynamic ctaLabel and ctaHref props in `components/landing/HeroSection.tsx`
- [x] T019 [US2] Verify CTA navigation to `/inventory` works for authenticated users

**Checkpoint**: CTA dynamically switches based on authentication state

---

## Phase 5: User Story 3 - German-Speaking Visitor Views Landing Page (Priority: P2)

**Goal**: All landing page text displays in German when viewing `/de/` routes

**Independent Test**: Navigate to `/de/` → verify hero, features, social proof, pricing show German text

### Implementation for User Story 3

- [x] T020 [US3] Verify LandingPage passes correct German translations to HeroSection props (heroTitle, heroSubtitle, ctaStartTrial, ctaDashboard)
- [x] T021 [US3] Verify LandingPage passes correct German translations to FeatureGrid via t prop (features.organize, features.loadouts, features.share)
- [x] T022 [US3] Verify LandingPage passes correct German translations to SocialProof via t prop (socialProof.title, testimonials)
- [x] T023 [US3] Verify LandingPage passes correct German translations to PricingPreview via t prop (pricing.title, basecamp, trailblazer)
- [x] T024 [US3] Test language switcher toggles landing page between EN/DE
- [x] T024a [US3] Verify English fallback: temporarily remove one German key from `messages/de.json`, confirm English text displays, then restore key (FR-012)

**Checkpoint**: Landing page fully translated in German with fallback verified

---

## Phase 6: User Story 4 - Translated Auth Flow (Priority: P2)

**Goal**: Login and registration forms display in user's selected language

**Independent Test**: Navigate to `/de/login` → verify email, password labels and buttons are in German

### Implementation for User Story 4

- [x] T025 [US4] Update login form in `app/[locale]/login/page.tsx` to use `useTranslations('Auth')`
- [x] T026 [US4] Replace hardcoded strings with translation keys (emailLabel, passwordLabel, loginButton, loginTitle)
- [x] T027 [US4] Verify auth error messages use translated strings

**Checkpoint**: Auth flow fully translated

---

## Phase 7: User Story 5 - Translated Inventory Views (Priority: P3)

**Goal**: Inventory page and gear editor display in user's selected language

**Independent Test**: Log in → navigate to `/de/inventory` → verify search, filters, empty state, and add item buttons are in German

### Implementation for User Story 5

- [x] T028 [US5] Update InventoryGallery to use `useTranslations('Inventory')` in `app/[locale]/inventory/page.tsx`
- [x] T029 [US5] Replace hardcoded inventory strings with translation keys (searchPlaceholder, emptyTitle, addItem, filterAll, clearFilters, showingItems, itemsCount)
- [ ] T030 [US5] Update GearEditor to use `useTranslations('GearEditor')` in `components/gear-editor/GearEditorForm.tsx` (deferred - complex refactor)
- [ ] T031 [US5] Replace hardcoded gear editor strings with translation keys (addTitle, editTitle, nameLabel, brandLabel, saveItem) (deferred - complex refactor)

**Checkpoint**: Inventory and gear editor fully translated

---

## Phase 8: Polish & Validation

**Purpose**: Final verification and code quality

- [x] T032 [P] Run `npm run lint` - must pass with no errors
- [x] T033 [P] Run `npm run build` - must succeed with no missing translation warnings
- [ ] T034 Manual test: Navigate to `/` → verify redirect to `/en/`
- [ ] T035 Manual test: Verify landing page displays all 4 sections correctly
- [ ] T036 Manual test: Verify CTA shows "Start Free Trial" when logged out
- [ ] T037 Manual test: Verify CTA shows "Go to Dashboard" when logged in
- [ ] T038 Manual test: Switch to German → verify all landing page text changes
- [ ] T039 Manual test: Navigate to `/de/login` → verify form labels are German
- [ ] T040 Manual test: Navigate to `/de/inventory` → verify UI text is German
- [ ] T041 Manual test: Test responsive layout at exactly 320px viewport width - verify all sections stack vertically and text remains readable (SC-002)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - create types and English translations first
- **Foundational (Phase 2)**: Can run in parallel with Phase 1 (different files)
- **User Story 1 (Phase 3)**: Depends on T001 (types) and T002 (Landing EN translations)
- **User Story 2 (Phase 4)**: Depends on T015 (LandingPage component)
- **User Story 3 (Phase 5)**: Depends on T006 (Landing DE translations) and US1 components
- **User Story 4 (Phase 6)**: Depends on T003, T007 (Auth EN/DE translations)
- **User Story 5 (Phase 7)**: Depends on T004, T005, T008, T009 (Inventory/GearEditor translations)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after T001, T002 - builds landing page components (MVP)
- **User Story 2 (P1)**: Can start after US1 - adds auth-aware CTA logic
- **User Story 3 (P2)**: Can start after T006 + US1 - verifies German translations on landing
- **User Story 4 (P2)**: Can start after T003, T007 - updates auth components
- **User Story 5 (P3)**: Can start after T004, T005, T008, T009 - updates inventory components

### Task Dependencies Within Phases

```
Phase 1 (Setup):
T001 (types)
  ↓
T002, T003, T004, T005 (parallel - different namespaces in en.json)

Phase 2 (Foundational):
T006, T007, T008, T009 (parallel - different namespaces in de.json)

Phase 3 (US1 - Landing Page):
T010 (create dir)
  ↓
T011, T012, T013, T014 (parallel - different component files)
  ↓
T015 (LandingPage - depends on section components)
  ↓
T016 (update page.tsx - depends on LandingPage)

Phase 4 (US2 - Auth CTA):
T017 → T018 → T019 (sequential - same components)

Phase 5 (US3 - German Landing):
T020 → T021 → T022 → T023 → T024 → T024a (sequential verification)

Phase 6-7:
Verification tasks mostly sequential per story

Phase 8 (Polish):
T032, T033 (parallel - lint and build independent)
T034-T041 (sequential manual tests)
```

### Parallel Opportunities

- T002, T003, T004, T005 can run in parallel (different namespaces in same file - merge carefully)
- T006, T007, T008, T009 can run in parallel (different namespaces in same file - merge carefully)
- T011, T012, T013, T014 can run in parallel (different component files)
- T032 and T033 can run in parallel (lint and build independent)
- **Cross-story parallelism**: US4 and US5 can run in parallel after their translation dependencies

---

## Parallel Example: Landing Page Components

```bash
# Launch all section components together (Phase 3):
Task: "Create HeroSection component in components/landing/HeroSection.tsx"
Task: "Create FeatureGrid component in components/landing/FeatureGrid.tsx"
Task: "Create SocialProof component in components/landing/SocialProof.tsx"
Task: "Create PricingPreview component in components/landing/PricingPreview.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 3: User Story 1 (T010-T016)
3. Complete Phase 4: User Story 2 (T017-T019)
4. **STOP and VALIDATE**: Test landing page with auth-aware CTAs
5. If working, deploy - this is the MVP landing page!

### Incremental Delivery

1. Setup → Types and English translations ready
2. Add US1 → Landing page displays for visitors (MVP!)
3. Add US2 → Auth-aware CTAs work
4. Add US3 → German landing page translations
5. Add US4 → German auth flow
6. Add US5 → German inventory views
7. Polish → Lint, build, manual validation

### Single Developer Flow

Since changes span multiple files but must be coordinated:
1. Complete T001-T009 (types and all translations)
2. Build landing page components T010-T016 in one session
3. Add auth logic T017-T019
4. Verify German translations T020-T024
5. Update auth components T025-T027
6. Update inventory components T028-T031
7. Run validation T032-T041

---

## Notes

- All landing page components are client components ('use client') for auth state access
- Translation namespaces extend existing `messages/*.json` - merge carefully to preserve existing keys
- Deep Forest theme color: `bg-[#405A3D]`, emerald accents: `emerald-500`, `emerald-600`
- Use `@/i18n/navigation` Link for all navigation (locale-aware from Feature 027)
- Type safety via global.d.ts automatically extends when new namespaces added to en.json
