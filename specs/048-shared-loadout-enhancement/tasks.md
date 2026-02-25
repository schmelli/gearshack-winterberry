# Tasks: Shared Loadout Enhancement

**Input**: Design documents from `/specs/048-shared-loadout-enhancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Manual testing and TypeScript compiler validation (per spec)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/[locale]/`, `components/`, `hooks/`, `types/`, `actions/`, `lib/`
- Component directory: `components/shakedown/` for feature-scoped components

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations, type definitions, and shared utilities

- [ ] T001 Create Supabase migration to add `source_share_token` column to `gear_items` table
- [ ] T002 Create Supabase migration to create `notifications` table with RLS policies
- [ ] T003 Create Supabase migration for comment notification trigger function and trigger (verify `loadout_comments` table exists and accepts inserts first)
- [ ] T004 [P] Extend `SharedGearItem` interface with description and nobgImages fields in `types/sharing.ts`
- [ ] T005 [P] Add `SharedLoadoutOwner` interface in `types/sharing.ts`
- [ ] T006 [P] Add `SharedLoadoutWithOwner` interface in `types/sharing.ts`
- [ ] T007 [P] Create `Notification` type and `NotificationType` enum in `types/notifications.ts`
- [ ] T008 Create `getSharedLoadoutWithOwner` query function in `lib/supabase/queries/sharing.ts`
- [ ] T009 [P] Add i18n keys for SharedLoadout namespace in `messages/en.json`
- [ ] T010 [P] Add i18n keys for SharedLoadout namespace in `messages/de.json`

**Checkpoint**: Database and types ready. Component work can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and utilities required by multiple user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Create `normalizeForMatch` utility function in `lib/utils/matching.ts` for brand+name normalization
- [ ] T012 Create `useSharedLoadout` orchestration hook in `hooks/useSharedLoadout.ts` (fetches shared loadout with owner data)
- [ ] T013 Create `SharedGearGrid` component in `components/shakedown/SharedGearGrid.tsx` (category-grouped gear display)
- [ ] T014 Create `SharedGearCard` wrapper component in `components/shakedown/SharedGearCard.tsx` (wraps GearCard with indicators)
- [ ] T015 Modify `app/[locale]/shakedown/[token]/page.tsx` to add server-side auth detection

**Checkpoint**: Foundation ready - user story implementation can begin.

---

## Phase 3: User Story 1 - Anonymous Visitor Hero Experience (Priority: P1) 🎯 MVP

**Goal**: Anonymous visitors see a landing-style hero page with loadout info and owner avatar

**Independent Test**: Share a loadout URL, open in incognito, verify hero header with logo, loadout details, and owner avatar

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create `SharedLoadoutHero` component in `components/shakedown/SharedLoadoutHero.tsx` with app logo, loadout name, description, seasons, activity types
- [ ] T017 [P] [US1] Create `OwnerProfilePreview` component in `components/shakedown/OwnerProfilePreview.tsx` with avatar display and onClick handler prop
- [ ] T018 [US1] Create anonymous variant layout in `app/[locale]/shakedown/[token]/page.tsx` using `SharedLoadoutHero` (no standard nav)
- [ ] T019 [US1] Integrate `SharedGearGrid` into anonymous page variant with category sorting
- [ ] T020 [US1] Wire up `GearDetailModal` to open on gear card click in anonymous view

**Checkpoint**: Anonymous visitors see hero page with loadout details and gear cards with detail modals.

---

## Phase 4: User Story 2 - Anonymous Visitor Signup CTA (Priority: P1) 🎯 MVP

**Goal**: Anonymous visitors see prominent CTA to sign up and add loadout to their collection

**Independent Test**: Open shared URL logged out, verify CTA is visible above fold, click navigates to auth flow

### Implementation for User Story 2

- [ ] T021 [P] [US2] Create `SignupCTA` component in `components/shakedown/SignupCTA.tsx` with compelling messaging
- [ ] T022 [US2] Integrate `SignupCTA` into `SharedLoadoutHero` header area
- [ ] T023 [US2] Add localStorage handling to store `pendingImport` share token on CTA click
- [ ] T024 [US2] Create `importLoadoutToWishlist` server action in `actions/sharing.ts`
- [ ] T025 [US2] Add pending import check in app shell or dashboard (check localStorage after login)
- [ ] T026 [US2] Show toast notification after successful auto-import with item count

