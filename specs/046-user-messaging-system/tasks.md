# Tasks: User Messaging System

**Input**: Design documents from `/specs/046-user-messaging-system/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md

**Tests**: No automated tests requested in spec. Manual testing per acceptance scenarios.

**Organization**: Tasks grouped by user story (12 total) to enable independent implementation and testing.
**Total Tasks**: 99 (T001-T097 including T013a, T044a)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions (Next.js App Router)

- **Components**: `components/messaging/`
- **Hooks**: `hooks/messaging/`
- **Types**: `types/`
- **Validations**: `lib/validations/`
- **API Routes**: `app/api/messaging/`
- **Pages**: `app/[locale]/`
- **Supabase**: `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, and database schema

- [X] T001 Create messaging types file in types/messaging.ts with all interfaces (Conversation, Message, MessageReaction, UserFriend, UserBlock, UserReport, metadata types)
- [X] T002 Create Zod validation schemas in lib/validations/messaging-schema.ts for message creation, privacy settings, report submission
- [X] T003 Create database migration file supabase/migrations/046_user_messaging.sql with all tables (conversations, conversation_participants, messages, message_deletions, message_reactions, user_friends, user_blocks, user_reports)
- [X] T004 Add privacy columns to profiles table in migration (messaging_privacy, online_status_privacy, discoverable, read_receipts_enabled)
- [X] T005 Add RLS policies for all messaging tables in supabase/migrations/046_user_messaging.sql
- [X] T006 [P] Create Supabase query helpers in lib/supabase/messaging-queries.ts for common operations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and base components that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create useUnreadCount hook in hooks/messaging/useUnreadCount.ts with Supabase realtime subscription
- [X] T008 [P] Create base MessagingModal component shell in components/messaging/MessagingModal.tsx using shadcn Dialog
- [X] T009 [P] Create ConversationList component in components/messaging/ConversationList.tsx with conversation item display
- [X] T010 [P] Create MessageBubble component in components/messaging/MessageBubble.tsx with sender avatar, content, timestamp
- [X] T011 Create useConversations hook in hooks/messaging/useConversations.ts for listing and loading conversations
- [X] T012 Add envelope icon with unread badge to Header component in components/layout/SiteHeader.tsx
- [X] T013 Create barrel exports in hooks/messaging/index.ts and components/messaging/index.ts
- [X] T013a [P] Create usePresenceStatus hook in hooks/messaging/usePresenceStatus.ts with Supabase Presence channel for online/offline tracking

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Send Direct Message (Priority: P1) 🎯 MVP

**Goal**: Users can send and receive direct messages with real-time delivery

**Independent Test**: Two users exchange messages; messages appear instantly; unread badge updates

### Implementation for User Story 1

- [X] T014 [US1] Create useMessages hook in hooks/messaging/useMessages.ts with send, load, and realtime subscription
- [X] T015 [US1] Create ConversationView component in components/messaging/ConversationView.tsx with message list and scroll
- [X] T016 [US1] Create MessageInput component in components/messaging/MessageInput.tsx with text input and send button
- [X] T017 [US1] Implement createDirectConversation in hooks/messaging/useConversations.ts with privacy check
- [X] T018 [US1] Create POST /api/messaging/conversations/start route in app/api/messaging/conversations/start/route.ts
- [ ] T019 [US1] Add "Message" button to UserProfileModal in components/profile/UserProfileModal.tsx
- [X] T020 [US1] Wire MessagingModal to Header envelope icon click in components/layout/SiteHeader.tsx
- [X] T021 [US1] Implement message delivery status display (sent, delivered, read) in MessageBubble.tsx
- [X] T022 [US1] Add privacy-blocked message display when recipient disables messages in ConversationView.tsx

**Checkpoint**: Direct messaging functional - users can discover, message, and receive real-time replies

---

## Phase 4: User Story 2 - Manage Friends List (Priority: P2)

**Goal**: Users can add/remove friends for quick-access messaging

**Independent Test**: Add friend from profile, see in friends list, quick-message from list

### Implementation for User Story 2

- [ ] T023 [US2] Create useFriends hook in hooks/messaging/useFriends.ts with add, remove, list operations
- [ ] T024 [US2] Create FriendsList component in components/messaging/FriendsList.tsx with friend cards and quick-message
- [ ] T025 [US2] Add "Add Friend" button to UserProfileModal in components/profile/UserProfileModal.tsx
- [ ] T026 [US2] Add "Friends" tab/section to MessagingModal in components/messaging/MessagingModal.tsx
- [ ] T027 [US2] Implement friend status indicator on conversation list items in ConversationList.tsx

**Checkpoint**: Friends management complete - users can build trusted contact lists

---

