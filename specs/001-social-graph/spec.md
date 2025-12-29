# Feature Specification: Social Graph (Friends + Follow System)

**Feature Branch**: `001-social-graph`
**Created**: 2025-12-28
**Status**: Draft
**Input**: User description: "Dual-tier social connection system enabling verified friendships and lightweight following"

## Clarifications

### Session 2025-12-28

- Q: Presence timeout threshold (how long before "online" becomes "Last active")? → A: 5 minutes of inactivity
- Q: Friend request rate limiting to prevent spam? → A: Maximum 20 friend requests per 24 hours
- Q: Empty state behavior for Friends/Following sections? → A: Show friendly empty state with call-to-action
- Q: Graceful degradation when real-time presence system fails? → A: Show cached "Last active" times with subtle "updating..." indicator

## Summary

A dual-tier social connection system that enables users to build meaningful relationships through verified friendships while allowing lightweight following of interesting community members and VIP accounts.

Users can add friends after messaging exchanges (bidirectional, mutual), or simply follow accounts they want to track (unidirectional, no permission needed). Friends gain access to exclusive content and real-time presence updates, while followers receive curated notifications about public activities.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Follow a Community Member (Priority: P1)

As a user, I want to follow interesting community members or VIP accounts so that I can stay updated on their public activities without requiring their approval.

**Why this priority**: Following is the lowest-friction entry point to the social system. It delivers immediate value (notifications about interesting content) without requiring any relationship negotiation. This establishes the foundation for community engagement and can function independently of the friend system.

**Independent Test**: Can be fully tested by following a VIP account and receiving a notification when they post new public content. Delivers value of curated content discovery.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing another user's profile, **When** they click "Follow", **Then** the button changes to "Following" and a confirmation toast appears saying "You're now following [username]"
2. **Given** a user following another account, **When** the followed account posts a new public loadout, **Then** the follower receives a notification about the new content
3. **Given** a user viewing their "Following" list, **When** they click "Unfollow" on any account, **Then** the account is removed from their list immediately without confirmation dialog
4. **Given** a user being followed, **When** someone follows them, **Then** they do NOT receive a notification (silent follow)

---

### User Story 2 - Send and Accept Friend Requests (Priority: P1)

As a user who has exchanged messages with another user, I want to send them a friend request so that we can establish a trusted connection with access to each other's friends-only content and online presence.

**Why this priority**: Friend connections are the core trust mechanism for the platform. They enable exclusive content sharing and form the foundation for trusted marketplace transactions. The messaging prerequisite ensures intentional connections.

**Independent Test**: Can be tested by messaging another user, sending a friend request, having it accepted, and verifying mutual "Friends" badge appears on both profiles.

**Acceptance Scenarios**:

1. **Given** a user who has sent at least one message to another user, **When** they view that user's profile, **Then** an "Add Friend" button is visible
2. **Given** a user who has NOT messaged another user, **When** they view that user's profile, **Then** NO "Add Friend" button appears (only "Message" or "Follow" options)
3. **Given** a pending friend request, **When** the recipient accepts, **Then** both users see a "Friends" badge on each other's profiles and the friend count updates for both
4. **Given** a pending friend request, **When** the recipient declines, **Then** the request is removed from their notifications and the sender is NOT notified of the decline
5. **Given** a friend request that has been pending for 30 days, **When** the expiration period passes, **Then** the request is automatically removed

---

### User Story 3 - View Friends List and Activity Feed (Priority: P2)

As a user with friends, I want to see my friends list and their recent activities so that I can stay connected with my outdoor community and engage with their content.

**Why this priority**: Once friend connections exist, this story delivers ongoing value through the activity feed, encouraging daily engagement and return visits.

**Independent Test**: Can be tested by having at least one friend and verifying their activity appears in the feed with correct timestamps and action options.

**Acceptance Scenarios**:

1. **Given** a user with friends, **When** they view their friends list, **Then** they see all friends with options to search, filter, and sort by Recent Activity, Name, or Date Added
2. **Given** a user's friend creates a new public loadout, **When** the user views their activity feed, **Then** they see the activity entry with options to View, Comment, or Message
3. **Given** a user's friend comes online, **When** the user views the activity feed, **Then** they see a real-time online status indicator (green dot) next to that friend's name
4. **Given** an activity feed with multiple entries, **When** the user clicks "Mark all as read", **Then** all activity entries are marked as read

