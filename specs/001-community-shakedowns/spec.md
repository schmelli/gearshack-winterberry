# Feature Specification: Community Shakedowns

**Feature Branch**: `001-community-shakedowns`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "A collaborative gear review system where users share their trip loadouts with the community to receive expert feedback and optimization suggestions—the human-powered complement to AI-driven shakedowns."

---

## Clarifications

### Session 2025-12-29

- Q: What happens after feedback is reported for spam? → A: Immediate soft-hide (visible to author only); admin reviews within 24h
- Q: How should the shakedowns feed handle pagination? → A: Infinite scroll with 20-item batches
- Q: How should the system handle loadout changes during active feedback sessions? → A: Show notification to active reviewers when loadout changes; allow refresh or continue

---

## Overview

Community Shakedowns enables GearShack users to share their trip-specific loadouts with the community for expert feedback and optimization suggestions. This human-powered review system complements the AI shakedown feature (Trailblazer tier), providing nuanced, experience-based advice that AI cannot match.

### Core Value Proposition

- **For New Users**: Get actionable gear advice from experienced hikers before investing in expensive equipment
- **For Experts**: Build reputation by sharing knowledge and helping the community
- **For Community**: Create a searchable knowledge base of real-world gear decisions and optimizations

---

## User Scenarios & Testing

### User Story 1 - Request a Community Shakedown (Priority: P1)

A user with an existing loadout wants to get community feedback before their trip. They create a shakedown request by selecting their loadout, adding trip context (dates, experience level, concerns), and choosing a privacy setting.

**Why this priority**: This is the foundational feature. Without the ability to request shakedowns, no other functionality can work. Creates the core content for the platform.

**Independent Test**: Can be fully tested by creating a shakedown from a mock loadout and verifying it appears in the feed, the user's profile, and is accessible via shareable URL.

**Acceptance Scenarios**:

1. **Given** a user has an existing loadout, **When** they click "Request Community Shakedown", **Then** a creation form appears with trip name pre-filled from loadout
2. **Given** the creation form is displayed, **When** user fills required fields (trip name, dates, experience level) and clicks submit, **Then** the shakedown is created and appears in the feed
3. **Given** a shakedown is created with "Public" privacy, **When** any user accesses the shakedown URL, **Then** they can view the full shakedown details
4. **Given** a shakedown is created with "Friends Only" privacy, **When** a non-friend user attempts to view, **Then** they see an access-restricted message
5. **Given** the user submits the shakedown, **When** they are shown the confirmation, **Then** they have an option to share to Bulletin Board with pre-filled post content

---

### User Story 2 - Browse and Provide General Feedback (Priority: P1)

An experienced user browses the shakedowns feed, finds one matching their expertise, and provides detailed feedback on the entire loadout.

**Why this priority**: Feedback is the core interaction that provides value to requesters. Without reviewers, shakedowns would be useless.

**Independent Test**: Can be tested by browsing the feed, opening a shakedown, and submitting general feedback that appears in the feedback section.

**Acceptance Scenarios**:

1. **Given** a user navigates to Community → Shakedowns, **When** the page loads, **Then** they see a feed of shakedowns sorted by "Recent" by default
2. **Given** the user is viewing the feed, **When** they click a shakedown card, **Then** they see the full shakedown detail including loadout breakdown and requester notes
3. **Given** the user is viewing a shakedown detail, **When** they click "Add General Feedback", **Then** a markdown-enabled text editor appears
4. **Given** the user has written feedback, **When** they click "Post Feedback", **Then** the feedback appears in the feedback section with timestamp and author link
5. **Given** feedback is posted, **When** the requester checks notifications, **Then** they see a notification about new feedback

---

### User Story 3 - Provide Item-Specific Feedback (Priority: P2)

A reviewer wants to comment on a specific gear item in the loadout, starting a focused discussion about that piece of equipment.

**Why this priority**: Item-specific feedback adds granularity and enables threaded discussions. Builds on general feedback capability.