## Phase 5: User Story 3 - Search and Discover Users (Priority: P2)

**Goal**: Users can search for other GearShack members respecting privacy settings

**Independent Test**: Search for username, see discoverable users only, blocked users hidden

### Implementation for User Story 3

- [ ] T028 [US3] Create useUserSearch hook in hooks/messaging/useUserSearch.ts with debounced search
- [ ] T029 [US3] Create GET /api/messaging/users/search route in app/api/messaging/users/search/route.ts
- [ ] T030 [US3] Create UserSearch component in components/messaging/UserSearch.tsx with search input and results
- [ ] T031 [US3] Add UserSearch to MessagingModal as discoverable "New Conversation" flow in MessagingModal.tsx
- [ ] T032 [US3] Filter search results by discoverable=true and exclude blocked users in API route

**Checkpoint**: User discovery functional - organic community connection enabled

---

## Phase 6: User Story 4 - Group Chats (Priority: P3)

**Goal**: Users can create and participate in group conversations

**Independent Test**: Create group with 3+ users, all receive messages, can leave group

### Implementation for User Story 4

- [ ] T033 [US4] Extend useConversations hook for group creation with participants and name
- [ ] T034 [US4] Create GroupChatCreate component in components/messaging/GroupChatCreate.tsx with participant picker
- [ ] T035 [US4] Update ConversationView to show sender identity for group messages in ConversationView.tsx
- [ ] T036 [US4] Implement group admin role check for add/remove participants in useConversations.ts
- [ ] T037 [US4] Add "Leave Group" action to conversation settings in ConversationView.tsx
- [ ] T038 [US4] Implement admin transfer when creator leaves (oldest member becomes admin)

**Checkpoint**: Group messaging complete - multi-party coordination enabled

---

## Phase 7: User Story 5 - Privacy Settings (Priority: P3)

**Goal**: Users can control who messages them, sees their status, and finds them in search

**Independent Test**: Set "friends only" - non-friends cannot initiate conversation

### Implementation for User Story 5

- [ ] T039 [US5] Create usePrivacySettings hook in hooks/messaging/usePrivacySettings.ts with load/save
- [ ] T040 [US5] Create privacy settings page at app/[locale]/(authenticated)/settings/privacy/page.tsx
- [ ] T041 [US5] Create PrivacySettingsForm component in components/settings/PrivacySettingsForm.tsx
- [ ] T042 [US5] Enforce messaging_privacy check in /api/messaging/conversations/start route
- [ ] T043 [US5] Enforce discoverable check in /api/messaging/users/search route
- [ ] T044 [US5] Add link to privacy settings from user profile/settings menu
- [ ] T044a [US5] Implement read receipt privacy enforcement in useMessages.ts - only send "read" status if recipient has read_receipts_enabled=true

**Checkpoint**: Privacy controls complete - users have granular control over contactability

---

## Phase 8: User Story 9 - Report and Block Users (Priority: P3)

**Goal**: Users can block unwanted contacts and report inappropriate behavior

**Independent Test**: Block user - they cannot message or find the blocker

### Implementation for User Story 9

- [ ] T045 [US9] Create useBlockedUsers hook in hooks/messaging/useBlockedUsers.ts with block, unblock, list
- [ ] T046 [US9] Create POST /api/messaging/reports route in app/api/messaging/reports/route.ts
- [ ] T047 [US9] Add "Block User" option to conversation/profile actions in ConversationView.tsx
- [ ] T048 [US9] Add "Report" option with reason selector to message context menu in MessageBubble.tsx
- [ ] T049 [US9] Create BlockedUsersList component in components/messaging/BlockedUsersList.tsx
- [ ] T050 [US9] Add blocked users management to privacy settings page

**Checkpoint**: Safety features complete - users protected from unwanted contact

---

## Phase 9: User Story 6 - Rich Media Messages (Priority: P4)

**Goal**: Users can share images, locations, and gear references in messages

**Independent Test**: Send image, location pin, gear item reference - all display correctly

### Implementation for User Story 6

- [ ] T051 [P] [US6] Create image upload in MessageInput using existing useCloudinaryUpload hook
- [ ] T052 [P] [US6] Create LocationCard component in components/messaging/LocationCard.tsx for location messages
- [ ] T053 [P] [US6] Create GearItemCard component in components/messaging/GearItemCard.tsx for gear references
- [ ] T054 [US6] Extend MessageInput with attachment picker (image, location, gear) in MessageInput.tsx
- [ ] T055 [US6] Update MessageBubble to render image, location, gear_reference message types
- [ ] T056 [US6] Implement geolocation API integration for sharing current location

**Checkpoint**: Rich media complete - enhanced communication for trades and meetups

---