**Checkpoint**: Anonymous users can click CTA, sign up, and have loadout auto-imported to wishlist.

---

## Phase 5: User Story 3 - Premium Gear Cards with Detail Modals (Priority: P1) 🎯 MVP

**Goal**: Gear items display with same quality as main app, detail modals open on click

**Independent Test**: Open shared loadout, verify gear cards show images/brand/weight/category, click opens modal

### Implementation for User Story 3

- [ ] T027 [US3] Enhance `SharedGearCard` to render full GearCard with all visual features (images, brand, weight, category badges)
- [ ] T028 [US3] Ensure `GearDetailModal` receives complete item data from shared payload
- [ ] T029 [US3] Implement category grouping logic in `SharedGearGrid` with section headers
- [ ] T030 [US3] Add category sort order (alphabetical or predefined priority) to gear display

**Checkpoint**: Gear cards match app quality, detail modals work, items grouped by category.

---

## Phase 6: User Story 4 - Signed-In User In-App Experience (Priority: P2)

**Goal**: Signed-in users see shared loadout within normal app shell with standard navigation

**Independent Test**: Sign in, open shared loadout URL, verify standard app header is visible

### Implementation for User Story 4

- [ ] T031 [P] [US4] Create `SharedLoadoutAppView` component in `components/shakedown/SharedLoadoutAppView.tsx`
- [ ] T032 [US4] Modify `app/[locale]/shakedown/[token]/page.tsx` to render `SharedLoadoutAppView` for authenticated users
- [ ] T033 [US4] Include standard app navigation by rendering within existing layout structure
- [ ] T034 [US4] Integrate `OwnerProfilePreview` into authenticated view with messaging option

**Checkpoint**: Signed-in users see shared loadout integrated within app navigation.

---

## Phase 7: User Story 5 - Owned Items Indicator (Priority: P2)

**Goal**: Signed-in users see visual indicator on items they already own

**Independent Test**: Create shared loadout with items viewer owns, verify "Owned" badge appears

### Implementation for User Story 5

- [ ] T035 [P] [US5] Create `useOwnedItemsCheck` hook in `hooks/useOwnedItemsCheck.ts`
- [ ] T036 [US5] Add `isOwned` prop to `SharedGearCard` component
- [ ] T037 [US5] Display "Owned" badge overlay on `SharedGearCard` when item matches user inventory
- [ ] T038 [US5] Integrate `useOwnedItemsCheck` into `SharedLoadoutAppView` to calculate owned status

**Checkpoint**: Signed-in users can identify which items they already own at a glance.

---

## Phase 8: User Story 6 - Add to Wishlist Feature (Priority: P2)

**Goal**: Signed-in users can add unowned items to wishlist with single click

**Independent Test**: View shared loadout, click "Add to Wishlist" on unowned item, verify it appears in inventory

### Implementation for User Story 6

- [ ] T039 [P] [US6] Create `useWishlistActions` hook in `hooks/useWishlistActions.ts`
- [ ] T040 [P] [US6] Create `addItemToWishlist` server action in `actions/sharing.ts`
- [ ] T041 [US6] Add "Add to Wishlist" button to `SharedGearCard` for unowned items
- [ ] T042 [US6] Add `isOnWishlist` check using `useWishlistActions` hook
- [ ] T043 [US6] Show "On your wishlist" badge for items already added
- [ ] T044 [US6] Show toast confirmation after successful wishlist addition

**Checkpoint**: Users can add items to wishlist and see status change immediately.

---

## Phase 9: User Story 7 - Comment Notifications (Priority: P3)

**Goal**: Loadout owners receive notifications when comments are posted

**Independent Test**: Leave comment on shared loadout, check owner's notification feed

### Implementation for User Story 7

- [ ] T045 [P] [US7] Create `getUserNotifications` query function in `lib/supabase/queries/notifications.ts`
- [ ] T046 [P] [US7] Create `markNotificationRead` server action in `actions/notifications.ts`
- [ ] T047 [US7] Create `useNotifications` hook in `hooks/useNotifications.ts` with realtime subscription
- [ ] T048 [US7] Add notification indicator to app header (if not exists) showing unread count
- [ ] T049 [US7] Implement notification click handler to navigate to shared loadout

**Checkpoint**: Loadout owners see notifications when comments are posted, can navigate to loadout.

