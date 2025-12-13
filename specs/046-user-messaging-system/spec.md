# Feature Specification: User Messaging System

**Feature Branch**: `046-user-messaging-system`
**Created**: 2025-12-12
**Status**: Draft
**Input**: User description: "Build a comprehensive user-to-user communication system for the GearShack outdoor gear app that enables users to connect, collaborate, and build community around their outdoor adventures."

## Clarifications

### Session 2025-12-12

- Q: Is the friend relationship one-way (follow model), two-way with acceptance, or auto-mutual? → A: One-way (follow model) - User A adds User B without notification or acceptance required.
- Q: What deletion options do users have for messages? → A: Both options - users can choose "delete for me" (hidden from deleter only) or "delete for everyone" (removed for all participants) per message.
- Q: What triggers push notifications vs. badge-only updates? → A: Direct messages trigger push notifications; group messages only update badge unless user is @mentioned.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Direct Message to Another User (Priority: P1)

A user discovers another GearShack member through browsing profiles, viewing shared loadouts, or searching for users. They want to initiate a conversation to discuss borrowing gear, propose a trade, or coordinate a trip together. The user opens the messaging interface and sends their first message, beginning a direct one-on-one conversation.

**Why this priority**: Direct messaging is the foundational capability that enables all other communication features. Without the ability to send and receive messages, no other messaging features can function.

**Independent Test**: Can be fully tested by having two users exchange messages and delivers immediate value for gear trades and trip coordination.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing another user's profile, **When** they click the "Message" button and the recipient allows messages, **Then** a messaging modal opens with a new conversation thread for that user.
2. **Given** a user in an active conversation, **When** they type a message and press send, **Then** the message appears in the conversation with a sent timestamp and delivery indicator.
3. **Given** a user with the messaging modal closed, **When** a new message arrives, **Then** the unread badge counter on the envelope icon increments.
4. **Given** a user viewing another user's profile where the recipient has disabled incoming messages, **When** they attempt to message, **Then** a polite notice explains that this user is not accepting messages.

---

### User Story 2 - Manage Friends List (Priority: P2)

A user wants to build a list of trusted connections (friends) to quickly access their profiles and message them without searching. They add users they've successfully traded with, trip partners, or fellow outdoor enthusiasts they regularly interact with. The friends list provides quick access to start conversations.

**Why this priority**: Friends management enables efficient communication with trusted contacts and is a prerequisite for privacy controls like "friends only" messaging.

**Independent Test**: Can be tested by adding/removing friends and verifying they appear in a friends list with quick-access messaging.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing another user's profile, **When** they click "Add Friend", **Then** that user is added to their friends list with visual confirmation.
2. **Given** a user with friends in their list, **When** they open the messaging interface, **Then** they see a "Friends" section showing all friends with quick-message shortcuts.
3. **Given** a user viewing their friends list, **When** they click "Remove Friend" on a contact, **Then** that user is removed from their friends list (but existing conversation history is preserved).

---

### User Story 3 - Search and Discover Users (Priority: P2)

A user wants to find other GearShack members by name, username, or location to connect with local outdoor enthusiasts or find specific people they've met on trails. The search respects privacy settings, only showing users who have opted to be discoverable.

**Why this priority**: User discovery enables organic community growth and is essential for users to find and connect with others beyond their existing network.

**Independent Test**: Can be tested by searching for users with various queries and verifying only discoverable users appear in results.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they open user search and enter a name or username, **Then** matching users who have enabled discoverability are displayed.
2. **Given** search results showing multiple users, **When** the user clicks on a result, **Then** they can view that user's profile and optionally message them.
3. **Given** a user who has disabled discoverability in their privacy settings, **When** another user searches for them, **Then** they do not appear in search results.

---

### User Story 4 - Create and Participate in Group Chats (Priority: P3)

A user wants to coordinate a group trip or discuss gear with multiple people simultaneously. They create a group chat, add participants, give it a name, and all members can send messages visible to everyone in the group.

**Why this priority**: Group chats enable multi-party coordination essential for trip planning but depend on basic messaging being functional first.

**Independent Test**: Can be tested by creating a group with 3+ participants and having all members exchange messages.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they choose to create a new group chat, **Then** they can add multiple participants (from friends or search), name the group, and start the conversation.
2. **Given** a user in a group chat, **When** any member sends a message, **Then** all group members see the message with the sender identified.
3. **Given** a group chat participant, **When** they leave the group, **Then** they no longer receive messages but the group continues for remaining members.
4. **Given** a group chat creator, **When** they add a new participant, **Then** that participant can see messages sent after they joined (not full history by default).

---

