# Tasks: VIP Loadouts (Feature 052)

**Input**: Design documents from `/specs/052-vip-loadouts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vip-api.yaml
**Branch**: `052-vip-loadouts`

**Tests**: Not explicitly requested in specification. Tests are omitted.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Paths relative to repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize VIP feature structure and shared dependencies

- [x] T001 Create VIP types and Zod schemas in types/vip.ts
- [x] T002 [P] Create VIP translation keys in messages/en/vip.json
- [x] T003 [P] Create VIP translation keys in messages/de/vip.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create migration 20251229_001_create_vip_accounts.sql in supabase/migrations/
- [x] T005 Create migration 20251229_002_create_vip_loadouts.sql in supabase/migrations/
- [x] T006 Create migration 20251229_003_create_vip_loadout_items.sql in supabase/migrations/
- [x] T007 Create migration 20251229_004_create_vip_follows.sql in supabase/migrations/
- [x] T008 Create migration 20251229_005_create_vip_bookmarks.sql in supabase/migrations/
- [x] T009 Create migration 20251229_006_create_claim_invitations.sql in supabase/migrations/
- [x] T010 Create migration 20251229_007_create_vip_functions.sql in supabase/migrations/
- [x] T011 Create migration 20251229_008_create_vip_rls_policies.sql in supabase/migrations/
- [x] T012 Create migration 20251229_009_create_vip_indexes.sql in supabase/migrations/
- [ ] T013 Run migrations and verify schema with npx supabase db push
- [x] T014 [P] Create VIP service layer with Supabase queries in lib/vip/vip-service.ts
- [x] T015 [P] Create source URL validator utility in lib/vip/source-url-validator.ts
- [x] T016 [P] Create VIP notification helpers in lib/vip/vip-notifications.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Discover and Browse VIP Loadouts (Priority: P1) MVP

**Goal**: Users can discover and browse VIP profiles and loadouts on the Community page

**Independent Test**: Navigate to Community page, view Featured VIPs section, click on VIP profile, browse loadouts with source attribution

### Implementation for User Story 1

- [ ] T017 [P] [US1] Create useVipProfile hook in hooks/vip/useVipProfile.ts
- [ ] T018 [P] [US1] Create useVipLoadout hook in hooks/vip/useVipLoadout.ts
- [ ] T019 [P] [US1] Create useFeaturedVips hook in hooks/vip/useFeaturedVips.ts
- [ ] T020 [P] [US1] Create VipProfileCard component in components/vip/VipProfileCard.tsx
- [ ] T021 [P] [US1] Create VipProfileHeader component in components/vip/VipProfileHeader.tsx
- [ ] T022 [P] [US1] Create VipLoadoutCard component in components/vip/VipLoadoutCard.tsx
- [ ] T023 [P] [US1] Create VipLoadoutDetail component in components/vip/VipLoadoutDetail.tsx
- [ ] T024 [P] [US1] Create VipSourceAttribution component in components/vip/VipSourceAttribution.tsx
- [ ] T025 [P] [US1] Create FeaturedVipsSection component in components/vip/FeaturedVipsSection.tsx
- [ ] T026 [US1] Create API route GET /api/vip in app/api/vip/route.ts
- [ ] T027 [US1] Create API route GET /api/vip/[slug] in app/api/vip/[slug]/route.ts
- [ ] T028 [US1] Create API route GET /api/vip/[slug]/loadouts in app/api/vip/[slug]/loadouts/route.ts
- [ ] T029 [US1] Create API route GET /api/vip/[slug]/loadouts/[loadoutSlug] in app/api/vip/[slug]/loadouts/[loadoutSlug]/route.ts
- [ ] T030 [US1] Create VIP profile page in app/[locale]/vip/[slug]/page.tsx
- [ ] T031 [US1] Create VIP loadout detail page in app/[locale]/vip/[slug]/[loadout-slug]/page.tsx
- [ ] T032 [US1] Update Community page to include FeaturedVipsSection in app/[locale]/community/page.tsx

**Checkpoint**: User Story 1 complete - VIP discovery and browsing functional

---

## Phase 4: User Story 4 - Admin Creates VIP Account and Loadouts (Priority: P1) MVP

**Goal**: Admins can create and manage VIP accounts and loadouts via admin dashboard

**Independent Test**: Admin navigates to VIP Management, creates VIP account, creates loadout with gear items, publishes loadout

### Implementation for User Story 4

- [ ] T033 [P] [US4] Create useAdminVips hook in hooks/admin/vip/useAdminVips.ts
- [ ] T034 [P] [US4] Create useAdminVipLoadouts hook in hooks/admin/vip/useAdminVipLoadouts.ts
- [ ] T035 [P] [US4] Create VipForm component in components/admin/vip/VipForm.tsx
- [ ] T036 [P] [US4] Create VipLoadoutForm component in components/admin/vip/VipLoadoutForm.tsx
- [ ] T037 [P] [US4] Create VipLoadoutItemPicker component in components/admin/vip/VipLoadoutItemPicker.tsx
- [ ] T038 [P] [US4] Create VipManagementTable component in components/admin/vip/VipManagementTable.tsx
- [ ] T039 [US4] Create admin API route GET/POST /api/admin/vip in app/api/admin/vip/route.ts
- [ ] T040 [US4] Create admin API route GET/PATCH/DELETE /api/admin/vip/[id] in app/api/admin/vip/[id]/route.ts
- [ ] T041 [US4] Create admin API route GET/POST /api/admin/vip/[id]/loadouts in app/api/admin/vip/[id]/loadouts/route.ts
- [ ] T042 [US4] Create admin API route PATCH/DELETE /api/admin/vip/[id]/loadouts/[loadoutId] in app/api/admin/vip/[id]/loadouts/[loadoutId]/route.ts
- [ ] T043 [US4] Create admin API route POST /api/admin/vip/[id]/loadouts/[loadoutId]/publish in app/api/admin/vip/[id]/loadouts/[loadoutId]/publish/route.ts
- [ ] T044 [US4] Create admin VIP management page in app/[locale]/admin/vip/page.tsx
- [ ] T045 [US4] Create admin VIP edit page in app/[locale]/admin/vip/[id]/page.tsx
- [ ] T046 [US4] Create admin loadout creation page in app/[locale]/admin/vip/loadouts/new/page.tsx
- [ ] T047 [US4] Create admin loadout edit page in app/[locale]/admin/vip/loadouts/[id]/page.tsx
- [ ] T048 [US4] Add VIP Management link to admin sidebar navigation

**Checkpoint**: User Story 4 complete - Admin can create and manage VIP content

---

## Phase 5: User Story 2 - Follow VIP and Receive Updates (Priority: P2)

**Goal**: Users can follow VIPs and receive notifications when new loadouts are published

**Independent Test**: Logged-in user follows VIP, follower count increments, user receives notification when admin publishes new loadout

### Implementation for User Story 2

- [ ] T049 [P] [US2] Create useVipFollow hook with optimistic updates in hooks/vip/useVipFollow.ts
- [ ] T050 [US2] Create VipFollowButton component in components/vip/VipFollowButton.tsx
- [ ] T051 [US2] Create API route POST/DELETE /api/vip/follow in app/api/vip/follow/route.ts
- [ ] T052 [US2] Integrate VipFollowButton into VipProfileHeader component
- [ ] T053 [US2] Add notification type 'vip_new_loadout' to notification system
- [ ] T054 [US2] Update publish API to trigger notify_vip_followers function

**Checkpoint**: User Story 2 complete - Following and notifications functional

---

## Phase 6: User Story 3 - Copy VIP Loadout as Template (Priority: P2)

**Goal**: Users can copy VIP loadouts to their account as wishlist templates

**Independent Test**: Logged-in user clicks Copy on VIP loadout, confirms in modal, new loadout created with items as wishlist status

### Implementation for User Story 3

- [ ] T055 [P] [US3] Create useCopyVipLoadout hook in hooks/vip/useCopyVipLoadout.ts
- [ ] T056 [US3] Create CopyToLoadoutModal component in components/vip/CopyToLoadoutModal.tsx
- [ ] T057 [US3] Create API route POST /api/vip/loadouts/copy in app/api/vip/loadouts/copy/route.ts
- [ ] T058 [US3] Integrate CopyToLoadoutModal into VipLoadoutDetail component
- [ ] T059 [US3] Add source_vip_loadout_id column to user loadouts table (migration)

**Checkpoint**: User Story 3 complete - Users can copy VIP loadouts

---

## Phase 7: User Story 7 - Search and Filter VIPs (Priority: P2)

**Goal**: Users can search VIPs by name, trip type, and keywords

**Independent Test**: User enters search query on Community page, matching VIPs displayed with highlights

### Implementation for User Story 7

- [ ] T060 [P] [US7] Create useVipSearch hook in hooks/vip/useVipSearch.ts
- [ ] T061 [US7] Create VipSearchInput component in components/vip/VipSearchInput.tsx
- [ ] T062 [US7] Create VipSearchResults component in components/vip/VipSearchResults.tsx
- [ ] T063 [US7] Update GET /api/vip to support q parameter for search
- [ ] T064 [US7] Integrate VipSearchInput into Community page VIP section

**Checkpoint**: User Story 7 complete - VIP search functional

---

## Phase 8: User Story 5 - Compare User Loadout to VIP Loadout (Priority: P3)

**Goal**: Users can compare their loadouts side-by-side with VIP loadouts

**Independent Test**: User opens their loadout, clicks Compare to VIP, selects VIP loadout, sees weight differences and category breakdown

### Implementation for User Story 5

- [ ] T065 [P] [US5] Create useVipComparison hook in hooks/vip/useVipComparison.ts
- [ ] T066 [US5] Create VipComparisonView component in components/vip/VipComparisonView.tsx
- [ ] T067 [US5] Create VipLoadoutSelector component in components/vip/VipLoadoutSelector.tsx
- [ ] T068 [US5] Create comparison page in app/[locale]/vip/compare/page.tsx
- [ ] T069 [US5] Add "Compare to VIP" button to user loadout detail page

**Checkpoint**: User Story 5 complete - Loadout comparison functional

---

## Phase 9: User Story 8 - Bookmark VIP Loadouts (Priority: P3)

**Goal**: Users can bookmark VIP loadouts for future reference

**Independent Test**: User clicks bookmark icon on VIP loadout, icon changes state, loadout appears in saved section

### Implementation for User Story 8

- [ ] T070 [P] [US8] Create useVipBookmark hook with optimistic updates in hooks/vip/useVipBookmark.ts
- [ ] T071 [US8] Create VipBookmarkButton component in components/vip/VipBookmarkButton.tsx
- [ ] T072 [US8] Create API route POST/DELETE /api/vip/bookmark in app/api/vip/bookmark/route.ts
- [ ] T073 [US8] Integrate VipBookmarkButton into VipLoadoutCard and VipLoadoutDetail
- [ ] T074 [US8] Create saved loadouts section in user profile page

**Checkpoint**: User Story 8 complete - Bookmarking functional

---

## Phase 10: User Story 6 - VIP Claims Account (Priority: P3)

**Goal**: VIPs can claim their curated accounts via invitation flow

**Independent Test**: Admin sends claim invitation, VIP receives email, verifies identity, account status changes to 'claimed'

### Implementation for User Story 6

- [ ] T075 [P] [US6] Create useVipClaimInvitation hook in hooks/admin/vip/useVipClaimInvitation.ts
- [ ] T076 [US6] Create ClaimInvitationForm component in components/admin/vip/ClaimInvitationForm.tsx
- [ ] T077 [US6] Create VipClaimPage for claim flow in app/[locale]/vip/claim/[token]/page.tsx
- [ ] T078 [US6] Create API route POST /api/admin/vip/[id]/invite in app/api/admin/vip/[id]/invite/route.ts
- [ ] T079 [US6] Create API route POST /api/vip/claim/[token] for claim verification in app/api/vip/claim/[token]/route.ts
- [ ] T080 [US6] Add notification type 'vip_claimed' to notification system
- [ ] T081 [US6] Add claim invitation management UI to admin VIP edit page

**Checkpoint**: User Story 6 complete - VIP claiming functional

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

- [ ] T082 [P] Add SEO metadata to VIP profile pages (generateMetadata)
- [ ] T083 [P] Add SEO metadata to VIP loadout pages (generateMetadata)
- [ ] T084 [P] Add OpenGraph and Twitter card metadata for social sharing
- [ ] T085 Add loading states (Suspense boundaries) for VIP pages
- [ ] T086 Add error boundaries for VIP pages
- [ ] T087 Implement responsive design for mobile VIP views
- [ ] T088 Run quickstart.md validation scenarios
- [ ] T089 Performance optimization: Add caching for VIP queries
- [ ] T090 Accessibility audit for VIP components (ARIA labels, keyboard nav)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **US1 + US4 (Phases 3-4)**: P1 priority - can run in parallel after Foundational
- **US2, US3, US7 (Phases 5-7)**: P2 priority - can run after US1 UI exists
- **US5, US8, US6 (Phases 8-10)**: P3 priority - can run after earlier stories
- **Polish (Phase 11)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Run With |
|-------|------------|--------------|
| US1 (Discover) | Foundational | US4 |
| US4 (Admin) | Foundational | US1 |
| US2 (Follow) | US1 components | US3, US7 |
| US3 (Copy) | US1 components | US2, US7 |
| US7 (Search) | US1 components | US2, US3 |
| US5 (Compare) | US1, US4 | US8, US6 |
| US8 (Bookmark) | US1 components | US5, US6 |
| US6 (Claim) | US4 admin UI | US5, US8 |

### Within Each User Story

- Hooks before components
- Components before API routes
- API routes before pages
- Pages before integration

### Parallel Opportunities

All tasks within a phase marked [P] can run in parallel:

- T002, T003 (translations)
- T014, T015, T016 (service layer)
- T017, T018, T019, T020, T021, T022, T023, T024, T025 (US1 hooks & components)
- T033, T034, T035, T036, T037, T038 (US4 hooks & components)

---

## Parallel Example: User Story 1

```bash
# Launch all hooks for US1 together:
Task: "Create useVipProfile hook in hooks/vip/useVipProfile.ts"
Task: "Create useVipLoadout hook in hooks/vip/useVipLoadout.ts"
Task: "Create useFeaturedVips hook in hooks/vip/useFeaturedVips.ts"

