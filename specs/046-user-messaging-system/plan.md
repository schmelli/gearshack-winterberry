# Implementation Plan: User Messaging System

**Branch**: `046-user-messaging-system` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/046-user-messaging-system/spec.md`

## Summary

Build a comprehensive user-to-user messaging system for GearShack enabling direct messages, group chats, friends lists, and rich media sharing. The system leverages Supabase Realtime (already proven in the loadout comments feature) for instant message delivery, PostgreSQL for data persistence, and Cloudinary for media storage. The messaging interface appears as a modal overlay accessible from anywhere in the app via an envelope icon with unread badge counter.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Next.js 16.0.7 (App Router) + React 19.2.0
**Primary Dependencies**: @supabase/supabase-js 2.87.1, @supabase/ssr 0.8.0, Zustand 5.0.9, react-hook-form 7.68.0, Zod 4.1.13, shadcn/ui, next-cloudinary 6.17.5, Sonner 2.0.7
**Storage**: PostgreSQL (Supabase) for messages/conversations/relationships, Cloudinary for images/voice messages
**Testing**: Build verification (`npm run build`), lint (`npm run lint`), manual testing
**Target Platform**: Web (desktop + mobile responsive), Next.js server-side + client-side rendering
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Message delivery <2s (SC-001), user-to-message flow <30s (SC-002), search <10s (SC-004)
**Constraints**: Real-time delivery required, offline message queueing, 10MB image limit, 5min voice limit, 50 participants max per group
**Scale/Scope**: Existing user base, unlimited message retention, full-text search capability

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| I. Feature-Sliced Light Architecture | ✅ PASS | All logic in hooks (`useMessages`, `useConversations`, `useFriends`, `usePrivacySettings`), UI components stateless |
| II. TypeScript Strict Mode | ✅ PASS | All new types in `types/messaging.ts`, Zod schemas in `lib/validations/messaging-schema.ts` |
| III. Design System Compliance | ✅ PASS | Use existing shadcn/ui components (Dialog, Sheet, Button, Card, Avatar, Input, Textarea, ScrollArea) |
| IV. Spec-Driven Development | ✅ PASS | Spec complete with 12 user stories, 36 functional requirements, 10 success criteria |
| V. Import and File Organization | ✅ PASS | All imports use `@/*` alias, messaging components co-located in `components/messaging/` |

**Gate Status**: ✅ PASSED - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/046-user-messaging-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing project)
app/
├── [locale]/
│   └── (authenticated)/
│       └── settings/
│           └── privacy/          # New: Privacy settings page
└── api/
    └── messaging/                # New: Messaging API routes
        ├── conversations/
        ├── messages/
        ├── friends/
        └── search/

components/
├── messaging/                    # New: Messaging UI components
│   ├── MessagingModal.tsx        # Main modal overlay
│   ├── ConversationList.tsx      # Conversation sidebar
│   ├── ConversationView.tsx      # Message thread view
│   ├── MessageBubble.tsx         # Individual message display
│   ├── MessageInput.tsx          # Compose area with attachments
│   ├── FriendsList.tsx           # Friends quick-access section
│   ├── UserSearch.tsx            # User discovery search
│   ├── GroupChatCreate.tsx       # Group chat creation
│   ├── TypingIndicator.tsx       # Real-time typing display
│   ├── MessageReactions.tsx      # Emoji reactions picker
│   ├── VoiceRecorder.tsx         # Voice message recording
│   ├── GearItemCard.tsx          # Gear reference preview
│   ├── LocationCard.tsx          # Location share preview
│   ├── GearTradePost.tsx         # Structured trade post
│   └── TripInvitationPost.tsx    # Structured trip invitation
├── layout/
│   └── Header.tsx                # Modified: Add envelope icon + badge
└── profile/
    └── UserProfileModal.tsx      # Modified: Add "Message" button

hooks/
├── messaging/                    # New: Messaging hooks
│   ├── useConversations.ts       # Conversation list management
│   ├── useMessages.ts            # Message CRUD + real-time
│   ├── useFriends.ts             # Friends list management
│   ├── useUserSearch.ts          # User discovery search
│   ├── usePrivacySettings.ts     # Privacy preferences
│   ├── useBlockedUsers.ts        # Block list management
│   ├── useTypingIndicator.ts     # Typing state broadcast
│   ├── useMessageReactions.ts    # Reaction management
│   ├── useVoiceMessage.ts        # Voice recording/playback
│   └── useUnreadCount.ts         # Global unread badge count

types/
└── messaging.ts                  # New: All messaging types

lib/
├── validations/
│   └── messaging-schema.ts       # New: Zod schemas for messaging
└── supabase/
    └── messaging-queries.ts      # New: Supabase query helpers

supabase/
└── migrations/                   # New: Database migrations
    └── 046_user_messaging.sql    # Tables, RLS policies, indexes
```

**Structure Decision**: Follows existing Next.js App Router structure. New messaging feature adds:
- `components/messaging/` - All messaging UI components (stateless per constitution)
- `hooks/messaging/` - All business logic (data fetching, real-time, state)
- `types/messaging.ts` - TypeScript interfaces
- `app/api/messaging/` - Server-side API routes for complex operations
- Supabase migrations for database schema

## Complexity Tracking

> No violations requiring justification. All patterns align with existing codebase architecture.

| Pattern | Rationale |
|---------|-----------|
| Supabase Realtime | Already proven in `VirtualGearShakedown.tsx` for live comments |
| Zustand for state | Consistent with existing `useSupabaseStore.ts` pattern |
| shadcn/ui Dialog/Sheet | Modal overlay uses existing design system components |
| Cloudinary for media | Consistent with existing image upload infrastructure |
