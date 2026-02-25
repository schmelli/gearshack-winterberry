# Tasks: Community Shakedowns

**Input**: Design documents from `/specs/001-community-shakedowns/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- All file paths are relative to repository root

---

## Phase 1: Setup (Database & Types)

**Purpose**: Database schema and TypeScript types foundation

- [x] T001 Create Supabase migration for enum types (shakedown_privacy, shakedown_status, experience_level, shakedown_badge) in `supabase/migrations/20251229200001_shakedown_enums.sql`
- [x] T002 Create Supabase migration for `shakedowns` table with indexes in `supabase/migrations/20251229200002_shakedowns_table.sql`
- [x] T003 Create Supabase migration for `shakedown_feedback` table with self-referential replies in `supabase/migrations/20251229200003_shakedown_feedback.sql`
- [x] T004 [P] Create Supabase migration for `shakedown_helpful_votes` table in `supabase/migrations/20251229200004_helpful_votes.sql`
- [x] T005 [P] Create Supabase migration for `shakedown_bookmarks` table in `supabase/migrations/20251229200005_bookmarks.sql`
- [x] T006 [P] Create Supabase migration for `shakedown_badges` table in `supabase/migrations/20251229200006_badges.sql`
- [x] T007 Create Supabase migration for profile reputation columns (shakedown_helpful_received, shakedowns_reviewed, shakedowns_created) in `supabase/migrations/20251229200007_profile_reputation.sql`
- [x] T008 Create Supabase migration for views (v_shakedowns_feed, v_shakedown_feedback_with_author) in `supabase/migrations/20251229200008_shakedown_views.sql`
- [x] T009 Create Supabase migration for RLS policies on all shakedown tables in `supabase/migrations/20251229200009_shakedown_rls.sql`
- [x] T010 Create Supabase migration for triggers (feedback count, helpful count, badge award) in `supabase/migrations/20251229200010_shakedown_triggers.sql`
- [x] T011 Create TypeScript types file with all shakedown interfaces, enums, and constants in `types/shakedown.ts`
- [x] T012 Create shakedown utility functions (buildFeedbackTree, canEditFeedback, formatShakedownDate) in `lib/shakedown-utils.ts`

---

## Phase 2: Foundational (Hooks Index & i18n)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T013 Create hooks index file with re-exports in `hooks/shakedowns/index.ts`
- [x] T014 [P] Add shakedowns i18n keys (title, create, tripName, dates, experienceLevel, concerns, privacy, status, feedback, errors) to `messages/en.json`
- [x] T015 [P] Add shakedowns i18n keys to `messages/de.json`
- [x] T016 Create base Zod schemas for shakedown validation (createShakedownSchema, updateShakedownSchema, createFeedbackSchema) in `lib/shakedown-schemas.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Request a Community Shakedown (Priority: P1) 🎯 MVP

**Goal**: Users can create shakedown requests from existing loadouts with trip context and privacy settings

**Independent Test**: Create a shakedown from a mock loadout and verify it appears in the feed, accessible via shareable URL

### Implementation for User Story 1

- [x] T017 [US1] Implement useShakedownMutations hook with createShakedown, updateShakedown, deleteShakedown functions in `hooks/shakedowns/useShakedownMutations.ts`
- [x] T018 [US1] Create POST /api/shakedowns route for creating shakedowns with Zod validation in `app/api/shakedowns/route.ts`
- [x] T019 [P] [US1] Create ShakedownCreator component with form (trip name, dates, experience, concerns, privacy) in `components/shakedowns/ShakedownCreator.tsx`
- [x] T020 [P] [US1] Create StatusBadge component showing Open/Completed/Archived status in `components/shakedowns/StatusBadge.tsx`
- [x] T021 [US1] Create shakedown creation page with loadout selector in `app/[locale]/community/shakedowns/new/page.tsx`
- [x] T022 [US1] Add "Request Community Shakedown" button to loadout detail page (integrate with existing loadout UI)

**Checkpoint**: Users can create shakedowns from their loadouts with full trip context

---

## Phase 4: User Story 2 - Browse and Provide General Feedback (Priority: P1)

**Goal**: Users can browse shakedowns feed and provide general feedback on loadouts

**Independent Test**: Browse the feed, open a shakedown, and submit general feedback that appears in the feedback section

### Implementation for User Story 2