# Launch all components for US1 together:
Task: "Create VipProfileCard component in components/vip/VipProfileCard.tsx"
Task: "Create VipProfileHeader component in components/vip/VipProfileHeader.tsx"
Task: "Create VipLoadoutCard component in components/vip/VipLoadoutCard.tsx"
Task: "Create VipLoadoutDetail component in components/vip/VipLoadoutDetail.tsx"
Task: "Create VipSourceAttribution component in components/vip/VipSourceAttribution.tsx"
Task: "Create FeaturedVipsSection component in components/vip/FeaturedVipsSection.tsx"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Discover)
4. Complete Phase 4: User Story 4 (Admin)
5. **STOP and VALIDATE**: Test both P1 stories
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational Foundation ready
2. US1 + US4 MVP: Discovery + Admin curation
3. US2 + US3 + US7 P2: Follow, Copy, Search
4. US5 + US8 + US6 P3: Compare, Bookmark, Claim
5. Polish SEO, performance, accessibility

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Discovery)
   - Developer B: User Story 4 (Admin)
3. After US1 UI exists:
   - Developer A: User Story 2 (Follow) + User Story 3 (Copy)
   - Developer B: User Story 7 (Search)
4. P3 stories can be distributed as capacity allows

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 90 |
| Setup Tasks | 3 |
| Foundational Tasks | 13 |
| US1 Tasks | 16 |
| US4 Tasks | 16 |
| US2 Tasks | 6 |
| US3 Tasks | 5 |
| US7 Tasks | 5 |
| US5 Tasks | 5 |
| US8 Tasks | 5 |
| US6 Tasks | 7 |
| Polish Tasks | 9 |
| Parallel Opportunities | 35 tasks marked [P] |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story
- Each user story independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP = Phase 1-4 (Setup + Foundational + US1 + US4)