## Phase 10: User Story 7 - Message Search (Priority: P4)

**Goal**: Users can search their message history for specific content

**Independent Test**: Search keyword - matching messages highlighted and navigable

### Implementation for User Story 7

- [ ] T057 [US7] Create POST /api/messaging/messages/search route in app/api/messaging/messages/search/route.ts
- [ ] T058 [US7] Create useMessageSearch hook in hooks/messaging/useMessageSearch.ts
- [ ] T059 [US7] Create MessageSearchResults component in components/messaging/MessageSearchResults.tsx
- [ ] T060 [US7] Add search input to MessagingModal header in MessagingModal.tsx
- [ ] T061 [US7] Implement navigation from search result to specific message in conversation

**Checkpoint**: Message search complete - users can find past conversations efficiently

---

## Phase 11: User Story 8 - Reactions and Typing Indicators (Priority: P4)

**Goal**: Users can react to messages and see when others are typing

**Independent Test**: Add reaction - visible to recipient; typing - indicator appears in real-time

### Implementation for User Story 8

- [ ] T062 [P] [US8] Create useMessageReactions hook in hooks/messaging/useMessageReactions.ts
- [ ] T063 [P] [US8] Create useTypingIndicator hook in hooks/messaging/useTypingIndicator.ts with broadcast
- [ ] T064 [US8] Create MessageReactions component in components/messaging/MessageReactions.tsx with emoji picker
- [ ] T065 [US8] Create TypingIndicator component in components/messaging/TypingIndicator.tsx
- [ ] T066 [US8] Add reaction display to MessageBubble in MessageBubble.tsx
- [ ] T067 [US8] Wire typing indicator to MessageInput onChange in ConversationView.tsx

**Checkpoint**: Enhanced interactions complete - familiar messenger experience

---

## Phase 12: User Story 10 - Mute and Archive (Priority: P5)

**Goal**: Users can mute notifications and archive old conversations

**Independent Test**: Mute conversation - no notifications; archive - hidden from main list

### Implementation for User Story 10

- [ ] T068 [US10] Extend useConversations hook with mute/unmute and archive/unarchive operations
- [ ] T069 [US10] Add "Mute" and "Archive" actions to conversation context menu in ConversationList.tsx
- [ ] T070 [US10] Add "Archived" section/tab to MessagingModal in MessagingModal.tsx
- [ ] T071 [US10] Implement auto-unarchive on new message arrival in useConversations.ts

**Checkpoint**: Conversation management complete - power user features enabled

---

## Phase 13: User Story 11 - Voice Messages (Priority: P5)

**Goal**: Users can record and send voice messages

**Independent Test**: Record voice message, send, recipient plays back with controls

### Implementation for User Story 11

- [ ] T072 [US11] Create useVoiceMessage hook in hooks/messaging/useVoiceMessage.ts with MediaRecorder API
- [ ] T073 [US11] Create VoiceRecorder component in components/messaging/VoiceRecorder.tsx with record/preview/send
- [ ] T074 [US11] Create VoiceMessagePlayer component in components/messaging/VoiceMessagePlayer.tsx
- [ ] T075 [US11] Add microphone button to MessageInput in MessageInput.tsx
- [ ] T076 [US11] Upload voice messages to Cloudinary as audio files in useVoiceMessage.ts
- [ ] T077 [US11] Update MessageBubble to render voice message type with player

**Checkpoint**: Voice messages complete - hands-free communication enabled

---

## Phase 14: User Story 12 - Structured Posts (Priority: P5)

**Goal**: Users can create gear trade offers and trip invitations as structured cards

**Independent Test**: Create gear trade post - displays as formatted card with all details

### Implementation for User Story 12

- [ ] T078 [P] [US12] Create GearTradePost component in components/messaging/GearTradePost.tsx
- [ ] T079 [P] [US12] Create TripInvitationPost component in components/messaging/TripInvitationPost.tsx
- [ ] T080 [US12] Create GearTradeForm for creating trade offers in components/messaging/GearTradeForm.tsx
- [ ] T081 [US12] Create TripInvitationForm for creating trip invites in components/messaging/TripInvitationForm.tsx
- [ ] T082 [US12] Add "Create Trade Post" and "Create Trip Invite" to MessageInput attachment menu
- [ ] T083 [US12] Update MessageBubble to render gear_trade and trip_invitation message types