**Independent Test**: Can be tested by clicking on a loadout item and posting a comment that appears attached to that item.

**Acceptance Scenarios**:

1. **Given** a user is viewing a shakedown loadout, **When** they click on a specific gear item, **Then** a mini-modal appears with "Comment on this item"
2. **Given** the comment modal is open, **When** the user writes a comment and submits, **Then** the comment appears under that specific item in the loadout
3. **Given** an item has existing comments, **When** a user clicks "Reply" on a comment, **Then** they can add a nested reply (max 3 levels)
4. **Given** multiple comments exist on an item, **When** viewing the item, **Then** reply threads are collapsible for readability

---

### User Story 4 - Iterate Based on Feedback (Priority: P2)

A requester reads feedback, updates their loadout accordingly, and thanks helpful reviewers.

**Why this priority**: The iteration loop is what makes shakedowns actionable. Shows the value of community feedback.

**Independent Test**: Can be tested by updating a loadout linked to a shakedown and verifying changes reflect in the shakedown view.

**Acceptance Scenarios**:

1. **Given** a user is viewing their own shakedown, **When** they click "Update Loadout", **Then** they are taken to the loadout editor
2. **Given** the user updates their loadout, **When** they return to the shakedown, **Then** the shakedown shows the updated loadout data
3. **Given** feedback exists on a shakedown, **When** the requester clicks "Reply" under feedback, **Then** they can post a reply that notifies the original commenter
4. **Given** a user has received helpful feedback, **When** they click "Mark as Helpful" on that feedback, **Then** the reviewer earns reputation credit

---

### User Story 5 - Complete a Shakedown (Priority: P2)

A requester has received sufficient feedback and marks their shakedown as complete, thanking contributors.

**Why this priority**: Completion signals the lifecycle end and enables archiving. Also triggers reputation rewards.

**Independent Test**: Can be tested by marking a shakedown complete and verifying no new feedback can be added.

**Acceptance Scenarios**:

1. **Given** a requester views their open shakedown, **When** they click "Mark as Complete", **Then** a modal appears asking to thank specific helpers
2. **Given** the completion modal is shown, **When** the requester selects feedback as "Helpful" and confirms, **Then** the shakedown status changes to "Completed"
3. **Given** a shakedown is marked complete, **When** another user tries to add feedback, **Then** the feedback option is disabled with message "This shakedown is complete"
4. **Given** a shakedown has been completed for 90 days, **When** the system runs archival, **Then** the shakedown is archived (still viewable, read-only)

---

### User Story 6 - Discover Shakedowns for Learning (Priority: P3)

A user planning a trip discovers completed shakedowns similar to theirs, learning from others' gear decisions and community feedback.

**Why this priority**: Discovery turns shakedowns into a knowledge base. Enhances platform value but not core to MVP.

**Independent Test**: Can be tested by filtering completed shakedowns by trip type and bookmarking one for reference.

**Acceptance Scenarios**:

1. **Given** a user is on the shakedowns feed, **When** they apply filters (Location, Season, Status: Completed), **Then** only matching shakedowns are shown
2. **Given** search results are displayed, **When** user enters a keyword in search, **Then** results filter by trip name or gear item names
3. **Given** a user is viewing a completed shakedown, **When** they click "Bookmark", **Then** the shakedown is saved to their bookmarks
4. **Given** a user is viewing a completed shakedown, **When** they click "Start Similar Shakedown", **Then** a new shakedown form opens pre-filled with the trip type context (not the gear)

---

### User Story 7 - Build Expert Reputation (Priority: P3)

An active reviewer accumulates "Helpful" votes and earns badges, becoming recognized as a community expert.

**Why this priority**: Gamification encourages participation but is not essential for basic functionality.

**Independent Test**: Can be tested by accumulating helpful votes and verifying badge awards and profile updates.

**Acceptance Scenarios**:

