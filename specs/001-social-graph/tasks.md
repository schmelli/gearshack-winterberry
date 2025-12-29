# Tasks: Social Graph (Friends + Follow System)

**Input**: Design documents from `/specs/001-social-graph/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not explicitly requested - test tasks are NOT included. Add tests as needed during implementation.

**Organization**: Tasks are grouped by user story (7 stories: 2 P1, 3 P2, 2 P3) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- Exact file paths included in descriptions

## Path Conventions

- **Types**: `types/social.ts`
- **Hooks**: `hooks/social/*.ts`
- **Components**: `components/social/*.tsx`
- **Pages**: `app/[locale]/{friends,following,settings/privacy}/page.tsx`
- **Queries**: `lib/supabase/social-queries.ts`
- **Migrations**: `supabase/migrations/YYYYMMDD_*.sql`
- **i18n**: `messages/{en,de}/social.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, and directory structure

- [x] T001 Create types/social.ts with all TypeScript types from data-model.md
- [x] T002 Create hooks/social/index.ts re-export barrel file
- [x] T003 [P] Create components/social directory structure
- [x] T004 [P] Add i18n messages for social features in messages/en/social.json
- [x] T005 [P] Add i18n messages for social features in messages/de/social.json

---

## Phase 2: Foundational (Database & Core Queries)

**Purpose**: Database schema and core query infrastructure - MUST complete before ANY user story

**⚠️ CRITICAL**: All database migrations and core queries must be ready before UI/hook implementation

### Database Migrations

- [x] T006 Create supabase/migrations/YYYYMMDD_create_social_enums.sql with friend_request_status, activity_type, activity_visibility, privacy_preset, account_type enums
- [x] T007 Create supabase/migrations/YYYYMMDD_create_friend_requests.sql table with indexes and RLS policies
- [x] T008 Create supabase/migrations/YYYYMMDD_create_friendships.sql table with canonical ordering constraint and RLS
- [x] T009 Create supabase/migrations/YYYYMMDD_create_user_follows.sql table (migrate from user_friends) with RLS
- [x] T010 Create supabase/migrations/YYYYMMDD_create_friend_activities.sql table with Realtime enabled
- [x] T011 Create supabase/migrations/YYYYMMDD_update_profiles_social.sql adding privacy_preset, follower_count, account_type columns
- [x] T012 Create supabase/migrations/YYYYMMDD_update_notifications_types.sql adding new notification types
- [x] T013 Create supabase/migrations/YYYYMMDD_create_social_rpc_functions.sql with all RPC functions from data-model.md

### Core Query Layer

- [x] T014 Create lib/supabase/social-queries.ts with base query helpers
- [x] T015 Implement fetchFollowing() and fetchFollowers() in lib/supabase/social-queries.ts
- [x] T016 Implement fetchFriendRequests() in lib/supabase/social-queries.ts
- [x] T017 Implement fetchFriends() and fetchMutualFriends() in lib/supabase/social-queries.ts
- [x] T018 Implement fetchFriendActivities() in lib/supabase/social-queries.ts
- [x] T019 Implement fetchSocialPrivacySettings() and updateSocialPrivacySettings() in lib/supabase/social-queries.ts

**Checkpoint**: Database ready, query layer complete - user story implementation can begin

---

## Phase 3: User Story 1 - Follow a Community Member (Priority: P1) 🎯 MVP

**Goal**: Enable users to follow/unfollow accounts with one click, no approval needed

**Independent Test**: Follow a VIP account, verify following list updates, unfollow and verify removal

### Implementation for User Story 1

- [x] T020 [P] [US1] Create useFollowing hook in hooks/social/useFollowing.ts with follow/unfollow/isFollowing
- [x] T021 [P] [US1] Create useFollowers hook in hooks/social/useFollowers.ts for VIP follower count
- [x] T022 [US1] Create FollowButton component in components/social/FollowButton.tsx with Follow/Following toggle states
- [x] T023 [US1] Create FollowingList component in components/social/FollowingList.tsx with pagination
- [x] T024 [US1] Create EmptyStateCard component in components/social/EmptyStateCard.tsx for empty following list
- [x] T025 [US1] Create following page in app/[locale]/following/page.tsx
- [x] T026 [US1] Integrate FollowButton into existing user profile pages (via UserProfileCard component)

**Checkpoint**: User Story 1 complete - following system fully functional and testable

---

## Phase 4: User Story 2 - Send and Accept Friend Requests (Priority: P1)

**Goal**: Enable friend request flow requiring prior message exchange, rate limited to 20/day

**Independent Test**: Message a user, send friend request, have recipient accept, verify "Friends" badge on both profiles

### Implementation for User Story 2

- [x] T027 [P] [US2] Create useFriendRequests hook in hooks/social/useFriendRequests.ts with send/accept/decline/cancel
- [x] T028 [US2] Implement canSendRequest() check in useFriendRequests using has_message_exchange RPC
- [x] T029 [US2] Create FriendRequestButton component in components/social/FriendRequestButton.tsx with Add Friend/Pending/Friends states
- [x] T030 [US2] Create FriendRequestNotification component in components/social/FriendRequestNotification.tsx for notification list
- [x] T031 [US2] Integrate FriendRequestButton into existing user profile pages (via UserProfileCard component)
- [x] T032 [US2] Add friend request notifications to existing notification system (via FriendRequestNotification)
- [x] T033 [US2] Handle edge case: user tries to send request when they have pending incoming request (shows Accept button)

**Checkpoint**: User Story 2 complete - friend request flow fully functional

---

## Phase 5: User Story 3 - View Friends List and Activity Feed (Priority: P2)

**Goal**: Display friends list with search/filter/sort and real-time activity feed from friends

**Independent Test**: Have at least one friend, verify they appear in friends list, create activity and verify it appears in friend's feed

### Implementation for User Story 3

- [x] T034 [P] [US3] Create useFriendships hook in hooks/social/useFriendships.ts with friends list and unfriend
- [x] T035 [P] [US3] Create useFriendActivity hook in hooks/social/useFriendActivity.ts with Realtime subscription
- [x] T036 [US3] Create FriendsList component in components/social/FriendsList.tsx with search/filter/sort
- [x] T037 [US3] Create FriendActivityFeed component in components/social/FriendActivityFeed.tsx with activity cards
- [x] T038 [US3] Create activity card variants for different activity types (new_loadout, marketplace_listing, friend_added)
- [x] T039 [US3] Create friends page in app/[locale]/friends/page.tsx with tabs for friends/requests
- [x] T040 [US3] Implement "Mark all as read" functionality for activity feed (stub in useFriendActivity)
- [x] T041 [US3] Add activity type filter to FriendActivityFeed component (filter param in useFriendActivity)

**Checkpoint**: User Story 3 complete - friends list and activity feed functional

---

## Phase 6: User Story 4 - Manage Online Status and Presence (Priority: P2)

**Goal**: Show real-time online/away/offline status for friends with 5-minute timeout

**Independent Test**: Set status to "Away", verify friends see updated indicator; go inactive 5+ minutes, verify "Last active" shows

### Implementation for User Story 4

- [x] T042 [US4] Create useOnlineStatus hook in hooks/social/useOnlineStatus.ts extending existing usePresenceStatus
- [x] T043 [US4] Implement 5-minute inactivity timeout logic in useOnlineStatus
- [x] T044 [US4] Implement graceful degradation with cached "Last active" and "updating..." indicator
- [x] T045 [US4] Create OnlineStatusIndicator component in components/social/OnlineStatusIndicator.tsx (green dot/away/offline)
- [x] T046 [US4] Integrate OnlineStatusIndicator into FriendsList and FriendActivityFeed components
- [x] T047 [US4] Add status controls (Online/Away/Invisible) to user settings or profile dropdown

**Checkpoint**: User Story 4 complete - presence system functional with graceful degradation

---

## Phase 7: User Story 5 - Configure Privacy Settings (Priority: P2)

**Goal**: Provide privacy presets (Only Me, Friends Only, Everyone) with granular overrides

**Independent Test**: Select "Friends Only" preset, verify non-friend cannot see friends-only content

### Implementation for User Story 5

- [x] T048 [US5] Create useSocialPrivacy hook in hooks/social/useSocialPrivacy.ts with preset and granular controls
- [x] T049 [US5] Create PrivacySettingsPanel component in components/social/PrivacySettingsPanel.tsx with preset cards
- [x] T050 [US5] Implement granular per-category privacy toggles (online_status, activity_feed, loadouts)
- [x] T051 [US5] Create or extend privacy settings page at app/[locale]/settings/privacy/page.tsx
- [x] T052 [US5] Implement immediate effect on privacy change (no save button)
- [x] T053 [US5] Update existing content components to respect privacy settings

**Checkpoint**: User Story 5 complete - privacy controls functional

---

## Phase 8: User Story 6 - See Mutual Friends (Priority: P3)

**Goal**: Display mutual friend count and list when viewing another user's profile

**Independent Test**: View profile of user with shared friends, verify "[N] mutual friends" displays with correct count

### Implementation for User Story 6

- [x] T054 [US6] Create useMutualFriends hook in hooks/social/useMutualFriends.ts using get_mutual_friends RPC
- [x] T055 [US6] Create MutualFriendsDisplay component in components/social/MutualFriendsDisplay.tsx with expandable list
- [x] T056 [US6] Integrate MutualFriendsDisplay into user profile pages
- [x] T057 [US6] Handle case where no mutual friends exist (hide section)

**Checkpoint**: User Story 6 complete - mutual friends display functional

---

## Phase 9: User Story 7 - Unfriend a Connection (Priority: P3)

**Goal**: Allow users to remove friends with confirmation, silent removal (no notification)

**Independent Test**: Unfriend someone, verify confirmation dialog, verify they're removed from list and lose access to friends-only content

### Implementation for User Story 7

- [x] T058 [US7] Add unfriend() method to useFriendships hook in hooks/social/useFriendships.ts
- [x] T059 [US7] Create UnfriendConfirmDialog component in components/social/UnfriendConfirmDialog.tsx
- [x] T060 [US7] Add unfriend action to FriendsList items
- [x] T061 [US7] Ensure unfriend is silent (no notification to unfriended user)
- [x] T062 [US7] Verify friends-only content is hidden after unfriending

**Checkpoint**: User Story 7 complete - unfriend functionality complete

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, edge cases, and cleanup

- [x] T063 [P] Add friend limit enforcement (max 1,000 friends) with clear error message
- [x] T064 [P] Handle 30-day friend request expiration via cleanup cron job
- [x] T065 [P] Add loading skeletons to all social components
- [x] T066 Implement activity feed limit (50 most recent) with "load more" pagination
- [x] T067 Add error boundaries and retry logic for Realtime subscription failures
- [x] T068 [P] Performance optimization: Add indexes for common queries if needed
- [x] T069 [P] Accessibility audit: Ensure all components have proper ARIA labels and keyboard navigation
- [x] T070 Run quickstart.md validation to verify setup instructions work
- [x] T071 Update CLAUDE.md with final implementation notes

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────────────────────────┐
                                                    │
Phase 2: Foundational (Database + Queries) ◄────────┘
    ⚠️ BLOCKS ALL USER STORIES                      │
                                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                    USER STORIES (can run in parallel)             │
├───────────────────────────────────────────────────────────────────┤
│ Phase 3: US1 - Following (P1) 🎯 MVP                              │
│ Phase 4: US2 - Friend Requests (P1)                               │
│ Phase 5: US3 - Friends List & Activity (P2)                       │
│ Phase 6: US4 - Online Presence (P2)                               │
│ Phase 7: US5 - Privacy Settings (P2)                              │
│ Phase 8: US6 - Mutual Friends (P3)                                │
│ Phase 9: US7 - Unfriend (P3)                                      │
└───────────────────────────────────────────────────────────────────┘
                                                    │
Phase 10: Polish ◄──────────────────────────────────┘
```

### User Story Dependencies

| Story | Depends On | Notes |
|-------|------------|-------|
| US1 (Following) | Foundational | Standalone - lowest friction entry point |
| US2 (Friend Requests) | Foundational | Creates friendships that US3-US7 use |
| US3 (Friends List) | Foundational, US2 | Displays friendships created by US2 |
| US4 (Presence) | Foundational | Extends existing presence system |
| US5 (Privacy) | Foundational | Settings for US3, US4 visibility |
| US6 (Mutual Friends) | Foundational, US2 | Uses friendships table |
| US7 (Unfriend) | US3 | Adds action to friends list |

### Parallel Opportunities

**Within Setup (Phase 1):**
```
T003, T004, T005 can run in parallel
```

**Within Foundational (Phase 2):**
```
T015, T016, T017, T018, T019 can run in parallel (after T014)
```

**User Stories (after Foundational complete):**
```
US1 and US2 can run in parallel (both P1, independent)
US3, US4, US5 can run in parallel (all P2)
US6, US7 can run in parallel (both P3)
```

**Within Each User Story:**
```
US1: T020, T021 can run in parallel (hooks before components)
US3: T034, T035 can run in parallel (hooks before components)
US6: T054, T055 can run in parallel
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL**)
3. Complete Phase 3: User Story 1 (Following)
4. **STOP and VALIDATE**: Users can follow/unfollow accounts
5. Complete Phase 4: User Story 2 (Friend Requests)
6. **STOP and VALIDATE**: Full friend connection flow works
7. Deploy as MVP with core social features

### Incremental Delivery

1. **MVP**: Following + Friend Requests (delivers core social value)
2. **v1.1**: Add Friends List + Activity Feed (daily engagement)
3. **v1.2**: Add Presence + Privacy (polish and trust)
4. **v1.3**: Add Mutual Friends + Unfriend (full feature parity)

### Parallel Team Strategy

With 2 developers after Foundational:
- **Dev A**: US1 → US3 → US6
- **Dev B**: US2 → US4 → US7
- **Together**: US5 (affects both paths), Phase 10

---

## Task Count Summary

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Setup | 5 | 3 |
| Foundational | 14 | 5 |
| US1 (P1) | 7 | 2 |
| US2 (P1) | 7 | 1 |
| US3 (P2) | 8 | 2 |
| US4 (P2) | 6 | 0 |
| US5 (P2) | 6 | 0 |
| US6 (P3) | 4 | 2 |
| US7 (P3) | 5 | 0 |
| Polish | 9 | 5 |
| **Total** | **71** | **20** |

---

## Notes

- All i18n strings must be added to both en and de message files
- Use existing shadcn/ui components: Button, Card, Dialog, Sheet, Avatar
- Follow Feature-Sliced Light: all logic in hooks, stateless UI components
- Use Zustand for global social state if needed
- Realtime subscriptions for activity feed - handle reconnection gracefully
- Rate limiting uses existing `check_and_increment_rate_limit` RPC