---

### User Story 4 - Manage Online Status and Presence (Priority: P2)

As a user, I want to control my online visibility so that friends can see when I'm available while maintaining my privacy when needed.

**Why this priority**: Presence features add a real-time social layer that makes the platform feel alive and encourages spontaneous interactions between friends.

**Independent Test**: Can be tested by changing status to "Invisible" and verifying that friends no longer see an online indicator.

**Acceptance Scenarios**:

1. **Given** a user with online status enabled for friends, **When** they are active on the platform, **Then** their friends see a green "online" indicator next to their name
2. **Given** a user sets their status to "Away", **When** friends view their profile, **Then** they see an "Away" indicator instead of online/offline
3. **Given** a user sets their status to "Invisible", **When** friends view their profile, **Then** they see no online indicator and only "Last active: [time ago]" if that setting is enabled
4. **Given** a user who has been inactive for a period, **When** friends view the activity feed, **Then** they see "Active 2h ago" (or appropriate time) next to that friend's name

---

### User Story 5 - Configure Privacy Settings (Priority: P2)

As a privacy-conscious user, I want granular control over what I share and with whom so that I can participate in the community while maintaining my comfort level.

**Why this priority**: Privacy controls are essential for user trust. This enables users to engage at their own comfort level and provides the controls needed to protect sensitive information.

**Independent Test**: Can be tested by setting all sharing to "Friends Only" and verifying that non-friend users cannot see friends-only content.

**Acceptance Scenarios**:

1. **Given** a user navigating to Settings > Privacy & Sharing, **When** they view the page, **Then** they see three preset patterns: "Only Me", "Friends Only", and "Everyone" with visual descriptions
2. **Given** a user selects "Friends Only" preset, **When** they view custom settings, **Then** individual toggles reflect the preset but can be customized per content type
3. **Given** a user sets loadouts to "Friends Only", **When** a non-friend views their profile, **Then** the loadouts section shows "This content is private"
4. **Given** a user disables follower notifications for marketplace listings, **When** they list a new item, **Then** followers do NOT receive a notification about the listing
5. **Given** a user changes any privacy setting, **When** the change is made, **Then** it takes effect immediately (no save button needed)

---

### User Story 6 - See Mutual Friends (Priority: P3)

As a user viewing someone's profile, I want to see how many mutual friends we share so that I can gauge our connection to the community and make informed decisions about connecting.

**Why this priority**: Mutual friends add social proof and help users discover connections. This is valuable but not essential for core functionality.

**Independent Test**: Can be tested by viewing a profile where mutual friends exist and verifying the count and list display correctly.

**Acceptance Scenarios**:

1. **Given** a user viewing another user's profile with whom they share mutual friends, **When** the profile loads, **Then** they see "[N] mutual friends" with an expandable list
2. **Given** a user viewing a profile with no mutual friends, **When** the profile loads, **Then** the mutual friends section is not displayed
3. **Given** a user clicks on the mutual friends count, **When** the list expands, **Then** they see names/avatars of up to 10 mutual friends with a "See all" option if more exist

---

### User Story 7 - Unfriend a Connection (Priority: P3)

As a user, I want to remove someone from my friends list so that I can manage my connections and revoke access to friends-only content when relationships change.

**Why this priority**: Essential for user autonomy but less frequent than other interactions. Users need control over their connections.

**Independent Test**: Can be tested by unfriending someone and verifying they no longer appear in the friends list and no longer have access to friends-only content.

**Acceptance Scenarios**:

1. **Given** a user viewing their friends list, **When** they click "Unfriend" on a friend, **Then** a confirmation dialog appears asking "Remove [name] from friends?"
2. **Given** a user confirms unfriending, **When** the action completes, **Then** the friend is removed from their list, the "Friends" badge is removed from both profiles, and both users' friend counts update
3. **Given** a user unfriends someone, **When** the action completes, **Then** the unfriended person is NOT notified (silent removal)
4. **Given** a user was unfriended, **When** they view the former friend's profile, **Then** friends-only content is no longer visible to them

---

### Edge Cases