- [x] T023 [US2] Implement useShakedowns hook with cursor-based pagination (20 items), sort options (recent, popular, unanswered) in `hooks/shakedowns/useShakedowns.ts`
- [x] T024 [US2] Implement useShakedown hook for fetching single shakedown with loadout and feedback tree in `hooks/shakedowns/useShakedown.ts`
- [x] T025 [US2] Implement useFeedback hook with createFeedback, updateFeedback, deleteFeedback, reportFeedback in `hooks/shakedowns/useFeedback.ts`
- [x] T026 [US2] Create GET /api/shakedowns route for listing with pagination, sorting in `app/api/shakedowns/route.ts` (extend T018)
- [x] T027 [US2] Create GET /api/shakedowns/[id] route for detail view in `app/api/shakedowns/[id]/route.ts`
- [x] T028 [US2] Create POST /api/shakedowns/feedback route for adding feedback in `app/api/shakedowns/feedback/route.ts`
- [x] T029 [P] [US2] Create ShakedownCard component for feed display (trip name, dates, author, feedback count) in `components/shakedowns/ShakedownCard.tsx`
- [x] T030 [P] [US2] Create ShakedownFeed component with infinite scroll using IntersectionObserver in `components/shakedowns/ShakedownFeed.tsx`
- [x] T031 [P] [US2] Create FeedbackItem component with author, timestamp, markdown content in `components/shakedowns/FeedbackItem.tsx`
- [x] T032 [US2] Create FeedbackSection component with feedback list and composer in `components/shakedowns/FeedbackSection.tsx`
- [x] T033 [US2] Create ShakedownDetail component combining loadout view and feedback section in `components/shakedowns/ShakedownDetail.tsx`
- [x] T034 [US2] Create shakedowns feed page with navigation link in `app/[locale]/community/shakedowns/page.tsx`
- [x] T035 [US2] Create shakedown detail page in `app/[locale]/community/shakedowns/[id]/page.tsx`
- [x] T036 [US2] Add Community Shakedowns link to main navigation (extend existing nav component)

**Checkpoint**: Users can browse shakedowns and provide general feedback

---

## Phase 5: User Story 3 - Provide Item-Specific Feedback (Priority: P2)

**Goal**: Users can comment on specific gear items in the loadout with nested replies (max 3 levels)

**Independent Test**: Click on a loadout item and post a comment that appears attached to that item

### Implementation for User Story 3

- [x] T037 [US3] Extend useFeedback hook to support gearItemId for item-specific feedback in `hooks/shakedowns/useFeedback.ts`
- [x] T038 [US3] Update POST /api/shakedowns/feedback to validate gearItemId belongs to shakedown's loadout in `app/api/shakedowns/feedback/route.ts`
- [x] T039 [P] [US3] Create ItemFeedbackModal component for item-specific comments in `components/shakedowns/ItemFeedbackModal.tsx`
- [x] T040 [US3] Update FeedbackItem to support nested replies with depth tracking and max 3 levels in `components/shakedowns/FeedbackItem.tsx`
- [x] T041 [US3] Add click handler to gear items in ShakedownDetail to open ItemFeedbackModal in `components/shakedowns/ShakedownDetail.tsx`

**Checkpoint**: Users can provide item-specific feedback with nested discussions

---

## Phase 6: User Story 4 - Iterate Based on Feedback (Priority: P2)

**Goal**: Requesters can update loadouts, reply to feedback, and mark feedback as helpful

**Independent Test**: Update a loadout linked to a shakedown and verify changes reflect; mark feedback as helpful

### Implementation for User Story 4

- [x] T042 [US4] Implement useHelpfulVotes hook with markAsHelpful, removeHelpful, getUserVotes in `hooks/shakedowns/useHelpfulVotes.ts`
- [x] T043 [US4] Create POST /api/shakedowns/helpful route for marking feedback as helpful in `app/api/shakedowns/helpful/route.ts`
- [x] T044 [US4] Create DELETE /api/shakedowns/helpful route for removing helpful vote in `app/api/shakedowns/helpful/route.ts` (extend T043)
- [x] T045 [US4] Create PATCH /api/shakedowns/feedback/[id] route for editing feedback within 30-min window in `app/api/shakedowns/feedback/[id]/route.ts`
- [x] T046 [P] [US4] Create HelpfulButton component with optimistic update and badge notification in `components/shakedowns/HelpfulButton.tsx`
- [x] T047 [US4] Add "Update Loadout" link in ShakedownDetail for owner to edit linked loadout in `components/shakedowns/ShakedownDetail.tsx`
- [x] T048 [US4] Implement useShakedownNotifications hook for Realtime subscriptions (new feedback, helpful votes) in `hooks/shakedowns/useShakedownNotifications.ts`
- [x] T049 [US4] Add Realtime notification for loadout changes during active feedback session in `hooks/shakedowns/useShakedownNotifications.ts`

