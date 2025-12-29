# Tasks: Community Bulletin Board

**Input**: Design documents from `/specs/051-community-bulletin-board/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), contracts/ (complete)

**Tests**: OPTIONAL per project configuration - not explicitly requested in spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, and directory structure

- [x] T001 [P] Create TypeScript types in `types/bulletin.ts` (BulletinPost, BulletinReply, BulletinReport, PostTag, LinkedContentType, ReportReason, all input/response types from contracts/bulletin-api.md)
- [x] T002 [P] Create Zod validation schemas in `lib/validations/bulletin.ts` (createPostSchema, updatePostSchema, createReplySchema, createReportSchema)
- [x] T003 [P] Create English i18n strings in `messages/en/bulletin.json` (all UI labels, errors, placeholders, empty states)
- [x] T004 [P] Create German i18n strings in `messages/de/bulletin.json` (translations matching en/bulletin.json)
- [x] T005 Create directory structure: `components/bulletin/`, `hooks/bulletin/`, `lib/supabase/bulletin-queries.ts`

**Checkpoint**: Types, validation, and i18n ready - proceed to database setup

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS policies, and Supabase query layer that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

### Database Migrations

- [x] T006 Create migration `supabase/migrations/YYYYMMDD_create_bulletin_enums.sql` (post_tag, linked_content_type, report_reason, report_status, moderation_action enums)
- [x] T007 Create migration `supabase/migrations/YYYYMMDD_create_bulletin_posts.sql` (bulletin_posts table with all columns, indexes, constraints per data-model.md)
- [x] T008 Create migration `supabase/migrations/YYYYMMDD_create_bulletin_replies.sql` (bulletin_replies table with FK to posts, depth constraint per data-model.md)
- [x] T009 Create migration `supabase/migrations/YYYYMMDD_create_bulletin_reports.sql` (bulletin_reports table with unique constraint per user/target)
- [x] T010 Create migration `supabase/migrations/YYYYMMDD_create_bulletin_bans.sql` (user_bulletin_bans table)
- [x] T011 Create migration `supabase/migrations/YYYYMMDD_create_bulletin_functions.sql` (update_bulletin_reply_count, check_bulletin_rate_limit, check_duplicate_bulletin_post, archive_old_bulletin_posts functions)
- [x] T012 Create migration `supabase/migrations/YYYYMMDD_create_bulletin_rls.sql` (all RLS policies from data-model.md)
- [x] T013 Create migration `supabase/migrations/YYYYMMDD_create_bulletin_views.sql` (v_bulletin_posts_with_author, v_bulletin_reports_for_mods views)

### Supabase Query Layer

- [x] T014 Implement `fetchBulletinPosts` in `lib/supabase/bulletin-queries.ts` (paginated fetch with cursor, tag filter, search)
- [x] T015 [P] Implement `fetchBulletinPost` in `lib/supabase/bulletin-queries.ts` (single post by ID, includes archived)
- [x] T016 [P] Implement `createBulletinPost` in `lib/supabase/bulletin-queries.ts` (with rate limit and duplicate checks)
- [x] T017 [P] Implement `updateBulletinPost` in `lib/supabase/bulletin-queries.ts`
- [x] T018 [P] Implement `deleteBulletinPost` in `lib/supabase/bulletin-queries.ts` (soft delete)
- [x] T019 [P] Implement `fetchBulletinReplies` in `lib/supabase/bulletin-queries.ts` (with author join)
- [x] T020 [P] Implement `createBulletinReply` in `lib/supabase/bulletin-queries.ts` (with rate limit, depth calculation)
- [x] T021 [P] Implement `createBulletinReport` in `lib/supabase/bulletin-queries.ts` (with duplicate check)
- [x] T022 [P] Implement `searchBulletinPosts` in `lib/supabase/bulletin-queries.ts` (full-text search)

### Core Hooks

- [x] T023 Create `hooks/bulletin/useBulletinBoard.ts` (main board state, pagination, loading states, error handling)
- [x] T024 [P] Create `hooks/bulletin/usePosts.ts` (post CRUD operations with optimistic updates)
- [x] T025 [P] Create `hooks/bulletin/useReplies.ts` (reply CRUD with tree construction for nesting)
- [x] T026 Create `hooks/bulletin/index.ts` (barrel export for all bulletin hooks)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Post a Quick Question (Priority: P1)

**Goal**: Users can create posts up to 500 chars with optional category tags and view them immediately

**Independent Test**: Create a post with content and tag, verify it appears at top of board within 2 seconds

### Implementation for User Story 1

- [x] T027 [P] [US1] Create `components/bulletin/PostComposer.tsx` (modal/form with character counter, tag selector, Ctrl+Enter submit)
- [x] T028 [P] [US1] Create `components/bulletin/PostCard.tsx` (single post display with author avatar, name, timestamp, tag badge, content, reply count)
- [x] T029 [P] [US1] Create `components/bulletin/TagFilter.tsx` (category tag chips for Question, Shakedown, Trade, Trip Planning, Gear Advice, Other)
- [x] T030 [US1] Create `components/bulletin/BulletinBoard.tsx` (main board container, header with "New Post" button, post list)
- [x] T031 [US1] Create `app/[locale]/community/page.tsx` (bulletin board main page with BulletinBoard component)
- [x] T032 [US1] Create `components/bulletin/PostMenu.tsx` (three-dot dropdown with Edit/Delete options, 15-min edit window logic)
- [x] T033 [US1] Add optimistic updates to `usePosts.ts` for post creation (immediate UI update, rollback on error)
- [x] T034 [US1] Implement character counter in PostComposer (red at 450+, block at 500)
- [x] T035 [US1] Add toast notifications via Sonner for post creation success/error

**Checkpoint**: User Story 1 complete - users can create and view posts with tags

---

## Phase 4: User Story 2 - Browse and Reply to Posts (Priority: P1)

**Goal**: Users can browse posts with infinite scroll and reply to any post

**Independent Test**: Load board, scroll to bottom, verify more posts load; click post, submit reply, verify it appears immediately

### Implementation for User Story 2

- [x] T036 [US2] Implement infinite scroll in `BulletinBoard.tsx` (IntersectionObserver, load 20 more on scroll)
- [x] T037 [US2] Create `components/bulletin/ReplyThread.tsx` (reply list with 2-level nesting, client-side tree construction)
- [x] T038 [US2] Create `components/bulletin/ReplyComposer.tsx` (reply input with markdown preview, Ctrl+Enter submit)
- [x] T039 [US2] Add reply expansion to `PostCard.tsx` (click to expand/collapse replies)
- [x] T040 [US2] Implement notification trigger in `createBulletinReply` (first 3 replies notify post author)
- [ ] T041 [US2] Add markdown rendering in `ReplyThread.tsx` using react-markdown (bold, italic, links only)
- [x] T042 [US2] Add reply count update in PostCard (real-time increment on new reply)

**Checkpoint**: User Stories 1 AND 2 complete - core posting and replying functional

---

## Phase 5: User Story 3 - Filter Posts by Category (Priority: P2)

**Goal**: Users can filter posts by tag and search by keyword

**Independent Test**: Select "Trip Planning" filter, verify only matching posts appear; search keyword, verify results

### Implementation for User Story 3

- [x] T043 [US3] Create `hooks/bulletin/usePostSearch.ts` (search query state, debounced search, filter state) - integrated into useBulletinBoard
- [x] T044 [US3] Create `components/bulletin/SearchBar.tsx` (keyword search input with debounce)
- [x] T045 [US3] Integrate TagFilter with usePostSearch (active filter state, clear filter)
- [x] T046 [US3] Update BulletinBoard to use usePostSearch (combine tag filter + keyword search)
- [ ] T047 [US3] Add loading skeleton during search/filter operations
- [ ] T048 [US3] Add "no results" empty state for searches with no matches

**Checkpoint**: User Story 3 complete - filtering and search functional

---

## Phase 6: User Story 4 - Share Loadout/Shakedown to Board (Priority: P2)

**Goal**: Users can share loadouts/shakedowns to board with link preview

**Independent Test**: Click "Share to Community" on loadout, verify pre-filled post with preview appears

### Implementation for User Story 4

- [ ] T049 [P] [US4] Create `components/bulletin/LinkedContentPreview.tsx` (card preview with thumbnail, title, stats for loadout/shakedown)
- [ ] T050 [US4] Add linked content support to PostComposer (linked_content_type, linked_content_id props)
- [ ] T051 [US4] Update PostCard to render LinkedContentPreview when linked content exists
- [ ] T052 [US4] Create "Share to Community" integration point for loadout pages (prefill PostComposer with loadout data)
- [ ] T053 [US4] Fetch linked content preview data (loadout title, base weight, item count, thumbnail)

**Checkpoint**: User Story 4 complete - content sharing functional

---

## Phase 7: User Story 5 - Report Inappropriate Content (Priority: P2)

**Goal**: Users can report posts/replies with predefined reasons

**Independent Test**: Click report on post, select reason, submit, verify confirmation toast

### Implementation for User Story 5

- [x] T054 [US5] Create `hooks/bulletin/useReports.ts` (report submission, duplicate check) - integrated into bulletin-queries.ts
- [x] T055 [US5] Create `components/bulletin/ReportModal.tsx` (Dialog with reason selection: Spam, Harassment, Off-topic, Other)
- [x] T056 [US5] Add "Report Post" option to PostMenu dropdown
- [ ] T057 [US5] Add "Report Reply" option to reply context menu
- [x] T058 [US5] Show toast confirmation on report submission
- [x] T059 [US5] Handle duplicate report error (show "You already reported this")

**Checkpoint**: User Story 5 complete - user reporting functional

---

## Phase 8: User Story 6 - Moderator Review Workflow (Priority: P3)

**Goal**: Moderators can review reported posts and take action

**Independent Test**: Login as moderator, view reports sorted by count, delete post, verify removal

### Implementation for User Story 6

- [ ] T060 [US6] Create `hooks/bulletin/useModerationReports.ts` (fetch pending reports, resolve actions)
- [ ] T061 [US6] Create moderation view component (report list sorted by report_count, post preview)
- [ ] T062 [US6] Implement moderator actions: delete content, warn user, ban 1d/7d/permanent, dismiss
- [ ] T063 [US6] Add moderator role check (extend existing auth/profile system)
- [ ] T064 [US6] Implement ban enforcement in post/reply creation (check user_bulletin_bans)
- [ ] T065 [US6] Add report escalation indicator for high-priority (>5 reports)

**Checkpoint**: User Story 6 complete - moderation workflow functional

---

## Phase 9: User Story 7 - Delete Own Post (Priority: P3)

**Goal**: Users can delete their own posts with proper handling for posts with replies

**Independent Test**: Create post, delete it (no replies) - verify removed; create post with replies, delete - verify "[Deleted]" placeholder

### Implementation for User Story 7

- [ ] T066 [US7] Implement delete logic in PostMenu (soft delete via usePosts)
- [ ] T067 [US7] Add confirmation dialog before delete
- [ ] T068 [US7] Update PostCard to render "[Post deleted by user]" for deleted posts with replies
- [ ] T069 [US7] Implement reply delete in ReplyThread (same soft delete pattern)
- [ ] T070 [US7] Disable reply button on deleted posts

**Checkpoint**: User Story 7 complete - all user stories implemented

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Empty states, direct links, archival, and final polish

- [x] T071 [P] Create `components/bulletin/EmptyState.tsx` ("Be the first to post!" CTA when board is empty)
- [ ] T072 Create `app/[locale]/community/post/[postId]/page.tsx` (direct post link page, ignores archive status)
- [ ] T073 [P] Add rate limit error handling in PostComposer (show limit message, reset time)
- [ ] T074 [P] Add duplicate post error handling (show "You already posted this")
- [ ] T075 Implement 90-day soft archival (scheduled job or manual trigger for archive_old_bulletin_posts)
- [x] T076 Add loading states and error boundaries to BulletinBoard
- [ ] T077 Run quickstart.md verification checklist
- [ ] T078 Final i18n review for all bulletin strings (en/de completeness)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 + US2 (P1): Can proceed in parallel after Phase 2
  - US3-US5 (P2): Can proceed after Phase 2 (or after US1/US2 for integration points)
  - US6-US7 (P3): Can proceed after Phase 2
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational - standalone posting
- **User Story 2 (P1)**: After Foundational - can work in parallel with US1, integrates with PostCard
- **User Story 3 (P2)**: After Foundational - integrates with BulletinBoard from US1
- **User Story 4 (P2)**: After Foundational - integrates with PostComposer from US1
- **User Story 5 (P2)**: After Foundational - integrates with PostMenu from US1
- **User Story 6 (P3)**: After Foundational - standalone moderator workflow
- **User Story 7 (P3)**: After Foundational - integrates with PostMenu from US1

### Within Each User Story

- Hooks before components that use them
- Base components before container components
- Core implementation before integration with other stories
- Optimistic updates after basic CRUD works

### Parallel Opportunities

- All Setup tasks (T001-T004) can run in parallel
- All query implementations (T014-T022) marked [P] can run in parallel after migrations
- Hooks T024-T025 can run in parallel
- Components T027-T029 can run in parallel (different files)
- Different user stories can be worked on by different team members after Phase 2

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (posting)
4. Complete Phase 4: User Story 2 (browsing + replies)
5. **STOP and VALIDATE**: Test posting and replying independently
6. Deploy/demo if ready - this is a functional bulletin board!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Core MVP (posting + replying)
3. Add US3 → Filtering and search
4. Add US4 → Loadout sharing
5. Add US5 + US6 → Reporting and moderation
6. Add US7 → User content management
7. Add Polish → Production-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Total: 78 tasks across 10 phases
- Priority order: P1 (US1, US2) → P2 (US3, US4, US5) → P3 (US6, US7) → Polish
- All components use shadcn/ui (Card, Button, Dialog, Sheet, Avatar, Badge)
- All styling via Tailwind CSS 4 only
- All i18n via next-intl (en/de)