- What happens when a user tries to send a friend request to someone who already sent them one? → The system should detect the pending incoming request and prompt them to accept or decline it instead.
- What happens when a user blocks someone (future feature)? → Document that blocking will automatically remove any existing friendship and prevent future follows/friend requests.
- How does the system handle when a user reaches 1,000 friends? → Display a clear message that they've reached the friend limit and must remove a friend to add a new one.
- What happens to friend requests when a user deletes their account? → All pending and accepted friend relationships are removed; followers are automatically unfollowed.
- What happens if a user follows someone who later sets their profile to undiscoverable? → Existing follows remain; only new follows are blocked for undiscoverable users.
- How does the activity feed handle friends with high activity? → Limit display to 50 most recent activities across all friends with filters by activity type.
- What if a VIP account is claimed by the real person? → Existing followers automatically transfer to the claimed account.
- What should display when a user has no friends or follows no one? → Show a friendly empty state with illustration and call-to-action (e.g., "Find people to follow" or "Connect with the community") to guide users toward first interactions.

## Requirements *(mandatory)*

### Functional Requirements

#### Friend Management
- **FR-001**: System MUST only display "Add Friend" button to users who have exchanged at least one message with the target user
- **FR-002**: System MUST allow users to accept or decline incoming friend requests via notifications
- **FR-003**: System MUST remove friend requests that have been pending for 30 days without action
- **FR-004**: System MUST allow users to view their friends list with search, filter, and sort capabilities (by Recent Activity, Name, Date Added)
- **FR-005**: System MUST display mutual friend count on user profiles when viewing another user's profile
- **FR-006**: System MUST allow users to remove existing friends with a confirmation dialog
- **FR-007**: System MUST update friend counts immediately when friendships are created or removed
- **FR-008**: System MUST enforce a maximum limit of 1,000 friends per user
- **FR-009**: System MUST limit users to a maximum of 20 friend requests per 24-hour period to prevent spam

#### Following System
- **FR-010**: System MUST allow users to follow any public account with a single click, no prior interaction required
- **FR-011**: System MUST NOT notify users when someone follows them (silent follow)
- **FR-012**: System MUST allow users to view a list of accounts they follow
- **FR-013**: System MUST allow users to unfollow any account instantly without confirmation
- **FR-014**: System MUST display follower count only for VIP accounts (not regular users, for privacy)
- **FR-015**: System MUST NOT expose follower lists (only counts for VIPs)

#### Privacy & Discoverability
- **FR-016**: System MUST make users discoverable by default for messaging purposes
- **FR-017**: System MUST allow users to disable discoverability completely
- **FR-018**: System MUST provide three preset privacy patterns: "Only Me", "Friends Only", "Everyone"
- **FR-019**: System MUST allow granular per-category visibility settings that override presets (loadouts, marketplace, shakedowns, trip plans)
- **FR-020**: System MUST apply privacy setting changes immediately without requiring explicit save action
- **FR-021**: System MUST allow users to control which activities trigger follower notifications (loadouts, marketplace, bulletin posts)

#### Notifications & Activity
- **FR-022**: System MUST notify users of incoming friend requests
- **FR-023**: System MUST show activity updates from friends (if user has enabled this)
- **FR-024**: System MUST deliver public activity notifications to followers (if the content creator allows)
- **FR-025**: System MUST allow users to configure notification frequency per activity type (real-time, daily digest, off)
- **FR-026**: System MUST display the 50 most recent friend activities in the activity feed
- **FR-027**: System MUST allow filtering the activity feed by activity type (Shakedowns, Trips, Marketplace, Loadouts)
- **FR-028**: System MUST provide "Mark all as read" functionality for the activity feed

#### Presence & Status
- **FR-029**: System MUST display online status (green dot) for friends when the user allows this in their privacy settings
- **FR-030**: System MUST allow users to set their status to "Away" or "Invisible"
- **FR-031**: System MUST update online status in real-time for friends viewing the activity feed
- **FR-032**: System MUST display "Last active: [time ago]" for friends who are not currently online (when the user allows this)
- **FR-033**: System MUST transition a user's status from "online" to "Last active" after 5 minutes of inactivity
- **FR-034**: System MUST gracefully degrade when real-time presence is unavailable by showing cached "Last active" times with a subtle "updating..." indicator until service recovers

### Key Entities