**Checkpoint**: Requesters can iterate on feedback and reward helpful reviewers

---

## Phase 7: User Story 5 - Complete a Shakedown (Priority: P2)

**Goal**: Requesters can mark shakedowns complete, thanking contributors; completed shakedowns become read-only

**Independent Test**: Mark a shakedown complete and verify no new feedback can be added

### Implementation for User Story 5

- [x] T050 [US5] Add completeShakedown and reopenShakedown to useShakedownMutations hook in `hooks/shakedowns/useShakedownMutations.ts`
- [x] T051 [US5] Create POST /api/shakedowns/[id]/complete route with batch helpful marking in `app/api/shakedowns/[id]/complete/route.ts`
- [x] T052 [US5] Create POST /api/shakedowns/[id]/reopen route (only before archive) in `app/api/shakedowns/[id]/reopen/route.ts`
- [x] T053 [P] [US5] Create CompletionModal component for thanking helpers and marking feedback helpful in `components/shakedowns/CompletionModal.tsx`
- [x] T054 [US5] Add "Mark as Complete" button in ShakedownDetail for owner with confirmation in `components/shakedowns/ShakedownDetail.tsx`
- [x] T055 [US5] Disable feedback composer when shakedown status is 'completed' or 'archived' in `components/shakedowns/FeedbackSection.tsx`
- [x] T056 [US5] Add Supabase pg_cron job for 90-day archival of completed shakedowns in `supabase/migrations/[timestamp]_011_archival_cron.sql`

**Checkpoint**: Shakedown lifecycle (Open → Complete → Archived) is fully functional

---

## Phase 8: User Story 6 - Discover Shakedowns for Learning (Priority: P3)

**Goal**: Users can filter completed shakedowns, search by keywords, and bookmark for reference

**Independent Test**: Filter completed shakedowns by trip type and bookmark one for reference

### Implementation for User Story 6

- [x] T057 [US6] Implement useShakedownFilters hook with Zustand store for filter state in `hooks/shakedowns/useShakedownFilters.ts`
- [x] T058 [US6] Implement useBookmarks hook with bookmark, unbookmark, getBookmarks in `hooks/shakedowns/useBookmarks.ts`
- [x] T059 [US6] Update GET /api/shakedowns to support filtering by tripType, season, experienceLevel, status, search in `app/api/shakedowns/route.ts`
- [x] T060 [US6] Create GET /api/shakedowns/bookmarks route for user's bookmarked shakedowns in `app/api/shakedowns/bookmarks/route.ts`
- [x] T061 [US6] Create POST /api/shakedowns/bookmarks route for bookmarking in `app/api/shakedowns/bookmarks/route.ts` (extend T060)
- [x] T062 [US6] Create DELETE /api/shakedowns/bookmarks/[id] route for unbookmarking in `app/api/shakedowns/bookmarks/[id]/route.ts`
- [x] T063 [P] [US6] Create ShakedownFilters component with filter dropdowns and search input in `components/shakedowns/ShakedownFilters.tsx`
- [x] T064 [P] [US6] Create BookmarkButton component with toggle and note support in `components/shakedowns/BookmarkButton.tsx`
- [x] T065 [US6] Add filters UI to ShakedownFeed page header in `app/[locale]/community/shakedowns/page.tsx`
- [x] T066 [US6] Add "Start Similar Shakedown" button in completed shakedown detail in `components/shakedowns/ShakedownDetail.tsx`

**Checkpoint**: Users can discover and bookmark shakedowns for learning

---

## Phase 9: User Story 7 - Build Expert Reputation (Priority: P3)

**Goal**: Active reviewers earn badges and appear in Community Experts section

**Independent Test**: Accumulate helpful votes and verify badge awards and profile updates

### Implementation for User Story 7

- [x] T067 [US7] Implement useBadges hook to fetch user's earned badges in `hooks/shakedowns/useBadges.ts`
- [x] T068 [US7] Create GET /api/shakedowns/experts route for top contributors (50+ helpful votes) in `app/api/shakedowns/experts/route.ts`
- [x] T069 [P] [US7] Create ExpertBadge component displaying badge type with icon in `components/shakedowns/ExpertBadge.tsx`
- [x] T070 [P] [US7] Create ExpertsSection component showing top community experts in `components/shakedowns/ExpertsSection.tsx`
- [x] T071 [US7] Add "Shakedowns Reviewed" count and badges to user profile page (extend existing profile component)
- [x] T072 [US7] Add notification trigger for badge awards in `app/api/shakedowns/helpful/route.ts`