---

## Phase 10: User Story 8 - Owner Profile Access (Priority: P3)

**Goal**: Users can view loadout owner's profile by clicking avatar

**Independent Test**: Click owner avatar, verify profile modal opens with public info

### Implementation for User Story 8

- [ ] T050 [US8] Wire `OwnerProfilePreview` onClick to open `ProfileView` modal with owner data (OwnerProfileModal)
- [ ] T051 [US8] Integrate existing `ProfileView` component to display owner info
- [ ] T052 [US8] Add messaging option for signed-in users if owner privacy settings allow
- [ ] T053 [US8] Handle "Owner no longer available" case when owner_id is null

**Checkpoint**: Users can view owner profiles, contact them if permitted.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and refinements

- [ ] T054 [P] Create friendly 404 page for invalid/expired share tokens
- [ ] T055 [P] Add error toast for wishlist addition failures with retry option
- [ ] T056 Show "Great taste! You already own all these items" message when applicable
- [ ] T057 Update `LoadoutShareButton` to include extended fields in payload when creating shares
- [ ] T058 Run TypeScript compiler to validate all new code (`npx tsc`)
- [ ] T059 Run linter to ensure code quality (`npm run lint`)
- [ ] T060 Manual testing walkthrough per quickstart.md scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - P1 stories (US1, US2, US3) should be completed for MVP
  - P2 stories (US4, US5, US6) can proceed after P1 or in parallel
  - P3 stories (US7, US8) can proceed after P2 or in parallel
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - No dependencies on other stories
- **US2 (P1)**: Can start after Foundational - Shares hero layout with US1
- **US3 (P1)**: Can start after Foundational - Depends on SharedGearCard from Foundational
- **US4 (P2)**: Can start after Foundational - Independent from anonymous experience
- **US5 (P2)**: Can start after Foundational - Depends on authenticated view (US4 recommended first)
- **US6 (P2)**: Can start after Foundational - Requires owned items check (US5 recommended first)
- **US7 (P3)**: Can start after Foundational - Independent (notification infrastructure)
- **US8 (P3)**: Can start after Foundational - Extends OwnerProfilePreview from US1

### Within Each User Story

- Types and utilities before components
- Server actions before hooks that consume them
- Core components before integration
- Integration before polish/edge cases

### Parallel Opportunities

- T004, T005, T006, T007 can run in parallel (all type definitions)
- T009, T010 can run in parallel (i18n files)
- T016, T017 can run in parallel (different components)
- T021, T035, T039, T045, T046 can run in parallel (independent files)
- T054, T055 can run in parallel (error handling)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all type definitions together:
Task: "Extend SharedGearItem interface in types/sharing.ts"
Task: "Add SharedLoadoutOwner interface in types/sharing.ts"
Task: "Add SharedLoadoutWithOwner interface in types/sharing.ts"
Task: "Create Notification type in types/notifications.ts"

# Launch i18n files together:
Task: "Add i18n keys in messages/en.json"
Task: "Add i18n keys in messages/de.json"
```

---

## Parallel Example: User Story 1

```bash
# Launch components for US1 together:
Task: "Create SharedLoadoutHero component in components/shakedown/SharedLoadoutHero.tsx"
Task: "Create OwnerProfilePreview component in components/shakedown/OwnerProfilePreview.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only)

1. Complete Phase 1: Setup (migrations, types, i18n)
2. Complete Phase 2: Foundational (hooks, utilities, base components)
3. Complete Phase 3: User Story 1 - Hero Experience
4. Complete Phase 4: User Story 2 - Signup CTA
5. Complete Phase 5: User Story 3 - Premium Gear Cards
6. **STOP and VALIDATE**: Test anonymous experience end-to-end
7. Deploy/demo if ready - this is the MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US2 + US3 → Test anonymous flow → Deploy (MVP!)
3. Add US4 → Test authenticated view → Deploy
4. Add US5 + US6 → Test owned/wishlist features → Deploy
5. Add US7 → Test notifications → Deploy
6. Add US8 → Test profile access → Deploy
7. Polish phase → Final testing → Deploy

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 2 (anonymous experience)
   - Developer B: User Story 3 (gear cards)
   - Developer C: User Story 4 + 5 (authenticated experience)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP scope: Phase 1-5 (US1, US2, US3) = Anonymous visitor experience