- **Friendship**: Represents a mutual, bidirectional connection between two users. Contains both user references, creation timestamp, and status (pending/accepted). Requires prior messaging interaction.
- **Follow**: Represents a unidirectional connection from one user to another. Contains follower reference, followed user reference, and creation timestamp. No approval required.
- **Friend Request**: Represents a pending friendship invitation. Contains sender, recipient, creation timestamp, and expiration date (30 days from creation).
- **Privacy Settings**: User-controlled visibility preferences. Contains preset selection and per-category overrides (online status, loadouts, marketplace, shakedowns, trips) with values of "Only Me", "Friends Only", or "Everyone".
- **Notification Preferences**: User-controlled notification delivery settings. Contains per-activity-type settings (friend requests, friend activity, followed account activity) and frequency (real-time, daily digest, off).
- **Presence Status**: User's current availability state. Contains status type (online, away, invisible), last activity timestamp, and visibility settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### Adoption
- **SC-001**: Active users achieve an average of 8 friends within 30 days of first use
- **SC-002**: 40% of active users follow at least 1 account within 60 days
- **SC-003**: Friend request acceptance rate exceeds 70%

#### Engagement
- **SC-004**: 25% of daily active users check the friend activity feed at least once per day
- **SC-005**: Users send 3x more messages to friends than to non-friends
- **SC-006**: VIP accounts achieve an average of 100+ followers within 90 days of creation

#### Network Effects
- **SC-007**: 15% of a user's friends are also friends with each other (network density)
- **SC-008**: 30% of marketplace and shakedown engagement originates from friend activity feed
- **SC-009**: 50% of VIP loadout views come from follower notification clicks

#### Retention
- **SC-010**: 65% of users who add at least 1 friend return within 7 days
- **SC-011**: 75% of users with 3+ friends return within 30 days

#### Trust & Safety
- **SC-012**: 30% of users customize their privacy settings beyond the defaults
- **SC-013**: Less than 5% of friend connections are removed within 90 days

#### Performance
- **SC-014**: Friends list loads in under 500ms for users with up to 500 friends
- **SC-015**: Follow/unfollow actions complete in under 200ms
- **SC-016**: Activity feed updates appear within 1 second of the triggering action
- **SC-017**: Online status changes propagate to friends within 5 seconds

## Assumptions

1. **Messaging system exists** and can be queried to verify prior message exchange between users
2. **User profiles** already support basic metadata (name, avatar, bio) and can be extended with friend/follower counts
3. **Notification infrastructure** exists for both push and email delivery
4. **Real-time infrastructure** (websockets or similar) exists for presence updates and activity feed
5. **VIP account type** is already defined in the user model
6. Users intuitively understand the difference between friends (mutual consent) and following (one-way)
7. The platform has sufficient active users to make social features valuable

## Scope Boundaries

### In Scope
- Friend request sending, accepting, declining
- Follow/unfollow functionality
- Friends list with search, filter, sort
- Following list
- Mutual friends display
- Friend activity feed
- Online presence indicators
- Privacy settings (presets and custom)
- Notification preferences per activity type
- Friend request expiration (30 days)
- VIP follower counts

### Out of Scope
- **Loadout system**: Separate development track (referenced for visibility settings only)
- **Trip planning**: Future feature (mentioned in activity types placeholder)
- **Community shakedowns**: Separate spec (activity type placeholder)
- **Merchant accounts**: Future integration
- **Group chats**: Not in MVP
- **Friend recommendations/suggestions**: Future ML feature
- **Follower lists exposure**: Privacy restriction
- **Blocking users**: Future safety feature
- **Friend-of-friend discovery**: Future feature

## Dependencies

### Required (Must Exist)
- **Messaging System**: For friend request prerequisite validation (must query message history)
- **User Profiles**: For displaying friend/follower information and counts
- **Notification System**: For friend requests and activity updates delivery
- **Real-time Infrastructure**: For online presence updates and activity feed

### Optional (Enhances Feature)
- **Loadout System**: Enables "new loadout" activity type in friend feed
- **Marketplace System**: Enables "new listing" activity type in friend feed
- **Bulletin Board**: Enables "new post" activity type in friend feed

## Future Integration Points

This feature enables future capabilities:
- **Community Shakedowns**: Friend-based feedback prioritization
- **User Marketplace**: Trust signals via friend networks and connection counts
- **Trip Planning**: Friend collaboration and trip sharing
- **Merchant Integration**: Friend referrals for deals

Potential future enhancements:
- Friend-of-friend discovery ("You and Tom both know Sarah")
- Activity-based friend suggestions ("Users with similar loadouts")
- Friend circles/groups (organize friends into categories)
- Collaborative wishlists with friends