**Checkpoint**: Reputation system rewards active reviewers with badges and recognition

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T073 [P] Add friend prioritization to feed (friendsFirst sort option) using friendships table in `hooks/shakedowns/useShakedowns.ts`
- [x] T074 [P] Create POST /api/shakedowns/feedback/[id]/report route for spam reporting with soft-hide in `app/api/shakedowns/feedback/[id]/report/route.ts`
- [x] T075 Add share to Bulletin Board functionality in ShakedownCreator confirmation step in `components/shakedowns/ShakedownCreator.tsx`
- [x] T076 Create DELETE /api/shakedowns/[id] route for soft-delete in `app/api/shakedowns/[id]/route.ts`
- [x] T077 Create PATCH /api/shakedowns/[id] route for owner updates in `app/api/shakedowns/[id]/route.ts` (extend T076)
- [x] T078 Add notification triggers for new feedback (FR-028) and thread replies (FR-029) in notification system
- [ ] T079 Run `flutter analyze` equivalent: `npm run lint && npm run build` to verify no errors
- [ ] T080 Verify all acceptance scenarios from spec.md work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - creates database foundation
- **Foundational (Phase 2)**: Depends on Phase 1 - creates hooks infrastructure
- **User Stories (Phase 3-9)**: All depend on Phase 2 completion
  - P1 stories (US1, US2) are MVP - implement first
  - P2 stories (US3, US4, US5) add iteration and completion
  - P3 stories (US6, US7) add discovery and gamification
- **Polish (Phase 10)**: Depends on core stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 - Extends US1 API routes
- **US3 (P2)**: Depends on US2 (feedback system) - Adds item-specific layer
- **US4 (P2)**: Depends on US2 (feedback system) - Adds helpful votes
- **US5 (P2)**: Depends on US2 (shakedown detail) - Adds completion flow
- **US6 (P3)**: Depends on US2 (feed) - Adds filters and bookmarks
- **US7 (P3)**: Depends on US4 (helpful votes) - Adds badges

### Parallel Opportunities

**Phase 1 (Setup)**: T004, T005, T006 can run in parallel (independent tables)

**Phase 2 (Foundational)**: T014, T015 can run in parallel (different locale files)

**US1**: T019, T020 can run in parallel (different components)

**US2**: T029, T030, T031 can run in parallel (different components)

**US3**: T039 can run in parallel with other tasks (isolated modal)

**US4**: T046 can run in parallel (isolated component)

**US5**: T053 can run in parallel (isolated modal)

**US6**: T063, T064 can run in parallel (different components)

**US7**: T069, T070 can run in parallel (different components)

**Phase 10**: T073, T074 can run in parallel (independent features)

---

## Parallel Example: User Story 2

```bash
# Launch all US2 components together:
Task: "Create ShakedownCard component in components/shakedowns/ShakedownCard.tsx"
Task: "Create ShakedownFeed component in components/shakedowns/ShakedownFeed.tsx"
Task: "Create FeedbackItem component in components/shakedowns/FeedbackItem.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (database)
2. Complete Phase 2: Foundational (hooks, i18n)
3. Complete Phase 3: User Story 1 (create shakedowns)
4. Complete Phase 4: User Story 2 (browse and feedback)
5. **STOP and VALIDATE**: Test creating shakedown and adding feedback
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Database and infrastructure ready
2. Add US1 + US2 → Test core flow → Deploy (MVP!)
3. Add US3 (item feedback) → Test → Deploy
4. Add US4 (iteration) → Test → Deploy
5. Add US5 (completion) → Test → Deploy
6. Add US6 (discovery) → Test → Deploy
7. Add US7 (reputation) → Test → Deploy
8. Polish phase → Final testing → Release

### Suggested MVP Scope

**Phase 1-4 (US1 + US2)**: Creates the core experience
- Users can create shakedowns from loadouts
- Users can browse and provide general feedback
- ~35 tasks total for MVP

---

## Notes

- All file paths follow existing project structure (plan.md)
- Hooks follow patterns from `hooks/bulletin/` and `hooks/social/`
- Components follow patterns from `components/bulletin/`
- RLS policies enforce privacy (public, friends_only, private)
- Tests not included (not requested in spec)
- [P] tasks = different files, no dependencies
- Commit after each task or logical group