**Checkpoint**: Structured posts complete - enhanced gear trading and trip planning

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T084 [P] Add i18n translations for all messaging UI in messages/en.json and messages/de.json
- [ ] T085 [P] Add responsive styling for mobile view in all messaging components
- [ ] T086 Implement message deletion (delete for me / delete for everyone) in MessageBubble context menu
- [ ] T087 Wire usePresenceStatus hook to ConversationList and ConversationView for online/offline indicators
- [ ] T088 Implement @mentions parsing and notification in group messages
- [ ] T089 Add empty states for no conversations, no friends, no search results
- [ ] T090 Performance optimization: virtualize long message lists in ConversationView
- [ ] T091 Add error handling and toast notifications for all messaging operations
- [ ] T092 Run npm run lint and npm run build to verify no errors
- [ ] T093 Manual testing: verify all acceptance scenarios from spec.md

### Push Notifications (FR-030a)

- [ ] T094 [P] Create service worker for push notifications in public/sw.js with message notification handling
- [ ] T095 [P] Create useNotificationPermission hook in hooks/messaging/useNotificationPermission.ts for permission state management
- [ ] T096 Implement push notification subscription registration on messaging modal first open in MessagingModal.tsx
- [ ] T097 Add notification permission prompt UI with "Enable notifications" button in MessagingModal.tsx

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-14)**: All depend on Foundational completion
  - Can proceed in parallel (if staffed) or sequentially in priority order
- **Polish (Phase 15)**: Depends on all user stories being implemented

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories - **MVP**
- **US2 (P2)**: No dependencies - can parallelize with US3
- **US3 (P2)**: No dependencies - can parallelize with US2
- **US4 (P3)**: Benefits from US1 completion but independently testable
- **US5 (P3)**: Affects US1, US3 but independently testable
- **US9 (P3)**: Affects US1, US3, US4 but independently testable
- **US6 (P4)**: Requires US1 foundation - enhances messaging
- **US7 (P4)**: Requires messages to exist - can start with US1 data
- **US8 (P4)**: Requires US1 foundation - enhances messaging
- **US10 (P5)**: Requires conversations to exist - management layer
- **US11 (P5)**: Requires US1 foundation - new message type
- **US12 (P5)**: Requires US1 foundation - new message type

### Parallel Opportunities

- Setup T003-T006 can run in parallel
- Foundational T008-T010, T013a can run in parallel
- US2 and US3 can run in parallel
- US4, US5, US9 can run in parallel (all P3)
- US6, US7, US8 can run in parallel (all P4)
- US10, US11, US12 can run in parallel (all P5)
- Polish tasks T084-T091 can run in parallel
- Push notification tasks T094-T095 can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase, launch US1 implementation:
Task: "Create useMessages hook in hooks/messaging/useMessages.ts"
Task: "Create ConversationView component in components/messaging/ConversationView.tsx"
Task: "Create MessageInput component in components/messaging/MessageInput.tsx"
# Then wire together:
Task: "Wire MessagingModal to Header envelope icon"
```

## Parallel Example: P3 Stories (US4, US5, US9)

```bash
# Three developers can work in parallel after US1:
Developer A - US4: Group Chats
  Task: "GroupChatCreate component", "Group leave action", "Admin transfer"

Developer B - US5: Privacy Settings
  Task: "Privacy settings page", "Privacy form", "Enforcement checks"

Developer C - US9: Block & Report
  Task: "Block hook", "Report API", "Block list management"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T013a)
3. Complete Phase 3: User Story 1 (T014-T022)
4. **STOP and VALIDATE**: Test direct messaging independently
5. Deploy/demo if ready - users can now message each other

### Incremental Delivery

1. MVP: Direct Messaging (US1) → Deploy
2. Add Friends + Search (US2, US3) → Deploy
3. Add Groups + Privacy + Safety (US4, US5, US9) → Deploy
4. Add Rich Media + Search + Reactions (US6, US7, US8) → Deploy
5. Add Voice + Structured Posts (US10, US11, US12) → Deploy
6. Polish phase + Push Notifications (T094-T097) → Final release

### Suggested MVP Scope

**US1 alone delivers significant value**: users can discover profiles, initiate conversations, and exchange messages in real-time. This is a complete, functional messaging system that enables gear trades and trip coordination.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All components must be stateless (logic in hooks per constitution)
- Use existing shadcn/ui components only
- All imports must use `@/*` alias

## Coverage Summary

| Requirement | Coverage |
|-------------|----------|
| FR-001 to FR-036 | ✅ All covered |
| FR-017 (Read Receipts) | ✅ T044a added |
| FR-028 (Online Status) | ✅ T013a + T087 |
| FR-030a (Push Notifications) | ✅ T094-T097 added |
| FR-030b (@Mentions) | ✅ T088 |

**Analysis Remediation Applied**: 2025-12-12
- Added T013a: usePresenceStatus hook (FR-028)
- Added T044a: Read receipt privacy enforcement (FR-017)
- Added T094-T097: Push notification implementation (FR-030a)
- Updated T087: Wire presence hook to components
