# Tasks: App Shell & Branding

**Input**: Design documents from `/specs/003-app-shell-branding/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in spec - test tasks omitted.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create types/constants

- [x] T001 Install shadcn dropdown-menu component via `npx shadcn@latest add dropdown-menu`
- [x] T002 [P] Install shadcn avatar component via `npx shadcn@latest add avatar`
- [x] T003 Create navigation types file at types/navigation.ts with NavItem, UserMenuItem interfaces
- [x] T004 [P] Create navigation constants file at lib/constants/navigation.ts with MAIN_NAV_ITEMS, USER_MENU_ITEMS, FOOTER_LEGAL_LINKS, FOOTER_SOCIAL_LINKS
- [x] T005 [P] Create components/layout/ directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configure fonts and update root layout structure

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Add Rock Salt font import via next/font/google in app/layout.tsx
- [x] T007 Update app/layout.tsx to use flex column layout with min-h-screen wrapper
- [x] T008 Update app/layout.tsx to add flex-1 class to main content area

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Branded Header (Priority: P1) MVP

**Goal**: Users see a professional branded header with logo, title, and navigation on all pages

**Independent Test**: Navigate to any page → see sticky 64px header with Gearshack logo, Rock Salt branded title, centered navigation links, logo links to /

**Acceptance Criteria**:
- Sticky header fixed to top on all pages
- 64px height with white/translucent background
- Logo + "Gearshack" text in Rock Salt font linked to /
- Centered nav: Inventory (active), Loadouts (disabled), Community (disabled)

### Implementation for User Story 1

- [x] T009 [US1] Create SiteHeader component shell in components/layout/SiteHeader.tsx
- [x] T010 [US1] Add sticky header wrapper with 64px height and border-b in components/layout/SiteHeader.tsx
- [x] T011 [US1] Add logo image and "Gearshack" brand text with Rock Salt font in components/layout/SiteHeader.tsx
- [x] T012 [US1] Add Link wrapper around logo and brand text to / in components/layout/SiteHeader.tsx
- [x] T013 [US1] Add desktop navigation links (center) with enabled/disabled styling in components/layout/SiteHeader.tsx
- [x] T014 [US1] Import and render SiteHeader in app/layout.tsx

**Checkpoint**: User Story 1 complete - branded header visible on all pages

---

## Phase 4: User Story 2 - User Menu and Notifications (Priority: P1)

**Goal**: Users can access account actions via user menu and see notification indicator

**Independent Test**: Click user avatar → dropdown opens with Profile, Settings, Sign out. See notification bell with red badge.

**Acceptance Criteria**:
- Notification bell icon with red badge dot on right side
- User avatar that opens dropdown menu
- Menu items: Profile, Settings, Sign out

### Implementation for User Story 2

- [x] T015 [P] [US2] Create UserMenu component with Avatar and DropdownMenu in components/layout/UserMenu.tsx
- [x] T016 [US2] Add Profile, Settings, Sign out menu items to UserMenu in components/layout/UserMenu.tsx
- [x] T017 [US2] Add notification bell button with red badge dot to SiteHeader in components/layout/SiteHeader.tsx
- [x] T018 [US2] Integrate UserMenu component into SiteHeader (right side) in components/layout/SiteHeader.tsx

**Checkpoint**: User Stories 1 AND 2 complete - header fully functional with user menu

---

## Phase 5: User Story 3 - Mobile Navigation (Priority: P2)

**Goal**: Mobile users can access navigation through hamburger menu and slide-out sheet

**Independent Test**: On mobile viewport (< 768px), see hamburger icon → tap → slide-out sheet with nav links

**Acceptance Criteria**:
- Desktop nav hidden on mobile (< 768px)
- Hamburger menu icon visible on mobile
- Sheet slides from left with vertical nav links
- Nav links include enabled/disabled states

### Implementation for User Story 3

- [x] T019 [US3] Create MobileNav component with Sheet and navigation links in components/layout/MobileNav.tsx
- [x] T020 [US3] Add hamburger menu trigger button to SiteHeader (visible on mobile only) in components/layout/SiteHeader.tsx
- [x] T021 [US3] Add responsive classes to hide desktop nav on mobile in components/layout/SiteHeader.tsx
- [x] T022 [US3] Connect MobileNav Sheet trigger to hamburger button in components/layout/SiteHeader.tsx

**Checkpoint**: User Stories 1, 2, AND 3 complete - header works on all viewports

---

## Phase 6: User Story 4 - Professional Footer (Priority: P2)

**Goal**: Users see a dark-themed footer with branding, legal links, and social media

**Independent Test**: Scroll to bottom → see slate-900 footer with logo, tagline, legal links, social icons, copyright

**Acceptance Criteria**:
- Dark background (slate-900) with light text
- Brand column: Large logo + tagline
- Legal column: Impressum, Privacy, Terms links
- Social column: Instagram, Twitter/X icons
- Bottom: Copyright text

### Implementation for User Story 4

- [x] T023 [US4] Create SiteFooter component shell in components/layout/SiteFooter.tsx
- [x] T024 [US4] Add dark background with responsive 3-column grid in components/layout/SiteFooter.tsx
- [x] T025 [US4] Add brand column with logo image and tagline in components/layout/SiteFooter.tsx
- [x] T026 [US4] Add legal links column using FOOTER_LEGAL_LINKS in components/layout/SiteFooter.tsx
- [x] T027 [US4] Add social icons column using FOOTER_SOCIAL_LINKS in components/layout/SiteFooter.tsx
- [x] T028 [US4] Add copyright bar with "© 2025 Gearshack. Built with Vibe." in components/layout/SiteFooter.tsx
- [x] T029 [US4] Import and render SiteFooter in app/layout.tsx after main content

**Checkpoint**: User Stories 1-4 complete - full app shell ready

---

## Phase 7: User Story 5 - Branded Typography (Priority: P3)

**Goal**: Rock Salt font displays correctly on brand name and differentiates from UI text

**Independent Test**: View header → "Gearshack" in Rock Salt. View buttons/labels → standard sans-serif.

**Acceptance Criteria**:
- Rock Salt applied to header brand name
- Sans-serif (Geist) for all other UI text
- No font flash on load

### Implementation for User Story 5

- [x] T030 [US5] Add Rock Salt CSS variable to app/globals.css if needed
- [x] T031 [US5] Apply Rock Salt font class to brand text in SiteHeader in components/layout/SiteHeader.tsx
- [x] T032 [US5] Verify font loading with display: swap configured in app/layout.tsx

**Checkpoint**: All 5 user stories complete - full feature implemented

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [x] T033 [P] Add logo image fallback handling (alt text) in SiteHeader in components/layout/SiteHeader.tsx
- [x] T034 [P] Add logo image fallback handling in SiteFooter in components/layout/SiteFooter.tsx
- [x] T035 Review all components for accessibility (aria-labels, focus states)
- [x] T036 Run npm run lint and fix any errors
- [x] T037 Run npm run build and verify no TypeScript errors
- [x] T038 Validate against quickstart.md test scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
┌───────────────────────────────────────────────────────┐
│  Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3)       │
│                                                        │
│  Phase 6 (US4) can run in parallel with US2/US3       │
│                                                        │
│  Phase 7 (US5) depends on header from US1             │
└───────────────────────────────────────────────────────┘
    ↓
Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Header) | Phase 2 | Foundational complete |
| US2 (User Menu) | US1 | Header shell exists |
| US3 (Mobile Nav) | US1 | Header shell exists |
| US4 (Footer) | Phase 2 | Foundational complete (independent of header) |
| US5 (Typography) | US1 | Header exists to apply font |

### Parallel Opportunities by Phase

**Phase 1 (Setup)**:
```
T001, T002 can run in parallel (different shadcn components)
T003, T004, T005 can run in parallel (different files)
```

**Phase 4 (US2)**:
```
T015 can start in parallel with US1 (different component file)
```

**Phase 6 (US4)**:
```
Entire US4 phase can run in parallel with US2/US3 (different component)
```

**Phase 8 (Polish)**:
```
T033, T034 can run in parallel (different components)
```

---

## Parallel Example: Setup Phase

```bash
# Install shadcn components in parallel:
Task: "Install shadcn dropdown-menu component"
Task: "Install shadcn avatar component"