1. **Given** a user has received 10 "Helpful" marks on their feedback, **When** they check their profile, **Then** they see the "Shakedown Helper" badge
2. **Given** a user has reviewed shakedowns, **When** they view their profile, **Then** they see "Shakedowns Reviewed" count
3. **Given** a user has 50+ helpful votes, **When** browsing Community Experts section, **Then** they appear in the featured list

---

### Edge Cases

- What happens when a loadout is deleted while a shakedown is open? → Shakedown becomes read-only with message "Linked loadout no longer exists"
- How does the system handle spam feedback? → Report button on each feedback; reported content immediately soft-hidden (visible to author only); admin reviews within 24 hours and either restores or permanently removes
- What if a user tries to reopen a shakedown after 90-day archive? → Archived shakedowns cannot be reopened; user can "Start Similar" instead
- What happens when a shakedown has no feedback after 30 days? → Auto-notify requester with suggestion to share to Bulletin Board
- How are notifications handled for deep reply threads? → All thread participants notified of new replies
- What if a reviewer edits feedback after 30 minutes? → Edit disabled; user can add a new reply/comment instead
- What if the loadout changes while a reviewer is writing feedback? → Show non-blocking notification to active reviewers; they can refresh to see changes or continue writing their current feedback

---

## Requirements

### Functional Requirements

#### Shakedown Creation
- **FR-001**: System MUST allow users to create shakedowns from existing loadouts
- **FR-002**: System MUST require trip context (name, dates, experience level) for shakedown creation
- **FR-003**: System MUST support three privacy levels: Public, Friends Only, Private
- **FR-004**: System MUST default privacy to "Friends Only"
- **FR-005**: System MUST generate shareable URLs for public shakedowns
- **FR-006**: System MUST offer one-click sharing to Bulletin Board with pre-filled content

#### Feedback System
- **FR-007**: System MUST support general (whole-loadout) feedback
- **FR-008**: System MUST support item-specific feedback attached to individual gear items
- **FR-009**: System MUST render feedback content with markdown formatting
- **FR-010**: System MUST support nested replies up to 3 levels deep
- **FR-011**: System MUST allow feedback edit/delete within 30 minutes of posting
- **FR-012**: System MUST display feedback with timestamps and author profile links

#### Discovery & Browsing
- **FR-013**: System MUST display shakedowns feed with sort options: Recent, Popular, Unanswered; feed uses infinite scroll loading 20 items per batch
- **FR-014**: System MUST support filtering by: Trip Type, Location, Season, Experience Level, Status
- **FR-015**: System MUST support keyword search across trip names and gear items
- **FR-016**: System MUST prioritize friends' shakedowns in feed when Social Graph is available
- **FR-017**: System MUST notify users when friends post shakedowns

#### Iteration & Completion
- **FR-018**: System MUST reflect loadout updates in linked shakedowns automatically
- **FR-019**: System MUST allow requesters to mark shakedowns as "Complete"
- **FR-020**: System MUST prevent new feedback on completed shakedowns
- **FR-021**: System MUST allow requesters to reopen completed shakedowns (before archive)
- **FR-022**: System MUST support "Mark as Helpful" on feedback for reputation tracking
- **FR-023**: System MUST archive completed shakedowns after 90 days (read-only, still viewable)

#### Reputation & Gamification
- **FR-024**: System MUST track "Helpful" vote count per user
- **FR-025**: System MUST award badges at thresholds: 10, 50, 100 helpful votes
- **FR-026**: System MUST display "Shakedowns Reviewed" count on user profiles
- **FR-027**: System MUST feature top contributors in Community Experts section

#### Notifications
- **FR-028**: System MUST notify requesters of new feedback on their shakedowns
- **FR-029**: System MUST notify thread participants of new replies
- **FR-030**: System MUST notify users when their feedback is marked "Helpful"
- **FR-031**: System MUST notify users when they earn badges

### Key Entities