### User Story 5 - Configure Privacy Settings (Priority: P3)

A user wants control over who can contact them, see their online status, and find them in search. They access privacy settings and configure their preferences to balance openness with privacy.

**Why this priority**: Privacy controls are essential for user safety and trust but can be configured with sensible defaults initially.

**Independent Test**: Can be tested by configuring each privacy setting and verifying the system respects those preferences.

**Acceptance Scenarios**:

1. **Given** a user accessing their privacy settings, **When** they set "Who can message me" to "Friends only", **Then** only users in their friends list can initiate conversations with them.
2. **Given** a user who sets "Show online status" to "Nobody", **When** other users view their profile or conversations, **Then** no online/offline indicator or "last seen" time is displayed.
3. **Given** a user who disables "Appear in search results", **When** other users search for their name, **Then** they do not appear in search results.

---

### User Story 6 - Share Rich Media in Messages (Priority: P4)

A user wants to share photos of gear condition for a potential trade, send their location for a meetup, or reference a specific gear item from the GearShack catalog. They attach media or gear references to their messages.

**Why this priority**: Rich media enhances communication quality but is an enhancement to basic text messaging.

**Independent Test**: Can be tested by sending messages with images, location pins, and gear item references and verifying recipients see them correctly.

**Acceptance Scenarios**:

1. **Given** a user composing a message, **When** they attach a photo, **Then** the photo uploads and appears in the conversation as a viewable image.
2. **Given** a user composing a message, **When** they share their current location or a map pin, **Then** a location card appears in the conversation that recipients can tap to open in maps.
3. **Given** a user composing a message, **When** they reference a gear item from their inventory or the catalog, **Then** a rich preview card of that item appears in the message.

---

### User Story 7 - Search Message History (Priority: P4)

A user wants to find a past conversation about a specific gear item, trip location, or topic. They search their message history and quickly locate the relevant conversation.

**Why this priority**: Message search improves usability for active users with many conversations but requires substantial message history to be valuable.

**Independent Test**: Can be tested by searching for keywords that appear in past messages and verifying correct conversations are surfaced.

**Acceptance Scenarios**:

1. **Given** a user with multiple conversations, **When** they search for a keyword, **Then** conversations containing that keyword are displayed with matching excerpts highlighted.
2. **Given** search results showing multiple matches, **When** the user clicks a result, **Then** they are taken to that specific message in the conversation.

---

### User Story 8 - React to Messages and See Typing Indicators (Priority: P4)

A user wants to quickly acknowledge a message with a reaction (thumbs up, heart, etc.) without typing a full response, and see when the other person is typing.

**Why this priority**: Reactions and typing indicators enhance the chat experience but are polish features on top of core messaging.

**Independent Test**: Can be tested by adding reactions to messages and verifying real-time typing indicators appear.

**Acceptance Scenarios**:

1. **Given** a user viewing a received message, **When** they long-press or click the reaction button, **Then** they can select from reaction emojis (thumbs up, heart, laugh, surprised, sad).
2. **Given** a user added a reaction to a message, **When** the sender views that message, **Then** the reaction is visible on the message bubble.
3. **Given** two users in a conversation, **When** one starts typing, **Then** the other sees a "typing..." indicator that disappears when typing stops.

---

### User Story 9 - Report and Block Users (Priority: P3)

A user receives inappropriate messages or wants to prevent contact from a specific person. They report the offending content and/or block the user to prevent further communication.

**Why this priority**: Safety features are critical for user trust and platform integrity.

**Independent Test**: Can be tested by blocking a user and verifying they can no longer send messages or find the blocking user.

**Acceptance Scenarios**:

1. **Given** a user viewing a conversation or message, **When** they choose to report, **Then** they can select a reason (spam, harassment, inappropriate content, other) and submit the report.
2. **Given** a user viewing another user's profile or conversation, **When** they block that user, **Then** the blocked user can no longer message them, see their online status, or find them in search.
3. **Given** a user who has blocked someone, **When** they view their blocked list, **Then** they can unblock users if desired.

---

### User Story 10 - Mute and Archive Conversations (Priority: P5)

A user has conversations (especially group chats) that have become less relevant but they don't want to leave or delete. They mute notifications for specific conversations or archive them to reduce clutter.

**Why this priority**: Conversation management is a convenience feature for power users with many conversations.

**Independent Test**: Can be tested by muting/archiving conversations and verifying notification and visibility behavior.

**Acceptance Scenarios**:

1. **Given** a user viewing a conversation, **When** they mute it, **Then** they no longer receive notifications for new messages in that conversation (but can still see messages when they open it).
2. **Given** a user viewing their conversation list, **When** they archive a conversation, **Then** it moves to an "Archived" section and no longer appears in the main list.
3. **Given** a user with archived conversations, **When** a new message arrives in an archived conversation, **Then** it moves back to the main list (un-archives automatically).