# Create files in parallel:
Task: "Create navigation types file at types/navigation.ts"
Task: "Create navigation constants file at lib/constants/navigation.ts"
Task: "Create components/layout/ directory structure"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T008)
3. Complete Phase 3: User Story 1 (T009-T014)
4. **STOP and VALIDATE**: Header visible on all pages with branding
5. Deploy/demo if ready

### Recommended Incremental Delivery

| Increment | Stories | What's Deliverable |
|-----------|---------|-------------------|
| MVP | US1 | Branded header with navigation |
| v0.2 | US1 + US2 | + User menu and notifications |
| v0.3 | US1-3 | + Mobile responsive navigation |
| v0.4 | US1-4 | + Professional footer |
| v1.0 | US1-5 | Complete app shell with branded typography |

### File Creation Order

```
1. types/navigation.ts
2. lib/constants/navigation.ts
3. components/layout/ (directory)
4. app/layout.tsx (update fonts + wrapper)
5. components/layout/SiteHeader.tsx
6. components/layout/UserMenu.tsx
7. components/layout/MobileNav.tsx
8. components/layout/SiteFooter.tsx
```

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after completion
- Constitution requires: stateless UI components, shadcn/ui, @/* imports
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- US4 (Footer) can be developed in parallel with US2/US3 since it's a separate component