- **Shakedown**: A community review request linked to a loadout; contains trip context, privacy setting, status (Open/Complete/Archived), feedback collection, and timestamps
- **Feedback**: User-submitted review content; can be general (loadout-level) or item-specific; supports markdown; tracks author, timestamp, helpful votes, and replies
- **Reply**: Nested response to feedback; limited to 3 levels deep; tracks parent feedback/reply reference
- **Bookmark**: User save of a shakedown for future reference
- **HelpfulVote**: Record of a requester marking feedback as helpful; triggers reputation updates
- **Badge**: Achievement earned by reviewers at reputation thresholds

---

## Success Criteria

### Measurable Outcomes

#### Adoption
- **SC-001**: 20% of users with trip loadouts request a community shakedown within 60 days of loadout creation
- **SC-002**: 70% of shakedowns are created with "Public" visibility (indicates community trust)

#### Engagement
- **SC-003**: 80% of public shakedowns receive at least 1 feedback comment within 48 hours
- **SC-004**: Average of 6 comments per public shakedown
- **SC-005**: 40% of feedback is item-specific (remaining 60% general)
- **SC-006**: 15% of users leave at least 1 shakedown comment per month

#### Quality & Helpfulness
- **SC-007**: 50% of feedback comments are marked "Helpful" by requesters
- **SC-008**: 70% of shakedowns result in loadout changes (gear swaps/additions)
- **SC-009**: 60% of shakedowns are marked "Complete" within 30 days

#### Community Building
- **SC-010**: 25% of shakedown users participate both as requesters AND reviewers
- **SC-011**: 100 users achieve "Community Expert" status (50+ helpful votes) within 6 months
- **SC-012**: 10% of helpful feedback interactions lead to friend connections

#### Learning & Discovery
- **SC-013**: 50% of shakedown views are on completed (archived) shakedowns
- **SC-014**: 30% of users bookmark at least 1 shakedown for reference

---

## Dependencies

### Required (Must exist before implementation)
- **Loadout System**: For linking shakedowns to trip-specific gear lists
- **Inventory System**: For displaying item specs (weight, brand, model) in shakedown loadouts
- **Notification System**: For feedback alerts and badge notifications
- **User Profiles**: For displaying reviewer expertise and reputation

### Optional (Enhances but not required)
- **Social Graph** (Feature 001): Enables friend prioritization in feed and "Friends Only" privacy
- **Bulletin Board** (Feature 002): Enables one-click cross-posting for visibility
- **Marketplace**: Could enable "Buy recommended gear" links in future

---

## Assumptions

1. Users have already created loadouts before requesting shakedowns (loadout system exists)
2. The notification system can handle new notification types for shakedown activity
3. Users understand the difference between AI shakedowns (instant, automated) and Community shakedowns (human, slower, more nuanced)
4. Markdown rendering will use the same component/approach as existing platform features
5. Privacy settings framework can be extended to support shakedown-specific settings
6. Archival after 90 days is acceptable for data retention (archived content remains searchable but read-only)
7. Badge thresholds (10, 50, 100) provide appropriate progression without being too easy or too hard
8. 30-minute edit window balances correction ability with preventing abuse

---

## Out of Scope

### Explicitly Not Included
- **AI shakedown integration**: Separate Trailblazer feature (not merged with community)
- **Video feedback**: Text/markdown only (no video responses)
- **Paid expert reviews**: All feedback is community-driven, unpaid
- **Private DM feedback**: All feedback public on shakedown page
- **Trip reports**: Shakedowns are pre-trip only (post-trip reviews separate feature)
- **Gear affiliate links**: No monetization of recommended gear
- **Downvoting feedback**: Only "Helpful" marks, no negative voting

### Constraints
- Cannot create shakedown without existing loadout
- Trip context (dates, location, experience level) is required
- All feedback tied to authenticated user accounts (no anonymous feedback)
- Public shakedowns become read-only after 90-day archive period
