# Implementation Plan: Social Graph (Friends + Follow System)

**Branch**: `001-social-graph` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-social-graph/spec.md`

## Summary

Implement a dual-tier social connection system with **Friends** (bidirectional, mutual consent after messaging) and **Following** (unidirectional, no approval needed). The feature builds heavily on existing infrastructure including the messaging system, privacy settings, presence tracking, and notification system.

**Key Technical Approach**:
- Leverage existing `user_friends` table for Following (rename conceptually in the UI)
- Add new `friend_requests` table for pending bidirectional requests
- Add new `friendships` table for confirmed mutual connections
- Extend existing hooks with friend-specific functionality
- Add activity feed using Supabase Realtime subscriptions

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+ (App Router), React 19+, @supabase/supabase-js, @supabase/ssr, Zustand, react-hook-form, Zod, shadcn/ui, Sonner, next-intl
**Storage**: PostgreSQL (Supabase) - extends existing `profiles`, `user_friends`, `notifications` tables
**Testing**: Jest, React Testing Library, Playwright (existing test infrastructure)
**Target Platform**: Web (responsive), mobile-first design
**Project Type**: Web application (Next.js App Router)
**Performance Goals**:
- Friend list loads <500ms for up to 500 friends
- Follow/unfollow <200ms
- Activity feed updates <1s latency
- Online status propagates <5s
**Constraints**:
- Max 1,000 friends per user
- Max 20 friend requests per 24 hours (rate limiting)
- 5-minute presence timeout
**Scale/Scope**: 100,000 concurrent users target

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Feature-Sliced Light Architecture | ✅ PASS | All logic in hooks (`hooks/social/`), stateless UI components |
| TypeScript Strict Mode | ✅ PASS | No `any` types, Zod validation for external data |
| Design System Compliance | ✅ PASS | Using shadcn/ui components (Button, Card, Dialog, Sheet, Avatar) |
| Spec-Driven Development | ✅ PASS | Comprehensive spec exists with user stories and acceptance criteria |
| Import/File Organization | ✅ PASS | Using `@/*` path alias, feature-organized structure |
| State Management Patterns | ✅ PASS | Zustand for global state, state machines for async flows |
| Internationalization | ✅ PASS | Using next-intl for all user-facing strings |

**No violations detected. Proceeding with Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/001-social-graph/
├── plan.md              # This file
├── spec.md              # Feature specification (complete)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── social-graph.openapi.yaml
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# New files for Social Graph feature
types/
├── social.ts                      # Friend, Follow, FriendRequest types

hooks/
└── social/
    ├── index.ts                   # Re-exports
    ├── useFriendRequests.ts       # Send, accept, decline friend requests
    ├── useFriendships.ts          # Manage confirmed friendships
    ├── useFollowing.ts            # Follow/unfollow (extends existing useFriends)
    ├── useFollowers.ts            # View follower count (VIP only)
    ├── useMutualFriends.ts        # Calculate mutual friends
    ├── useFriendActivity.ts       # Real-time friend activity feed
    ├── useSocialPrivacy.ts        # Extended privacy settings
    └── useOnlineStatus.ts         # Extends existing usePresenceStatus

lib/supabase/
├── social-queries.ts              # Database queries for social features

components/social/
├── FriendRequestButton.tsx        # Add friend / Pending / Friends badge
├── FollowButton.tsx               # Follow / Following toggle
├── FriendsList.tsx                # Friends list with search/filter/sort
├── FollowingList.tsx              # Following list
├── FriendActivityFeed.tsx         # Real-time activity feed
├── MutualFriendsDisplay.tsx       # Mutual friends on profile
├── OnlineStatusIndicator.tsx      # Green dot / Away / Last active
├── PrivacySettingsPanel.tsx       # Presets + granular controls
├── EmptyStateCard.tsx             # Empty states with CTAs
└── FriendRequestNotification.tsx  # Notification component

app/[locale]/
├── friends/
│   └── page.tsx                   # Friends list page
├── following/
│   └── page.tsx                   # Following list page
└── settings/
    └── privacy/
        └── page.tsx               # Privacy settings page (extend existing)

# Database migrations (Supabase)
supabase/migrations/
├── YYYYMMDD_create_friend_requests.sql
├── YYYYMMDD_create_friendships.sql
├── YYYYMMDD_create_user_follows.sql
├── YYYYMMDD_add_friend_activity_notifications.sql
└── YYYYMMDD_add_privacy_presets.sql

tests/
├── unit/
│   └── hooks/social/
│       ├── useFriendRequests.test.ts
│       ├── useFriendships.test.ts
│       └── useFollowing.test.ts
├── integration/
│   └── social/
│       ├── friend-request-flow.test.ts
│       └── follow-unfollow.test.ts
└── e2e/
    └── social-graph.spec.ts
```

**Structure Decision**: Web application with Next.js App Router. New `hooks/social/` directory for feature-specific hooks, `components/social/` for UI components. Extends existing messaging infrastructure rather than duplicating.

## Existing Infrastructure Analysis

### What Already Exists (Can Be Leveraged)

| Component | Location | Usage in Social Graph |
|-----------|----------|----------------------|
| `user_friends` table | Supabase | Repurpose for **Following** (one-way) |
| `useFriends` hook | `hooks/messaging/useFriends.ts` | Base pattern for `useFollowing` |
| `usePresenceStatus` hook | `hooks/messaging/usePresenceStatus.ts` | Extend for friend-only visibility |
| `usePrivacySettings` hook | `hooks/messaging/usePrivacySettings.ts` | Extend with presets + granular controls |
| `notifications` table | Supabase | Add `friend_request_received`, `friend_request_accepted` types |
| `profiles` table | Supabase | Already has `messaging_privacy`, `online_status_privacy`, `discoverable` |
| `messaging_privacy` enum | Supabase | Reuse: `'everyone' | 'friends_only' | 'nobody'` |
| Real-time presence | Supabase Realtime | Already implemented, extend for friend filtering |
| Message history check | `can_message_user` function | Use to verify messaging prerequisite for friend requests |

### What Needs To Be Built

| Component | Reason |
|-----------|--------|
| `friend_requests` table | New - bidirectional friend request with expiration |
| `friendships` table | New - confirmed mutual friendships |
| `user_follows` table | Rename/migrate from `user_friends` for clarity |
| `useFriendRequests` hook | New - send, accept, decline, list pending |
| `useFriendships` hook | New - list friends, unfriend, mutual friends |
| `useFriendActivity` hook | New - real-time activity feed from friends |
| Activity feed UI | New - display friend activities with actions |
| Privacy presets UI | New - "Only Me", "Friends Only", "Everyone" |
| Rate limiting | New - 20 friend requests per 24 hours |

## Key Design Decisions

### 1. Friends vs Following Data Model

**Decision**: Separate tables for clarity
- `friendships` - Bidirectional, requires mutual acceptance
- `user_follows` - Unidirectional, no approval (migrate from `user_friends`)

**Rationale**: Clear semantic separation, simpler queries, aligns with spec's two-tier model.

### 2. Friend Request Flow

**Decision**: Require message exchange before enabling "Add Friend"
- Query `conversations` + `messages` tables to check if users have exchanged messages
- Use existing `can_message_user` RPC function pattern

**Rationale**: Matches spec requirement FR-001, leverages existing messaging infrastructure.

### 3. Activity Feed Implementation

**Decision**: Supabase Realtime subscriptions on activity events
- Subscribe to friend's public activities (new loadouts, marketplace listings)
- Cache last 50 activities per user
- Aggregate multiple events for same friend

**Rationale**: Real-time updates requirement (NFR-3), leverages existing Realtime infrastructure.

### 4. Privacy Presets

**Decision**: Store preset selection + individual overrides in `profiles` table
- Add `privacy_preset` column: `'only_me' | 'friends_only' | 'everyone' | 'custom'`
- Individual settings in existing columns override preset when `custom`

**Rationale**: Simple implementation, immediate effect on change (FR-019).

## Complexity Tracking

> No Constitution violations to justify.

| Complexity Area | Justification |
|-----------------|---------------|
| Two tables for social connections | Semantic clarity between Friends (mutual) and Following (one-way) per spec |
| Real-time activity feed | Required by spec (NFR-3: <1s latency) |

## Phase 0 Research Topics

1. **Message exchange verification**: Best pattern to check if two users have exchanged messages
2. **Friend request expiration**: PostgreSQL strategy for 30-day auto-expiration
3. **Activity feed aggregation**: Efficient real-time feed for friends' activities
4. **Rate limiting pattern**: Supabase approach for 20 requests/24h limit
5. **Follower count for VIPs**: Efficient count query without exposing follower list

## Phase 1 Deliverables

- `research.md` - Resolved research topics
- `data-model.md` - Complete entity definitions and relationships
- `contracts/social-graph.openapi.yaml` - API contract for social endpoints
- `quickstart.md` - Developer setup and testing guide

## Next Steps

1. Complete Phase 0 research on the 5 topics above
2. Generate data-model.md with full entity specifications
3. Generate API contracts
4. Generate quickstart guide
5. Proceed to `/speckit.tasks` for task breakdown