---

### User Story 11 - Record and Send Voice Messages (Priority: P5)

A user is outdoors or driving and wants to send a quick audio message instead of typing. They record a voice message and send it in the conversation.

**Why this priority**: Voice messages are a convenience feature that enhances mobile usability but are not essential for core communication.

**Independent Test**: Can be tested by recording and sending a voice message and having the recipient play it back.

**Acceptance Scenarios**:

1. **Given** a user composing a message, **When** they hold the microphone button and speak, **Then** audio is recorded.
2. **Given** a user who has recorded audio, **When** they release the button, **Then** they can preview, cancel, or send the voice message.
3. **Given** a recipient viewing a voice message, **When** they tap play, **Then** the audio plays with a visual progress indicator.

---

### User Story 12 - Create Structured Gear Trade or Trip Invitation Posts (Priority: P5)

A user wants to share a structured "gear trade offer" or "trip invitation" that includes specific details (dates, locations, gear involved) in a formatted card that recipients can easily understand and respond to.

**Why this priority**: Structured posts enhance gear trading and trip planning workflows but require rich media and basic messaging to be in place first.

**Independent Test**: Can be tested by creating a trade post or trip invitation and verifying the structured card displays correctly with all relevant data.

**Acceptance Scenarios**:

1. **Given** a user in a conversation, **When** they create a "Gear Trade Post", **Then** they can specify items offered, items wanted, and any conditions, which appears as a structured card.
2. **Given** a user in a conversation, **When** they create a "Trip Invitation", **Then** they can specify dates, location, activity type, and gear recommendations, which appears as an invitation card.
3. **Given** a recipient viewing a structured post, **When** they tap on it, **Then** they can view full details and respond with interest.

---

### Edge Cases

- What happens when a user sends a message to someone who blocks them mid-conversation? (Message fails to deliver with a generic error; no indication of being blocked to prevent harassment escalation)
- How does the system handle a user who deletes their account? (Their messages show "Deleted User" as sender; conversation history preserved for other participants)
- What happens when a group chat creator leaves? (Oldest remaining member becomes the new admin; if all leave, group is archived)
- How does the system handle message delivery when recipient is offline for extended periods? (Messages are stored and delivered when they return; no automatic expiration for standard messages)
- What happens if a user tries to create a group with a blocked user? (Blocked users cannot be added; clear message explains why)
- How does the system behave with poor network connectivity? (Messages queue locally and send when connection restores; clear pending indicator shown)

## Requirements *(mandatory)*

### Functional Requirements

**Core Messaging**
- **FR-001**: System MUST allow authenticated users to send text messages to other users who permit incoming messages.
- **FR-002**: System MUST display messages in chronological order with sender identification, timestamp, and delivery status (sent, delivered, read).
- **FR-003**: System MUST provide a messaging modal overlay accessible from anywhere in the app that resembles familiar messenger interfaces (message bubbles, smooth scrolling).
- **FR-004**: System MUST display an envelope icon in the app bar with a badge counter showing total unread messages.
- **FR-005**: System MUST support real-time message delivery with updates appearing without manual refresh.
- **FR-006**: System MUST preserve full conversation history unless explicitly deleted by users.
- **FR-006a**: System MUST provide two deletion options per message: "delete for me" (hides message from deleter only) and "delete for everyone" (removes message for all participants, showing "message deleted" placeholder).

**Friends and Contacts**
- **FR-007**: System MUST allow users to add other users to a personal friends list.
- **FR-008**: System MUST allow users to remove friends from their list without notification to the removed friend.
- **FR-009**: System MUST provide quick-access messaging to friends from the messaging interface.

**User Discovery**
- **FR-010**: System MUST provide user search functionality with filters for name and username.
- **FR-011**: System MUST respect user discoverability settings, excluding non-discoverable users from search results.

**Group Messaging**
- **FR-012**: System MUST allow users to create group conversations with 2-50 participants.
- **FR-013**: System MUST allow group creators to name the group and add/remove participants.
- **FR-014**: System MUST allow any participant to leave a group at any time.
- **FR-015**: System MUST show sender identity for all messages in group conversations.

**Privacy Controls**
- **FR-016**: System MUST provide privacy settings for: who can message (everyone/friends only/nobody), online status visibility (everyone/friends only/nobody), and search discoverability (on/off).
- **FR-017**: System MUST allow users to toggle read receipts on/off (when off, senders see "delivered" but not "read").
- **FR-018**: System MUST enforce privacy settings in real-time across all features.

**Safety Features**
- **FR-019**: System MUST allow users to report messages or users with categorized reasons.
- **FR-020**: System MUST allow users to block other users, preventing all messaging and discovery.
- **FR-021**: System MUST maintain a blocked users list that users can manage (view and unblock).

**Rich Media**
- **FR-022**: System MUST allow users to share images in messages (up to 10MB per image).
- **FR-023**: System MUST allow users to share location pins that open in map applications.
- **FR-024**: System MUST allow users to share gear items from the GearShack catalog with rich preview cards.

**Enhanced Features**
- **FR-025**: System MUST provide message search functionality across all conversations.
- **FR-026**: System MUST support message reactions with a predefined set of emoji reactions.
- **FR-027**: System MUST display typing indicators when conversation partners are composing messages.
- **FR-028**: System MUST show online/last active status for users who permit it.
- **FR-029**: System MUST allow users to mute notifications for specific conversations.
- **FR-030**: System MUST allow users to archive conversations.
- **FR-030a**: System MUST send push notifications for direct messages; group messages update badge only unless user is @mentioned.
- **FR-030b**: System MUST support @mentions in group chats to notify specific participants.

**Voice Messages**
- **FR-031**: System MUST allow users to record and send voice messages (up to 5 minutes).
- **FR-032**: System MUST provide playback controls for received voice messages.

**Structured Posts**
- **FR-033**: System MUST support creating structured "Gear Trade" posts with offered items, wanted items, and conditions.
- **FR-034**: System MUST support creating structured "Trip Invitation" posts with dates, location, activity type, and gear suggestions.

**Profile Integration**
- **FR-035**: System MUST display a "Message" button on user profiles when the viewer is permitted to message that user.
- **FR-036**: System MUST hide or disable the "Message" button with explanation when the profile owner does not accept messages from the viewer.

### Key Entities

- **Conversation**: Represents a messaging thread between participants; can be one-on-one or group; has metadata (name for groups, creation date, last activity).
- **Message**: Individual communication unit within a conversation; contains content (text, media, voice, structured post), sender, timestamp, delivery status, reactions, and deletion state (active, deleted-for-self, deleted-for-everyone).
- **Participant**: Junction between user and conversation; tracks membership, mute status, archive status, unread count, and role (member/admin for groups).
- **Friend Relationship**: One-way (follow model) relationship where User A adds User B to their friends list; B is not notified and no acceptance is required; not necessarily mutual.
- **User Privacy Settings**: User preferences for messaging permissions, online status visibility, discoverability, and read receipt sharing.
- **Block Relationship**: Directional relationship indicating one user has blocked another; prevents all messaging and discovery.
- **Report**: Record of a user reporting content or another user with reason and status.
- **Gear Trade Post**: Structured message type containing offered items, wanted items, conditions, and status.
- **Trip Invitation Post**: Structured message type containing dates, location, activity type, gear suggestions, and RSVP status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can send a message and have it appear on the recipient's screen within 2 seconds under normal network conditions.
- **SC-002**: Users can complete the flow from discovering a user to sending their first message in under 30 seconds.
- **SC-003**: 90% of users who attempt to configure privacy settings successfully complete configuration on first attempt.
- **SC-004**: Users with 100+ conversations can find a specific past message using search in under 10 seconds.
- **SC-005**: Group chat participants receive messages from other participants within 3 seconds of sending.
- **SC-006**: Blocked users are completely prevented from contacting the blocking user across all features (messaging, search, profile viewing).
- **SC-007**: 80% of users rate the messaging interface as "familiar and easy to use" in user testing.
- **SC-008**: Users can add a friend and message them in under 15 seconds.
- **SC-009**: Voice messages record and play back with acceptable audio quality for outdoor/mobile use.
- **SC-010**: Unread message badge updates in real-time as messages arrive and are read.

## Assumptions

- Users are authenticated with existing GearShack accounts before accessing messaging features.
- The app has existing user profiles that can be extended with messaging capabilities and privacy settings.
- Real-time messaging infrastructure (WebSockets or similar) will be implemented to support instant delivery.
- Cloudinary or similar service handles media storage for images and voice messages.
- Push notifications are available through existing mobile/web infrastructure for message alerts.
- Default privacy settings are: messaging from everyone, online status visible to friends, discoverable in search, read receipts enabled.
- Maximum group size of 50 participants balances functionality with performance.
- Voice message limit of 5 minutes prevents abuse while allowing meaningful communication.
- Image size limit of 10MB accommodates high-quality gear photos from modern smartphones.
- Message history is retained indefinitely unless explicitly deleted by users.
